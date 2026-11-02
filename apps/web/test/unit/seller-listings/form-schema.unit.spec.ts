import type { CreateListingRequest } from '@acme/api-contracts';
import { describe, expect, it } from 'vitest';

import {
  EMPTY_LISTING_FORM,
  type ListingFormValues,
  formatMinorAsSekInput,
  listingFormSchema,
  parseSekToMinor,
  toListingFormValues,
} from '../../../src/features/seller-listings/form-schema.ts';
import { makeListing } from '../../fixtures/listing.ts';

/**
 * The form ⇄ request mapping (UC-007 S1; design contract, Tests): SEK typed as kronor becomes
 * öre, the battery-cycle pair is all-or-nothing, and every field-level rule reports on the field
 * the user typed in.
 */

const VALID: ListingFormValues = {
  title: 'ThinkPad T14 Gen 3 — business workhorse',
  description: 'Off-lease business laptops, fully refurbished.',
  brand: 'Lenovo',
  model: 'ThinkPad T14 Gen 3',
  cpu: 'AMD Ryzen 5 PRO 6650U',
  ramGb: '16',
  storageType: 'nvme',
  storageGb: '256',
  screenSizeInches: '14',
  grade: 'B',
  batteryHealthMinPercent: '85',
  batteryCycleMin: '150',
  batteryCycleMax: '400',
  knownDefects: 'Light scuffing on the lid corners.',
  priceSek: '7 490',
  quantityTotal: '12',
  fulfillmentExpectations: 'Shipped with PostNord within 2 working days of payment.',
};

const firstIssuePath = (values: ListingFormValues): string | undefined => {
  const result = listingFormSchema.safeParse(values);
  return result.success ? undefined : String(result.error.issues[0]?.path[0]);
};

/** Parses or throws, so assertions on the output never sit inside a condition. */
const parseOk = (values: ListingFormValues): CreateListingRequest => {
  const result = listingFormSchema.safeParse(values);
  if (!result.success) {
    throw new Error(`Expected valid form values: ${result.error.message}`);
  }
  return result.data;
};

const issuePaths = (values: ListingFormValues): Set<string> => {
  const result = listingFormSchema.safeParse(values);
  return result.success
    ? new Set()
    : new Set(result.error.issues.map((issue) => String(issue.path[0])));
};

describe('parseSekToMinor', () => {
  it.each([
    ['7490', 749_000],
    ['7 490', 749_000],
    ['7490.50', 749_050],
    ['7490,5', 749_050],
    ['0', 0],
  ])('parses %j as %i öre', (raw, minor) => {
    expect(parseSekToMinor(raw)).toBe(minor);
  });

  it.each(['', 'abc', '7490.123', '-10', '1e3', '7.490.00'])('rejects %j', (raw) => {
    expect(parseSekToMinor(raw)).toBeUndefined();
  });
});

describe('formatMinorAsSekInput', () => {
  it('shows whole kronor without decimals and öre with two', () => {
    expect(formatMinorAsSekInput(749_000)).toBe('7490');
    expect(formatMinorAsSekInput(749_050)).toBe('7490.50');
    expect(formatMinorAsSekInput(5)).toBe('0.05');
  });
});

describe('listingFormSchema', () => {
  it('turns valid form values into the shared create request', () => {
    expect(parseOk(VALID)).toEqual({
      title: VALID.title,
      description: VALID.description,
      specifications: {
        brand: 'Lenovo',
        model: 'ThinkPad T14 Gen 3',
        cpu: 'AMD Ryzen 5 PRO 6650U',
        ramGb: 16,
        storageType: 'nvme',
        storageGb: 256,
        screenSizeInches: 14,
      },
      condition: {
        grade: 'B',
        guarantees: { batteryHealthMinPercent: 85, batteryCycleMin: 150, batteryCycleMax: 400 },
        knownDefects: VALID.knownDefects,
      },
      priceMinor: 749_000,
      currency: 'SEK',
      quantityTotal: 12,
      fulfillmentExpectations: VALID.fulfillmentExpectations,
    });
  });

  it('omits the battery cycle range when both bounds are empty', () => {
    const request = parseOk({ ...VALID, batteryCycleMin: '', batteryCycleMax: '' });

    expect(request.condition.guarantees).toEqual({ batteryHealthMinPercent: 85 });
  });

  it('requires both cycle bounds or neither, reporting on the first', () => {
    expect(firstIssuePath({ ...VALID, batteryCycleMax: '' })).toBe('batteryCycleMin');
    expect(firstIssuePath({ ...VALID, batteryCycleMin: '' })).toBe('batteryCycleMin');
  });

  it('rejects an inverted cycle range', () => {
    expect(firstIssuePath({ ...VALID, batteryCycleMin: '500', batteryCycleMax: '100' })).toBe(
      'batteryCycleMin'
    );
  });

  it('rejects a zero, negative, or malformed price on the price field', () => {
    for (const priceSek of ['0', 'abc', '10.999']) {
      expect(firstIssuePath({ ...VALID, priceSek })).toBe('priceSek');
    }
  });

  it('rejects an empty required disclosure on its own field', () => {
    expect(firstIssuePath({ ...VALID, knownDefects: '  ' })).toBe('knownDefects');
    expect(firstIssuePath({ ...VALID, storageType: '' })).toBe('storageType');
    expect(firstIssuePath({ ...VALID, grade: '' })).toBe('grade');
    expect(firstIssuePath({ ...VALID, quantityTotal: '0' })).toBe('quantityTotal');
    expect(firstIssuePath({ ...VALID, batteryHealthMinPercent: '101' })).toBe(
      'batteryHealthMinPercent'
    );
  });

  it('accepts a screen size with one decimal and a comma', () => {
    expect(parseOk({ ...VALID, screenSizeInches: '13,3' }).specifications.screenSizeInches).toBe(
      13.3
    );
  });

  it('reports every empty field of a blank form', () => {
    const paths = issuePaths(EMPTY_LISTING_FORM);
    expect(paths.has('title')).toBe(true);
    expect(paths.has('priceSek')).toBe(true);
    expect(paths.has('fulfillmentExpectations')).toBe(true);
  });
});

describe('toListingFormValues', () => {
  it('round-trips a listing through the form values back to the same request', () => {
    const listing = makeListing({ price: { amountMinor: 749_050, currency: 'SEK' } });

    const values = toListingFormValues(listing);
    expect(values.priceSek).toBe('7490.50');
    expect(values.storageType).toBe('nvme');

    const request = parseOk(values);
    expect(request.priceMinor).toBe(749_050);
    expect(request.specifications).toEqual(listing.specifications);
    expect(request.condition).toEqual(listing.condition);
    expect(request.quantityTotal).toBe(listing.totalQuantity);
  });

  it('leaves the cycle bounds empty when the listing promises no range', () => {
    const listing = makeListing({
      condition: { grade: 'A', guarantees: { batteryHealthMinPercent: 90 }, knownDefects: 'none' },
    });

    const values = toListingFormValues(listing);
    expect(values.batteryCycleMin).toBe('');
    expect(values.batteryCycleMax).toBe('');
  });
});
