import { Money } from '@acme/core-domain';
import { describe, expect, it } from 'vitest';

import {
  applyDraftPatch,
  EMPTY_DRAFT,
} from '../../../src/modules/listings/application/draft-patch.ts';
import type { ListingDraftDetails } from '../../../src/modules/listings/domain/listing.ts';

const current: ListingDraftDetails = {
  title: 'ThinkPad T14 Gen 3',
  description: 'Business laptop.',
  specifications: { brand: 'Lenovo', model: 'ThinkPad T14 Gen 3', ramGb: 16 },
  condition: {
    grade: 'A',
    guarantees: { batteryHealthMinPercent: 92, batteryCycleMax: 300 },
    knownDefects: 'none',
  },
  price: Money.fromMinor(799_000),
  totalQuantity: 3,
};

describe('applyDraftPatch (UC-007 merge semantics)', () => {
  it('keeps every field the patch leaves out', () => {
    expect(applyDraftPatch(current, {})).toEqual(current);
  });

  it('replaces a field the patch sets and clears a field the patch nulls', () => {
    const next = applyDraftPatch(current, { title: 'Renamed', description: null });

    expect(next.title).toBe('Renamed');
    expect(next.description).toBeUndefined();
    expect(next.price).toEqual(current.price);
  });

  it('merges nested objects field by field', () => {
    const next = applyDraftPatch(current, {
      specifications: { cpu: 'Intel Core i5-1245U', ramGb: null },
      condition: { guarantees: { batteryCycleMin: 100 } },
    });

    expect(next.specifications).toEqual({
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 3',
      cpu: 'Intel Core i5-1245U',
      ramGb: undefined,
      storageType: undefined,
      storageGb: undefined,
      screenSizeInches: undefined,
    });
    expect(next.condition.grade).toBe('A');
    expect(next.condition.guarantees).toEqual({
      batteryHealthMinPercent: 92,
      batteryCycleMin: 100,
      batteryCycleMax: 300,
    });
  });

  it('clears everything inside a nested object set to null', () => {
    const next = applyDraftPatch(current, { specifications: null, condition: null });

    expect(next.specifications).toEqual({});
    expect(next.condition).toEqual({ guarantees: {} });
  });

  it('builds a price from minor units, and clears it with null', () => {
    expect(applyDraftPatch(EMPTY_DRAFT, { priceMinor: 650_000 }).price).toEqual(
      Money.fromMinor(650_000)
    );
    expect(applyDraftPatch(current, { priceMinor: null }).price).toBeUndefined();
  });

  it('turns an empty patch on an empty draft into an empty draft', () => {
    expect(applyDraftPatch(EMPTY_DRAFT, {})).toEqual({
      title: undefined,
      description: undefined,
      specifications: {},
      condition: { guarantees: {} },
      price: undefined,
      totalQuantity: undefined,
      fulfillmentExpectations: undefined,
    });
  });
});
