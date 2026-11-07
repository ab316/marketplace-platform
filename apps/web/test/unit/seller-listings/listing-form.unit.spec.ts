import { describe, expect, it } from 'vitest';

import {
  EMPTY_LISTING_FORM,
  type ListingFormValues,
  formPathFor,
  listingFormSchema,
  toFormValues,
} from '../../../src/features/seller-listings/schemas/listing-form.schema.ts';
import { emptyDraft, readyDraft } from '../../msw/listing-fixtures.ts';

const withValues = (patch: (values: ListingFormValues) => void): ListingFormValues => {
  const values = structuredClone(EMPTY_LISTING_FORM);
  patch(values);
  return values;
};

const issuePaths = (values: ListingFormValues): string[] => {
  const result = listingFormSchema.safeParse(values);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
};

describe('listing form schema (UC-005 well-formedness only)', () => {
  it('accepts an empty form and sends every field as null', () => {
    expect(listingFormSchema.parse(EMPTY_LISTING_FORM)).toEqual({
      title: null,
      description: null,
      specifications: {
        brand: null,
        model: null,
        cpu: null,
        ramGb: null,
        storageType: null,
        storageGb: null,
        screenSizeInches: null,
      },
      condition: {
        grade: null,
        guarantees: { batteryHealthMinPercent: null, batteryCycleMin: null, batteryCycleMax: null },
        knownDefects: null,
      },
      priceMinor: null,
      quantityTotal: null,
      fulfillmentExpectations: null,
    });
  });

  it('turns whole kronor into öre and numeric text into numbers', () => {
    const request = listingFormSchema.parse(
      withValues((values) => {
        values.priceKronor = '7990';
        values.specifications.ramGb = '16';
        values.specifications.screenSizeInches = '13,3';
        values.title = '  ThinkPad  ';
      })
    );

    expect(request.priceMinor).toBe(799_000);
    expect(request.specifications?.ramGb).toBe(16);
    expect(request.specifications?.screenSizeInches).toBe(13.3);
    expect(request.title).toBe('ThinkPad');
  });

  it('refuses malformed values, naming each field', () => {
    expect(
      issuePaths(
        withValues((values) => {
          values.priceKronor = '0';
          values.quantityTotal = '2.5';
          values.condition.guarantees.batteryHealthMinPercent = '120';
          values.specifications.brand = 'Commodore';
        })
      ).toSorted()
    ).toEqual([
      'condition.guarantees.batteryHealthMinPercent',
      'priceKronor',
      'quantityTotal',
      'specifications.brand',
    ]);
  });

  it('refuses an inverted battery cycle range on the minimum', () => {
    expect(
      issuePaths(
        withValues((values) => {
          values.condition.guarantees.batteryCycleMin = '400';
          values.condition.guarantees.batteryCycleMax = '100';
        })
      )
    ).toEqual(['condition.guarantees.batteryCycleMin']);
  });

  it('round-trips a saved draft into form values', () => {
    expect(toFormValues(emptyDraft())).toEqual(EMPTY_LISTING_FORM);
    const values = toFormValues(readyDraft());
    expect(values.priceKronor).toBe('7990');
    expect(values.condition.guarantees.batteryCycleMin).toBe('');
    expect(values.condition.guarantees.batteryCycleMax).toBe('300');
    expect(listingFormSchema.parse(values).priceMinor).toBe(799_000);
  });

  it.each([1, 29, 19999, 799000])('preserves a stored price of %i öre', (amountMinor) => {
    const draft = readyDraft({ price: { amountMinor, currency: 'SEK' } });
    expect(listingFormSchema.parse(toFormValues(draft)).priceMinor).toBe(amountMinor);
  });

  it('accepts comma decimals and rejects fractions of an öre', () => {
    const values = structuredClone(EMPTY_LISTING_FORM);
    values.priceKronor = '199,99';
    expect(listingFormSchema.parse(values).priceMinor).toBe(19999);
    values.priceKronor = '199.999';
    expect(issuePaths(values)).toContain('priceKronor');
  });

  it('maps a priceMinor issue onto the kronor field', () => {
    expect(formPathFor('priceMinor')).toBe('priceKronor');
    expect(formPathFor('specifications.brand')).toBe('specifications.brand');
  });
});
