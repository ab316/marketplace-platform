import { type Currency, Money } from '@acme/core-domain';

import type {
  ConditionGrade,
  DraftCondition,
  DraftConditionGuarantees,
  DraftSpecifications,
  ListingDraftDetails,
  StorageType,
} from '../domain/listing.ts';

/**
 * A change to one draft field: `undefined` keeps the stored value, `null` clears it, anything
 * else replaces it. Nested objects merge field by field, and `null` on a nested object clears
 * everything inside it (JSON merge-patch semantics, UC-007).
 */
type FieldPatch<T> = T | null | undefined;

export interface SpecificationsPatch {
  readonly brand?: FieldPatch<string>;
  readonly model?: FieldPatch<string>;
  readonly cpu?: FieldPatch<string>;
  readonly ramGb?: FieldPatch<number>;
  readonly storageType?: FieldPatch<StorageType>;
  readonly storageGb?: FieldPatch<number>;
  readonly screenSizeInches?: FieldPatch<number>;
}

export interface GuaranteesPatch {
  readonly batteryHealthMinPercent?: FieldPatch<number>;
  readonly batteryCycleMin?: FieldPatch<number>;
  readonly batteryCycleMax?: FieldPatch<number>;
}

export interface ConditionPatch {
  readonly grade?: FieldPatch<ConditionGrade>;
  readonly guarantees?: FieldPatch<GuaranteesPatch>;
  readonly knownDefects?: FieldPatch<string>;
}

export interface ListingDraftPatch {
  readonly title?: FieldPatch<string>;
  readonly description?: FieldPatch<string>;
  readonly specifications?: FieldPatch<SpecificationsPatch>;
  readonly condition?: FieldPatch<ConditionPatch>;
  readonly priceMinor?: FieldPatch<number>;
  readonly currency?: Currency | undefined;
  readonly quantityTotal?: FieldPatch<number>;
  readonly fulfillmentExpectations?: FieldPatch<string>;
}

/** A draft with nothing entered yet (UC-005 A1). */
export const EMPTY_DRAFT: ListingDraftDetails = {
  specifications: {},
  condition: { guarantees: {} },
};

const pick = <T>(patch: FieldPatch<T>, current: T | undefined): T | undefined =>
  patch === undefined ? current : (patch ?? undefined);

const mergeSpecifications = (
  current: DraftSpecifications,
  patch: FieldPatch<SpecificationsPatch>
): DraftSpecifications => {
  if (patch === undefined) {
    return current;
  }
  if (patch === null) {
    return {};
  }
  return {
    brand: pick(patch.brand, current.brand),
    model: pick(patch.model, current.model),
    cpu: pick(patch.cpu, current.cpu),
    ramGb: pick(patch.ramGb, current.ramGb),
    storageType: pick(patch.storageType, current.storageType),
    storageGb: pick(patch.storageGb, current.storageGb),
    screenSizeInches: pick(patch.screenSizeInches, current.screenSizeInches),
  };
};

const mergeGuarantees = (
  current: DraftConditionGuarantees,
  patch: FieldPatch<GuaranteesPatch>
): DraftConditionGuarantees => {
  if (patch === undefined) {
    return current;
  }
  if (patch === null) {
    return {};
  }
  return {
    batteryHealthMinPercent: pick(patch.batteryHealthMinPercent, current.batteryHealthMinPercent),
    batteryCycleMin: pick(patch.batteryCycleMin, current.batteryCycleMin),
    batteryCycleMax: pick(patch.batteryCycleMax, current.batteryCycleMax),
  };
};

const mergeCondition = (
  current: DraftCondition,
  patch: FieldPatch<ConditionPatch>
): DraftCondition => {
  if (patch === undefined) {
    return current;
  }
  if (patch === null) {
    return { guarantees: {} };
  }
  return {
    grade: pick(patch.grade, current.grade),
    guarantees: mergeGuarantees(current.guarantees, patch.guarantees),
    knownDefects: pick(patch.knownDefects, current.knownDefects),
  };
};

/** The draft content that results from applying `patch` to `current`. Pure; validates nothing. */
export const applyDraftPatch = (
  current: ListingDraftDetails,
  patch: ListingDraftPatch
): ListingDraftDetails => {
  const price =
    patch.priceMinor === undefined
      ? current.price
      : patch.priceMinor === null
        ? undefined
        : Money.fromMinor(patch.priceMinor, patch.currency);

  return {
    title: pick(patch.title, current.title),
    description: pick(patch.description, current.description),
    specifications: mergeSpecifications(current.specifications, patch.specifications),
    condition: mergeCondition(current.condition, patch.condition),
    price,
    totalQuantity: pick(patch.quantityTotal, current.totalQuantity),
    fulfillmentExpectations: pick(patch.fulfillmentExpectations, current.fulfillmentExpectations),
  };
};
