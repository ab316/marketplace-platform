import { Money } from '@acme/core-domain';
import type { Insertable, Selectable } from 'kysely';

import { readEnum } from '../../../../shared/infrastructure/database/row-values.ts';
import type { ListingsTable } from '../../../../shared/infrastructure/database/schema.ts';
import {
  type ConditionGrade,
  Listing,
  type ListingDraftDetails,
  type ListingStatus,
  type StorageType,
} from '../../domain/listing.ts';

const LISTING_STATUSES: readonly ListingStatus[] = ['draft', 'active', 'archived'];
const STORAGE_TYPES: readonly StorageType[] = ['ssd', 'nvme', 'hdd'];
const CONDITION_GRADES: readonly ConditionGrade[] = ['A', 'B', 'C'];

/** SQL `NULL` is "not entered yet" in a draft; the domain models that as an absent value. */
const absent = <T>(value: T | null): T | undefined => value ?? undefined;

const readDraftDetails = (row: Selectable<ListingsTable>): ListingDraftDetails => ({
  title: absent(row.title),
  description: absent(row.description),
  specifications: {
    brand: absent(row.brand),
    model: absent(row.model),
    cpu: absent(row.cpu),
    ramGb: absent(row.ram_gb),
    storageType:
      row.storage_type === null
        ? undefined
        : readEnum(STORAGE_TYPES, row.storage_type, 'listings.storage_type'),
    storageGb: absent(row.storage_gb),
    screenSizeInches: absent(row.screen_size_inches),
  },
  condition: {
    grade:
      row.condition_grade === null
        ? undefined
        : readEnum(CONDITION_GRADES, row.condition_grade, 'listings.condition_grade'),
    guarantees: {
      batteryHealthMinPercent: absent(row.battery_health_min_percent),
      batteryCycleMin: absent(row.battery_cycle_min),
      batteryCycleMax: absent(row.battery_cycle_max),
    },
    knownDefects: absent(row.known_defects),
  },
  price: row.price_minor === null ? undefined : Money.fromMinor(row.price_minor, 'SEK'),
  totalQuantity: absent(row.quantity_total),
  fulfillmentExpectations: absent(row.fulfillment_expectations),
});

/** A published row missing a disclosure is corrupt data; the database forbids it (see migration). */
const required = <T>(value: T | undefined, column: string, id: string): T => {
  if (value === undefined) {
    throw new Error(`Published listing ${id} has no ${column}.`);
  }
  return value;
};

export const toListing = (row: Selectable<ListingsTable>): Listing => {
  const status = readEnum(LISTING_STATUSES, row.status, 'listings.status');
  const details = readDraftDetails(row);
  const base = {
    id: row.id,
    organizationId: row.organization_id,
    reservedQuantity: row.quantity_reserved,
    soldQuantity: row.quantity_sold,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (status === 'draft') {
    return Listing.restore({
      ...base,
      ...details,
      status,
      publishedAt: null,
      archivedAt: null,
    });
  }

  const { specifications: spec, condition } = details;
  return Listing.restore({
    ...base,
    status,
    title: required(details.title, 'title', row.id),
    description: required(details.description, 'description', row.id),
    specifications: {
      brand: required(spec.brand, 'brand', row.id),
      model: required(spec.model, 'model', row.id),
      cpu: required(spec.cpu, 'cpu', row.id),
      ramGb: required(spec.ramGb, 'ram_gb', row.id),
      storageType: required(spec.storageType, 'storage_type', row.id),
      storageGb: required(spec.storageGb, 'storage_gb', row.id),
      screenSizeInches: required(spec.screenSizeInches, 'screen_size_inches', row.id),
    },
    condition: {
      grade: required(condition.grade, 'condition_grade', row.id),
      guarantees: {
        batteryHealthMinPercent: required(
          condition.guarantees.batteryHealthMinPercent,
          'battery_health_min_percent',
          row.id
        ),
        batteryCycleMin: condition.guarantees.batteryCycleMin,
        batteryCycleMax: condition.guarantees.batteryCycleMax,
      },
      knownDefects: required(condition.knownDefects, 'known_defects', row.id),
    },
    price: required(details.price, 'price_minor', row.id),
    totalQuantity: required(details.totalQuantity, 'quantity_total', row.id),
    fulfillmentExpectations: required(
      details.fulfillmentExpectations,
      'fulfillment_expectations',
      row.id
    ),
    publishedAt: required(absent(row.published_at), 'published_at', row.id),
    archivedAt: row.archived_at,
  });
};

export const toListingRow = (listing: Listing): Insertable<ListingsTable> => {
  const state = listing.state;
  return {
    id: state.id,
    organization_id: state.organizationId,
    status: state.status,
    title: state.title ?? null,
    description: state.description ?? null,
    brand: state.specifications.brand ?? null,
    model: state.specifications.model ?? null,
    cpu: state.specifications.cpu ?? null,
    ram_gb: state.specifications.ramGb ?? null,
    storage_type: state.specifications.storageType ?? null,
    storage_gb: state.specifications.storageGb ?? null,
    screen_size_inches: state.specifications.screenSizeInches ?? null,
    condition_grade: state.condition.grade ?? null,
    battery_health_min_percent: state.condition.guarantees.batteryHealthMinPercent ?? null,
    battery_cycle_min: state.condition.guarantees.batteryCycleMin ?? null,
    battery_cycle_max: state.condition.guarantees.batteryCycleMax ?? null,
    known_defects: state.condition.knownDefects ?? null,
    price_minor: state.price?.amountMinor ?? null,
    // Currency is fixed to SEK and kept even before a price is entered (column is NOT NULL).
    currency: state.price?.currency ?? 'SEK',
    quantity_total: state.totalQuantity ?? null,
    quantity_reserved: state.reservedQuantity,
    quantity_sold: state.soldQuantity,
    fulfillment_expectations: state.fulfillmentExpectations ?? null,
    version: state.version,
    created_at: state.createdAt,
    updated_at: state.updatedAt,
    published_at: state.publishedAt,
    archived_at: state.archivedAt,
  };
};
