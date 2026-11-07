import { sql } from 'kysely';
import { beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';

import { canonicalBrandsSql } from '../../../migrations/1793300000000_canonical-listing-brands.ts';
import { Listing } from '../../../src/modules/listings/domain/listing.ts';
import { PgListingRepository } from '../../../src/modules/listings/infrastructure/persistence/pg-listing-repository.ts';
import { type TestDatabase, getTestDatabase } from '../../helpers/test-database.ts';

/**
 * Incomplete drafts make the listing disclosure columns nullable (P1-012). Buyers stay protected
 * by the database itself: a published row must be complete, and a draft can never hold stock,
 * which keeps the no-oversell check meaningful. Postgres only.
 */
const NOW = new Date('2026-11-07T09:00:00.000Z');
const ORG = 'org_persistence';

describe.skipIf(inject('persistence') === 'memory')('Listing persistence', () => {
  let database: TestDatabase;
  let repository: PgListingRepository;

  beforeAll(async () => {
    database = await getTestDatabase();
    repository = new PgListingRepository(database.handle.db);
  });

  beforeEach(async () => {
    await database.reset();
    await database.handle.db
      .insertInto('organizations')
      .values({
        id: ORG,
        name: 'Persistence AB',
        description: null,
        status: 'active',
        version: 1,
        created_at: NOW,
        updated_at: NOW,
        deactivated_at: null,
      })
      .execute();
  });

  const insertEmptyDraft = async (id: string): Promise<void> => {
    await repository.insert(
      Listing.createDraft({
        id,
        organizationId: ORG,
        specifications: {},
        condition: { guarantees: {} },
        now: NOW,
      })
    );
  };

  it('stores and restores a draft with nothing entered', async () => {
    await insertEmptyDraft('lst_empty');

    const restored = await repository.findById('lst_empty');

    expect(restored?.status).toBe('draft');
    expect(restored?.state.title).toBeUndefined();
    expect(restored?.state.price).toBeUndefined();
    expect(restored?.readiness().issues).toHaveLength(15);
  });

  it('refuses a published row with a missing disclosure', async () => {
    await insertEmptyDraft('lst_incomplete');

    await expect(
      database.handle.db
        .updateTable('listings')
        .set({ status: 'active', published_at: NOW })
        .where('id', '=', 'lst_incomplete')
        .execute()
    ).rejects.toThrow(/listings_published_complete/);
  });

  it('refuses a draft that holds stock', async () => {
    await insertEmptyDraft('lst_stock');

    await expect(
      database.handle.db
        .updateTable('listings')
        .set({ quantity_reserved: 1 })
        .where('id', '=', 'lst_stock')
        .execute()
    ).rejects.toThrow(/listings_draft_holds_no_stock/);
  });

  it('maps brands that differ only in capitalization to the curated value', async () => {
    await repository.insert(
      Listing.createDraft({
        id: 'lst_lower',
        organizationId: ORG,
        specifications: {},
        condition: { guarantees: {} },
        now: NOW,
      })
    );
    await database.handle.db
      .updateTable('listings')
      .set({ brand: ' lenovo ' })
      .where('id', '=', 'lst_lower')
      .execute();
    await insertEmptyDraft('lst_unknown');
    await database.handle.db
      .updateTable('listings')
      .set({ brand: 'Commodore' })
      .where('id', '=', 'lst_unknown')
      .execute();

    await sql.raw(canonicalBrandsSql()).execute(database.handle.db);

    const rows = await database.handle.db
      .selectFrom('listings')
      .select(['id', 'brand'])
      .orderBy('id')
      .execute();
    expect(rows).toEqual([
      { id: 'lst_lower', brand: 'Lenovo' },
      { id: 'lst_unknown', brand: 'Commodore' },
    ]);
  });
});
