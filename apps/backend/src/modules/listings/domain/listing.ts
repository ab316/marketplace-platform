import type { Money } from '@acme/core-domain';

import { InvalidListingDataError, ListingStateError, ListingUnavailableError } from './errors.ts';

export type ListingStatus = 'draft' | 'active' | 'archived';
export type ConditionGrade = 'A' | 'B' | 'C';
export type StorageType = 'ssd' | 'nvme' | 'hdd';

export interface ListingSpecifications {
  readonly brand: string;
  readonly model: string;
  readonly cpu: string;
  readonly ramGb: number;
  readonly storageType: StorageType;
  readonly storageGb: number;
  readonly screenSizeInches: number;
}

/**
 * Condition promised for every unit of pooled stock on this listing. Units that cannot meet the
 * same guarantees belong on a separate listing (UC-001).
 */
export interface ConditionGuarantees {
  readonly batteryHealthMinPercent: number;
  readonly batteryCycleMin?: number | undefined;
  readonly batteryCycleMax?: number | undefined;
}

export interface ListingCondition {
  readonly grade: ConditionGrade;
  readonly guarantees: ConditionGuarantees;
  readonly knownDefects: string;
}

export interface ListingDetails {
  readonly title: string;
  readonly description: string;
  readonly specifications: ListingSpecifications;
  readonly condition: ListingCondition;
  readonly price: Money;
  readonly totalQuantity: number;
  readonly fulfillmentExpectations: string;
}

export interface ListingState extends ListingDetails {
  readonly id: string;
  readonly organizationId: string;
  readonly status: ListingStatus;
  readonly reservedQuantity: number;
  /** Units whose order was paid; never return to stock (PD-0004 §4). */
  readonly soldQuantity: number;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly publishedAt: Date | null;
  readonly archivedAt: Date | null;
}

export interface CreateListingDraftInput extends ListingDetails {
  readonly id: string;
  readonly organizationId: string;
  readonly now: Date;
}

/**
 * A pooled-stock offer of identical refurbished laptops from one seller organization.
 *
 * Invariants:
 * - `reservedQuantity >= 0`, `soldQuantity >= 0`, `reservedQuantity + soldQuantity <= totalQuantity` —
 *   stock can never oversell, and a sold unit is never counted as available again.
 * - Only an active listing can reserve a unit.
 * - Buyer-visible content is editable only while the listing is a draft.
 */
export class Listing {
  #state: ListingState;

  private constructor(state: ListingState) {
    this.#state = state;
  }

  static createDraft(input: CreateListingDraftInput): Listing {
    const details: ListingDetails = {
      title: input.title,
      description: input.description,
      specifications: input.specifications,
      condition: input.condition,
      price: input.price,
      totalQuantity: input.totalQuantity,
      fulfillmentExpectations: input.fulfillmentExpectations,
    };
    assertValidDetails(details);

    return new Listing({
      ...details,
      id: input.id,
      organizationId: input.organizationId,
      status: 'draft',
      reservedQuantity: 0,
      soldQuantity: 0,
      version: 1,
      createdAt: input.now,
      updatedAt: input.now,
      publishedAt: null,
      archivedAt: null,
    });
  }

  /** Rehydrates persisted state without re-running creation rules. */
  static restore(state: ListingState): Listing {
    return new Listing(state);
  }

  get state(): ListingState {
    return this.#state;
  }

  get id(): string {
    return this.#state.id;
  }

  get organizationId(): string {
    return this.#state.organizationId;
  }

  get status(): ListingStatus {
    return this.#state.status;
  }

  get version(): number {
    return this.#state.version;
  }

  get availableQuantity(): number {
    return this.#state.totalQuantity - this.#state.reservedQuantity - this.#state.soldQuantity;
  }

  get isOrderable(): boolean {
    return this.#state.status === 'active' && this.availableQuantity > 0;
  }

  /** Buyer-visible content may only change while the listing is a draft. */
  update(changes: Partial<ListingDetails>, now: Date): void {
    if (this.#state.status !== 'draft') {
      throw new ListingStateError('Only a draft listing can be edited.', {
        listingId: this.#state.id,
        status: this.#state.status,
      });
    }

    const next: ListingState = { ...this.#state, ...changes, updatedAt: now };
    assertValidDetails(next);
    if (next.totalQuantity < next.reservedQuantity + next.soldQuantity) {
      throw new InvalidListingDataError(
        'Total quantity cannot drop below reserved plus sold quantity.',
        {
          totalQuantity: next.totalQuantity,
          reservedQuantity: next.reservedQuantity,
          soldQuantity: next.soldQuantity,
        }
      );
    }

    this.#state = next;
  }

  publish(now: Date): void {
    if (this.#state.status !== 'draft') {
      throw new ListingStateError('Only a draft listing can be published.', {
        listingId: this.#state.id,
        status: this.#state.status,
      });
    }
    assertValidDetails(this.#state);

    this.#state = { ...this.#state, status: 'active', publishedAt: now, updatedAt: now };
  }

  archive(now: Date): void {
    if (this.#state.status !== 'active') {
      throw new ListingStateError('Only an active listing can be archived.', {
        listingId: this.#state.id,
        status: this.#state.status,
      });
    }

    this.#state = { ...this.#state, status: 'archived', archivedAt: now, updatedAt: now };
  }

  /** Holds one unit for an order. Rejected unless the listing is active with stock left. */
  reserveUnit(now: Date): void {
    if (this.#state.status !== 'active') {
      throw new ListingUnavailableError('This listing is not available for orders.', {
        listingId: this.#state.id,
        status: this.#state.status,
      });
    }
    if (this.availableQuantity <= 0) {
      throw new ListingUnavailableError('This listing is out of stock.', {
        listingId: this.#state.id,
      });
    }

    this.#state = {
      ...this.#state,
      reservedQuantity: this.#state.reservedQuantity + 1,
      updatedAt: now,
    };
  }

  /** Returns a held unit to available stock. Allowed in any status, so cancelling an order on an
   * archived listing still frees its unit. */
  releaseUnit(now: Date): void {
    if (this.#state.reservedQuantity <= 0) {
      throw new ListingStateError('This listing has no reserved units to release.', {
        listingId: this.#state.id,
      });
    }

    this.#state = {
      ...this.#state,
      reservedQuantity: this.#state.reservedQuantity - 1,
      updatedAt: now,
    };
  }

  /**
   * Converts a held unit into a sold one when its order is paid (UC-004 P5). Allowed in any
   * status: payment for an order on a since-archived listing still closes the sale.
   */
  markReservedUnitSold(now: Date): void {
    if (this.#state.reservedQuantity <= 0) {
      throw new ListingStateError('This listing has no reserved units to mark as sold.', {
        listingId: this.#state.id,
      });
    }

    this.#state = {
      ...this.#state,
      reservedQuantity: this.#state.reservedQuantity - 1,
      soldQuantity: this.#state.soldQuantity + 1,
      updatedAt: now,
    };
  }
}

function assertValidDetails(details: ListingDetails): void {
  if (!details.price.isPositive()) {
    throw new InvalidListingDataError('Price must be greater than zero.', {
      priceMinor: details.price.amountMinor,
    });
  }
  if (!Number.isSafeInteger(details.totalQuantity) || details.totalQuantity < 1) {
    throw new InvalidListingDataError('Total quantity must be at least one unit.', {
      totalQuantity: details.totalQuantity,
    });
  }

  const { batteryHealthMinPercent, batteryCycleMin, batteryCycleMax } =
    details.condition.guarantees;

  if (
    !Number.isSafeInteger(batteryHealthMinPercent) ||
    batteryHealthMinPercent < 1 ||
    batteryHealthMinPercent > 100
  ) {
    throw new InvalidListingDataError('Guaranteed battery health must be between 1 and 100.', {
      batteryHealthMinPercent,
    });
  }
  if (
    batteryCycleMin !== undefined &&
    batteryCycleMax !== undefined &&
    batteryCycleMin > batteryCycleMax
  ) {
    throw new InvalidListingDataError('Battery cycle range is inverted.', {
      batteryCycleMin,
      batteryCycleMax,
    });
  }
  if (details.condition.knownDefects.trim().length === 0) {
    throw new InvalidListingDataError(
      'Known defects must be disclosed; use "none" if there are none.'
    );
  }
}
