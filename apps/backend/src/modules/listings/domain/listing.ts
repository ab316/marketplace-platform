import type { Money } from '@acme/core-domain';

import {
  InvalidListingDataError,
  ListingIncompleteError,
  ListingStateError,
  ListingUnavailableError,
} from './errors.ts';

export type ListingStatus = 'draft' | 'active' | 'archived';
export type PublishedListingStatus = 'active' | 'archived';
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

/** Everything a published listing discloses. Every required field is present. */
export interface ListingDetails {
  readonly title: string;
  readonly description: string;
  readonly specifications: ListingSpecifications;
  readonly condition: ListingCondition;
  readonly price: Money;
  readonly totalQuantity: number;
  readonly fulfillmentExpectations: string;
}

export interface DraftSpecifications {
  readonly brand?: string | undefined;
  readonly model?: string | undefined;
  readonly cpu?: string | undefined;
  readonly ramGb?: number | undefined;
  readonly storageType?: StorageType | undefined;
  readonly storageGb?: number | undefined;
  readonly screenSizeInches?: number | undefined;
}

export interface DraftConditionGuarantees {
  readonly batteryHealthMinPercent?: number | undefined;
  readonly batteryCycleMin?: number | undefined;
  readonly batteryCycleMax?: number | undefined;
}

export interface DraftCondition {
  readonly grade?: ConditionGrade | undefined;
  readonly guarantees: DraftConditionGuarantees;
  readonly knownDefects?: string | undefined;
}

/**
 * What a draft holds: any field may still be missing (UC-005, P1-012). A complete
 * `ListingDetails` is also a valid draft.
 */
export interface ListingDraftDetails {
  readonly title?: string | undefined;
  readonly description?: string | undefined;
  readonly specifications: DraftSpecifications;
  readonly condition: DraftCondition;
  readonly price?: Money | undefined;
  readonly totalQuantity?: number | undefined;
  readonly fulfillmentExpectations?: string | undefined;
}

/**
 * A listing field, named as the seller's write request names it, so a reason can be placed on
 * the form field it concerns.
 */
export type ListingField =
  | 'title'
  | 'description'
  | 'specifications.brand'
  | 'specifications.model'
  | 'specifications.cpu'
  | 'specifications.ramGb'
  | 'specifications.storageType'
  | 'specifications.storageGb'
  | 'specifications.screenSizeInches'
  | 'condition.grade'
  | 'condition.guarantees.batteryHealthMinPercent'
  | 'condition.guarantees.batteryCycleMin'
  | 'condition.guarantees.batteryCycleMax'
  | 'condition.knownDefects'
  | 'priceMinor'
  | 'quantityTotal'
  | 'fulfillmentExpectations';

export interface ListingIssue {
  readonly path: ListingField;
  readonly message: string;
}

/** Whether a listing can be published now, and every reason it cannot. */
export interface ListingReadiness {
  readonly ready: boolean;
  readonly issues: readonly ListingIssue[];
}

interface ListingStateBase {
  readonly id: string;
  readonly organizationId: string;
  readonly reservedQuantity: number;
  /** Units whose order was paid; never return to stock (PD-0004 §4). */
  readonly soldQuantity: number;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** A draft: possibly incomplete, never visible to buyers, never holding stock. */
export interface DraftListingState extends ListingStateBase, ListingDraftDetails {
  readonly status: 'draft';
  readonly publishedAt: null;
  readonly archivedAt: null;
}

/** An active or archived listing: complete, and its content frozen (spec D2). */
export interface PublishedListingState extends ListingStateBase, ListingDetails {
  readonly status: PublishedListingStatus;
  readonly publishedAt: Date;
  readonly archivedAt: Date | null;
}

export type ListingState = DraftListingState | PublishedListingState;

export interface CreateListingDraftInput extends ListingDraftDetails {
  readonly id: string;
  readonly organizationId: string;
  readonly now: Date;
}

const READY: ListingReadiness = { ready: true, issues: [] };

/**
 * A pooled-stock offer of identical refurbished laptops from one seller organization.
 *
 * Invariants:
 * - `reservedQuantity >= 0`, `soldQuantity >= 0`, `reservedQuantity + soldQuantity <= totalQuantity` —
 *   stock can never oversell, and a sold unit is never counted as available again.
 * - Only an active listing can reserve a unit, so a draft never holds stock.
 * - Every value a listing holds is well-formed, in every status. A draft may be incomplete; an
 *   active or archived listing never is (UC-008).
 * - Buyer-visible content is editable only while the listing is a draft.
 */
export class Listing {
  #state: ListingState;

  private constructor(state: ListingState) {
    this.#state = state;
  }

  static createDraft(input: CreateListingDraftInput): Listing {
    const details: ListingDraftDetails = {
      title: input.title,
      description: input.description,
      specifications: input.specifications,
      condition: input.condition,
      price: input.price,
      totalQuantity: input.totalQuantity,
      fulfillmentExpectations: input.fulfillmentExpectations,
    };
    assertWellFormed(details);

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
    return (
      (this.#state.totalQuantity ?? 0) - this.#state.reservedQuantity - this.#state.soldQuantity
    );
  }

  get isOrderable(): boolean {
    return this.#state.status === 'active' && this.availableQuantity > 0;
  }

  /** Every reason a draft cannot be published yet; published listings are always ready. */
  readiness(): ListingReadiness {
    if (this.#state.status !== 'draft') {
      return READY;
    }
    const issues = [...malformedFields(this.#state), ...inspectCompleteness(this.#state).missing];
    return issues.length === 0 ? READY : { ready: false, issues };
  }

  /**
   * Replaces a draft's content with `details` (UC-007). Fields may be added, changed, or left
   * out; whatever is present must be well-formed. Completeness is not checked here.
   */
  revise(details: ListingDraftDetails, now: Date): void {
    if (this.#state.status !== 'draft') {
      throw new ListingStateError('Only a draft listing can be edited.', {
        listingId: this.#state.id,
        status: this.#state.status,
      });
    }
    assertWellFormed(details);

    this.#state = {
      id: this.#state.id,
      organizationId: this.#state.organizationId,
      status: 'draft',
      reservedQuantity: this.#state.reservedQuantity,
      soldQuantity: this.#state.soldQuantity,
      version: this.#state.version,
      createdAt: this.#state.createdAt,
      updatedAt: now,
      publishedAt: null,
      archivedAt: null,
      title: details.title,
      description: details.description,
      specifications: details.specifications,
      condition: details.condition,
      price: details.price,
      totalQuantity: details.totalQuantity,
      fulfillmentExpectations: details.fulfillmentExpectations,
    };
  }

  /** Makes a complete draft active (UC-008). Every missing or invalid field is reported at once. */
  publish(now: Date): void {
    const state = this.#state;
    if (state.status !== 'draft') {
      throw new ListingStateError('Only a draft listing can be published.', {
        listingId: state.id,
        status: state.status,
      });
    }

    const malformed = malformedFields(state);
    const { details, missing } = inspectCompleteness(state);
    if (details === null || malformed.length > 0) {
      throw new ListingIncompleteError(state.id, [...malformed, ...missing]);
    }

    this.#state = {
      ...details,
      id: state.id,
      organizationId: state.organizationId,
      status: 'active',
      reservedQuantity: state.reservedQuantity,
      soldQuantity: state.soldQuantity,
      version: state.version,
      createdAt: state.createdAt,
      updatedAt: now,
      publishedAt: now,
      archivedAt: null,
    };
  }

  archive(now: Date): void {
    const state = this.#state;
    if (state.status !== 'active') {
      throw new ListingStateError('Only an active listing can be archived.', {
        listingId: state.id,
        status: state.status,
      });
    }

    this.#state = { ...state, status: 'archived', archivedAt: now, updatedAt: now };
  }

  /** Holds one unit for an order. Rejected unless the listing is active with stock left. */
  reserveUnit(now: Date): void {
    const state = this.#state;
    if (state.status !== 'active') {
      throw new ListingUnavailableError('This listing is not available for orders.', {
        listingId: state.id,
        status: state.status,
      });
    }
    if (this.availableQuantity <= 0) {
      throw new ListingUnavailableError('This listing is out of stock.', {
        listingId: state.id,
      });
    }

    this.#state = { ...state, reservedQuantity: state.reservedQuantity + 1, updatedAt: now };
  }

  /** Returns a held unit to available stock. Allowed in any status, so cancelling an order on an
   * archived listing still frees its unit. */
  releaseUnit(now: Date): void {
    const state = this.#state;
    if (state.status === 'draft' || state.reservedQuantity <= 0) {
      throw new ListingStateError('This listing has no reserved units to release.', {
        listingId: state.id,
      });
    }

    this.#state = { ...state, reservedQuantity: state.reservedQuantity - 1, updatedAt: now };
  }

  /**
   * Converts a held unit into a sold one when its order is paid (UC-004 P5). Allowed in any
   * status: payment for an order on a since-archived listing still closes the sale.
   */
  markReservedUnitSold(now: Date): void {
    const state = this.#state;
    if (state.status === 'draft' || state.reservedQuantity <= 0) {
      throw new ListingStateError('This listing has no reserved units to mark as sold.', {
        listingId: state.id,
      });
    }

    this.#state = {
      ...state,
      reservedQuantity: state.reservedQuantity - 1,
      soldQuantity: state.soldQuantity + 1,
      updatedAt: now,
    };
  }
}

const REQUIRED = 'Required to publish.';

/**
 * Builds the complete details a published listing needs, or names every required field that is
 * missing. The single definition of the publish bar (business rules, "Required listing fields").
 * The battery cycle range stays optional.
 */
function inspectCompleteness(draft: ListingDraftDetails): {
  details: ListingDetails | null;
  missing: ListingIssue[];
} {
  const { title, description, price, totalQuantity, fulfillmentExpectations } = draft;
  const { brand, model, cpu, ramGb, storageType, storageGb, screenSizeInches } =
    draft.specifications;
  const { grade, knownDefects, guarantees } = draft.condition;
  const { batteryHealthMinPercent, batteryCycleMin, batteryCycleMax } = guarantees;

  const required: [unknown, ListingField][] = [
    [title, 'title'],
    [description, 'description'],
    [brand, 'specifications.brand'],
    [model, 'specifications.model'],
    [cpu, 'specifications.cpu'],
    [ramGb, 'specifications.ramGb'],
    [storageType, 'specifications.storageType'],
    [storageGb, 'specifications.storageGb'],
    [screenSizeInches, 'specifications.screenSizeInches'],
    [grade, 'condition.grade'],
    [batteryHealthMinPercent, 'condition.guarantees.batteryHealthMinPercent'],
    [knownDefects, 'condition.knownDefects'],
    [price, 'priceMinor'],
    [totalQuantity, 'quantityTotal'],
    [fulfillmentExpectations, 'fulfillmentExpectations'],
  ];
  const missing = required
    .filter(([value]) => value === undefined)
    .map(([, path]): ListingIssue => ({ path, message: REQUIRED }));

  // Mirrors the list above; spelled out so the compiler can prove every value is present.
  if (
    title === undefined ||
    description === undefined ||
    brand === undefined ||
    model === undefined ||
    cpu === undefined ||
    ramGb === undefined ||
    storageType === undefined ||
    storageGb === undefined ||
    screenSizeInches === undefined ||
    grade === undefined ||
    batteryHealthMinPercent === undefined ||
    knownDefects === undefined ||
    price === undefined ||
    totalQuantity === undefined ||
    fulfillmentExpectations === undefined
  ) {
    return { details: null, missing };
  }

  return {
    details: {
      title,
      description,
      specifications: { brand, model, cpu, ramGb, storageType, storageGb, screenSizeInches },
      condition: {
        grade,
        guarantees: { batteryHealthMinPercent, batteryCycleMin, batteryCycleMax },
        knownDefects,
      },
      price,
      totalQuantity,
      fulfillmentExpectations,
    },
    missing,
  };
}

/** Values that are present but invalid. Absent values are never malformed. */
function malformedFields(details: ListingDraftDetails): ListingIssue[] {
  const issues: ListingIssue[] = [];
  const { guarantees } = details.condition;

  const texts: [string | undefined, ListingField][] = [
    [details.title, 'title'],
    [details.description, 'description'],
    [details.specifications.brand, 'specifications.brand'],
    [details.specifications.model, 'specifications.model'],
    [details.specifications.cpu, 'specifications.cpu'],
    [details.condition.knownDefects, 'condition.knownDefects'],
    [details.fulfillmentExpectations, 'fulfillmentExpectations'],
  ];
  for (const [value, path] of texts) {
    if (value !== undefined && value.trim().length === 0) {
      issues.push({ path, message: 'Leave this empty instead of entering only spaces.' });
    }
  }

  if (details.price !== undefined && !details.price.isPositive()) {
    issues.push({ path: 'priceMinor', message: 'Price must be greater than zero.' });
  }
  if (
    details.totalQuantity !== undefined &&
    (!Number.isSafeInteger(details.totalQuantity) || details.totalQuantity < 1)
  ) {
    issues.push({ path: 'quantityTotal', message: 'Total quantity must be at least one unit.' });
  }

  const health = guarantees.batteryHealthMinPercent;
  if (health !== undefined && (!Number.isSafeInteger(health) || health < 1 || health > 100)) {
    issues.push({
      path: 'condition.guarantees.batteryHealthMinPercent',
      message: 'Guaranteed battery health must be between 1 and 100.',
    });
  }
  if (
    guarantees.batteryCycleMin !== undefined &&
    guarantees.batteryCycleMax !== undefined &&
    guarantees.batteryCycleMin > guarantees.batteryCycleMax
  ) {
    issues.push({
      path: 'condition.guarantees.batteryCycleMin',
      message: 'Battery cycle range is inverted.',
    });
  }

  return issues;
}

function assertWellFormed(details: ListingDraftDetails): void {
  const issues = malformedFields(details);
  const first = issues[0];
  if (first !== undefined) {
    throw new InvalidListingDataError(first.message, { issues });
  }
}
