import type { Insertable, Kysely, Selectable } from 'kysely';

import type { Database } from '../../../shared/infrastructure/database.ts';
import { ListingVersionConflictError, type ListingRepository } from '../application/ports.ts';
import { Listing, type ListingFields } from '../domain/listing.ts';
import type { ListingsTable } from './listings-table.ts';

type ListingRow = Selectable<ListingsTable>;

function toDomain(row: ListingRow): Listing {
  const fields: ListingFields = {};
  if (row.title !== null) fields.title = row.title;
  if (row.description !== null) fields.description = row.description;
  if (row.brand !== null) fields.brand = row.brand;
  if (row.model !== null) fields.model = row.model;
  if (row.cpu !== null) fields.cpu = row.cpu;
  if (row.ram !== null) fields.ram = row.ram;
  if (row.storage !== null) fields.storage = row.storage;
  if (row.screen_size !== null) fields.screenSize = row.screen_size;
  if (row.condition_grade !== null) fields.conditionGrade = row.condition_grade;
  if (row.condition_guarantees !== null) fields.conditionGuarantees = row.condition_guarantees;
  if (row.known_defects !== null) fields.knownDefects = row.known_defects;
  if (row.price_ore !== null) fields.priceOre = row.price_ore;
  if (row.quantity !== null) fields.quantity = row.quantity;
  if (row.fulfillment_expectations !== null) {
    fields.fulfillmentExpectations = row.fulfillment_expectations;
  }

  return Listing.fromProps({
    ...fields,
    id: row.id,
    organizationId: row.organization_id,
    status: row.status,
    currency: row.currency,
    quantityAvailable: row.quantity_available,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function toRow(listing: Listing): Insertable<ListingsTable> {
  const p = listing.props;
  return {
    id: p.id,
    organization_id: p.organizationId,
    status: p.status,
    title: p.title ?? null,
    description: p.description ?? null,
    brand: p.brand ?? null,
    model: p.model ?? null,
    cpu: p.cpu ?? null,
    ram: p.ram ?? null,
    storage: p.storage ?? null,
    screen_size: p.screenSize ?? null,
    condition_grade: p.conditionGrade ?? null,
    condition_guarantees: p.conditionGuarantees ? JSON.stringify(p.conditionGuarantees) : null,
    known_defects: p.knownDefects ?? null,
    price_ore: p.priceOre ?? null,
    currency: p.currency,
    quantity: p.quantity ?? null,
    quantity_available: p.quantityAvailable,
    fulfillment_expectations: p.fulfillmentExpectations ?? null,
    version: p.version,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

export function createKyselyListingRepository(db: Kysely<Database>): ListingRepository {
  return {
    async insert(listing) {
      await db.insertInto('listings').values(toRow(listing)).execute();
    },

    async update(listing) {
      const currentVersion = listing.props.version;
      const row = toRow(listing);
      const result = await db
        .updateTable('listings')
        .set({ ...row, version: currentVersion + 1 })
        .where('id', '=', listing.props.id)
        .where('version', '=', currentVersion)
        .executeTakeFirst();

      if (result.numUpdatedRows === 0n) {
        throw new ListingVersionConflictError(listing.props.id);
      }
      listing.props.version = currentVersion + 1;
    },

    async findById(id) {
      const row = await db
        .selectFrom('listings')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();
      return row ? toDomain(row) : undefined;
    },

    async searchActive(search) {
      let query = db
        .selectFrom('listings')
        .selectAll()
        .where('status', '=', 'active')
        .orderBy('created_at', 'desc');

      if (search !== undefined && search.trim().length > 0) {
        const pattern = `%${search.trim().replaceAll(/[%_\\]/g, (c) => `\\${c}`)}%`;
        query = query.where((eb) =>
          eb.or([
            eb('title', 'ilike', pattern),
            eb('description', 'ilike', pattern),
            eb('brand', 'ilike', pattern),
            eb('model', 'ilike', pattern),
          ])
        );
      }

      const rows = await query.execute();
      return rows.map(toDomain);
    },
  };
}
