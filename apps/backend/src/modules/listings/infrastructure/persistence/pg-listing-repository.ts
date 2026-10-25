import type { Kysely } from 'kysely';

import type { Database } from '../../../../shared/infrastructure/database/schema.ts';
import type {
  ListingPage,
  ListingRepository,
  ListingSearchCriteria,
  OrganizationListingCriteria,
} from '../../application/ports.ts';
import { ListingConcurrencyError } from '../../domain/errors.ts';
import type { Listing } from '../../domain/listing.ts';
import { toListing, toListingRow } from './listing-mapper.ts';

/** Escapes the wildcards a keyword could otherwise smuggle into `ILIKE`. */
const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export class PgListingRepository implements ListingRepository {
  readonly #db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.#db = db;
  }

  async findById(listingId: string): Promise<Listing | null> {
    const row = await this.#db
      .selectFrom('listings')
      .selectAll()
      .where('id', '=', listingId)
      .executeTakeFirst();

    return row === undefined ? null : toListing(row);
  }

  async insert(listing: Listing): Promise<void> {
    await this.#db.insertInto('listings').values(toListingRow(listing)).execute();
  }

  async save(listing: Listing): Promise<void> {
    const { id, version, ...columns } = toListingRow(listing);

    const result = await this.#db
      .updateTable('listings')
      .set({ ...columns, version: version + 1 })
      .where('id', '=', id)
      .where('version', '=', version)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      throw new ListingConcurrencyError(id);
    }
  }

  async searchActive(criteria: ListingSearchCriteria): Promise<ListingPage> {
    const excluded = criteria.excludedOrganizationIds ?? [];
    let base = this.#db.selectFrom('listings').where('status', '=', 'active');
    // Deactivated sellers disappear from the catalogue without their listings being touched
    // (UC-003 E6).
    if (excluded.length > 0) {
      base = base.where('organization_id', 'not in', [...excluded]);
    }
    const keyword = criteria.keyword;

    const filtered =
      keyword === undefined
        ? base
        : base.where((eb) => {
            const pattern = `%${escapeLikePattern(keyword)}%`;
            return eb.or([
              eb('title', 'ilike', pattern),
              eb('description', 'ilike', pattern),
              eb('brand', 'ilike', pattern),
              eb('model', 'ilike', pattern),
            ]);
          });

    const rows = await filtered
      .selectAll()
      .orderBy('published_at', 'desc')
      .orderBy('id', 'desc')
      .limit(criteria.limit)
      .offset(criteria.offset)
      .execute();

    const counted = await filtered
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow();

    return { items: rows.map(toListing), total: Number(counted.count) };
  }

  async findByOrganization(criteria: OrganizationListingCriteria): Promise<ListingPage> {
    const base = this.#db
      .selectFrom('listings')
      .where('organization_id', '=', criteria.organizationId);

    const rows = await base
      .selectAll()
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(criteria.limit)
      .offset(criteria.offset)
      .execute();

    const counted = await base
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow();

    return { items: rows.map(toListing), total: Number(counted.count) };
  }
}
