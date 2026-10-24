import { Money } from '@acme/core-domain';
import type { Insertable, Selectable } from 'kysely';

import { readEnum } from '../../../../shared/infrastructure/database/row-values.ts';
import type { ListingsTable } from '../../../../shared/infrastructure/database/schema.ts';
import {
  type ConditionGrade,
  Listing,
  type ListingStatus,
  type StorageType,
} from '../../domain/listing.ts';

const LISTING_STATUSES: readonly ListingStatus[] = ['draft', 'active', 'archived'];
const STORAGE_TYPES: readonly StorageType[] = ['ssd', 'nvme', 'hdd'];
const CONDITION_GRADES: readonly ConditionGrade[] = ['A', 'B', 'C'];

export const toListing = (row: Selectable<ListingsTable>): Listing =>
  Listing.restore({
    id: row.id,
    organizationId: row.organization_id,
    status: readEnum(LISTING_STATUSES, row.status, 'listings.status'),
    title: row.title,
    description: row.description,
    specifications: {
      brand: row.brand,
      model: row.model,
      cpu: row.cpu,
      ramGb: row.ram_gb,
      storageType: readEnum(STORAGE_TYPES, row.storage_type, 'listings.storage_type'),
      storageGb: row.storage_gb,
      screenSizeInches: row.screen_size_inches,
    },
    condition: {
      grade: readEnum(CONDITION_GRADES, row.condition_grade, 'listings.condition_grade'),
      guarantees: {
        batteryHealthMinPercent: row.battery_health_min_percent,
        batteryCycleMin: row.battery_cycle_min ?? undefined,
        batteryCycleMax: row.battery_cycle_max ?? undefined,
      },
      knownDefects: row.known_defects,
    },
    price: Money.fromMinor(row.price_minor, 'SEK'),
    totalQuantity: row.quantity_total,
    reservedQuantity: row.quantity_reserved,
    fulfillmentExpectations: row.fulfillment_expectations,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
  });

export const toListingRow = (listing: Listing): Insertable<ListingsTable> => {
  const state = listing.state;
  return {
    id: state.id,
    organization_id: state.organizationId,
    status: state.status,
    title: state.title,
    description: state.description,
    brand: state.specifications.brand,
    model: state.specifications.model,
    cpu: state.specifications.cpu,
    ram_gb: state.specifications.ramGb,
    storage_type: state.specifications.storageType,
    storage_gb: state.specifications.storageGb,
    screen_size_inches: state.specifications.screenSizeInches,
    condition_grade: state.condition.grade,
    battery_health_min_percent: state.condition.guarantees.batteryHealthMinPercent,
    battery_cycle_min: state.condition.guarantees.batteryCycleMin ?? null,
    battery_cycle_max: state.condition.guarantees.batteryCycleMax ?? null,
    known_defects: state.condition.knownDefects,
    price_minor: state.price.amountMinor,
    currency: state.price.currency,
    quantity_total: state.totalQuantity,
    quantity_reserved: state.reservedQuantity,
    fulfillment_expectations: state.fulfillmentExpectations,
    version: state.version,
    created_at: state.createdAt,
    updated_at: state.updatedAt,
    published_at: state.publishedAt,
    archived_at: state.archivedAt,
  };
};
