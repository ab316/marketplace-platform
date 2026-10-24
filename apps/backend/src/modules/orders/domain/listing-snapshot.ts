import type { Money } from '@acme/core-domain';

/**
 * What the buyer was promised at order time.
 *
 * The orders module owns this copy deliberately: it is captured once and never changes, so a later
 * listing edit cannot alter what the buyer agreed to (UC-001 B5). The shapes mirror the listings
 * module's content rather than importing it, keeping the two bounded contexts independent.
 */
export type SnapshotStorageType = 'ssd' | 'nvme' | 'hdd';
export type SnapshotConditionGrade = 'A' | 'B' | 'C';

export interface SnapshotSpecifications {
  readonly brand: string;
  readonly model: string;
  readonly cpu: string;
  readonly ramGb: number;
  readonly storageType: SnapshotStorageType;
  readonly storageGb: number;
  readonly screenSizeInches: number;
}

export interface SnapshotCondition {
  readonly grade: SnapshotConditionGrade;
  readonly guarantees: {
    readonly batteryHealthMinPercent: number;
    readonly batteryCycleMin?: number | undefined;
    readonly batteryCycleMax?: number | undefined;
  };
  readonly knownDefects: string;
}

export interface ListingSnapshot {
  readonly listingId: string;
  readonly sellerOrganizationId: string;
  readonly title: string;
  readonly description: string;
  readonly specifications: SnapshotSpecifications;
  readonly condition: SnapshotCondition;
  readonly price: Money;
  readonly fulfillmentExpectations: string;
  readonly capturedAt: Date;
}
