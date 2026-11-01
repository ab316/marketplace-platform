import { sql, type Kysely } from 'kysely';

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
    let filtered = this.#db
      .selectFrom('listings')
      .where('status', '=', 'active')
      // Only orderable listings appear in the catalogue (UC-006 Q1): a fully reserved or
      // sold-out listing is excluded by the query itself, not filtered afterwards.
      .where((eb) => eb('quantity_total', '>', sql<number>`quantity_reserved + quantity_sold`));
    // Deactivated sellers disappear from the catalogue without their listings being touched
    // (UC-003 E6).
    if (excluded.length > 0) {
      filtered = filtered.where('organization_id', 'not in', [...excluded]);
    }

    const keyword = criteria.keyword;
    if (keyword !== undefined) {
      const pattern = `%${escapeLikePattern(keyword)}%`;
      filtered = filtered.where((eb) =>
        eb.or([
          eb('title', 'ilike', pattern),
          eb('description', 'ilike', pattern),
          eb('brand', 'ilike', pattern),
          eb('model', 'ilike', pattern),
        ])
      );
    }

    const brands = criteria.brands ?? [];
    if (brands.length > 0) {
      // The curated list is matched case-insensitively against the free-text brand (UC-006 Q2).
      filtered = filtered.where(
        sql<string>`lower(brand)`,
        'in',
        brands.map((brand) => brand.toLowerCase())
      );
    }

    if (criteria.priceMinMinor !== undefined) {
      filtered = filtered.where('price_minor', '>=', criteria.priceMinMinor);
    }
    if (criteria.priceMaxMinor !== undefined) {
      filtered = filtered.where('price_minor', '<=', criteria.priceMaxMinor);
    }

    // A minimum grade includes better grades (UC-006): B means A or B. Grades order
    // alphabetically best-first, so the allowed set is every letter up to the minimum.
    if (criteria.minimumGrade !== undefined) {
      filtered = filtered.where('condition_grade', '<=', criteria.minimumGrade);
    }

    if (criteria.minimumRamGb !== undefined) {
      filtered = filtered.where('ram_gb', '>=', criteria.minimumRamGb);
    }

    // Every sort breaks ties on id so pagination is repeatable (UC-006 B7).
    const sort = criteria.sort ?? 'newest';
    const ordered =
      sort === 'price_asc'
        ? filtered.orderBy('price_minor', 'asc').orderBy('id', 'desc')
        : sort === 'price_desc'
          ? filtered.orderBy('price_minor', 'desc').orderBy('id', 'desc')
          : filtered.orderBy('published_at', 'desc').orderBy('id', 'desc');

    const rows = await ordered.selectAll().limit(criteria.limit).offset(criteria.offset).execute();

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
