import {
  type ConditionGrade,
  type CreateListingRequest,
  type Listing,
  type StorageType,
  conditionGradeSchema,
  createListingRequestSchema,
  storageTypeSchema,
} from '@acme/api-contracts';
import { z } from 'zod';

/**
 * The listing form's values ⇄ the API request (UC-007 S1). Form controls hold strings; this
 * module turns them into the shared `CreateListingRequest` and back, so the conversion rules —
 * SEK typed as kronor, stored as öre; the battery cycle range as an all-or-nothing pair — live in
 * one pure, unit-tested place (ADR-013) rather than in the component.
 *
 * Validation here is the shared contract schema's rules restated at the field level the form
 * has, plus the two conversions. The Server Action re-parses with the contract schema anyway;
 * the backend remains authoritative (REPO_MAP.md §6).
 */

export interface ListingFormValues {
  readonly title: string;
  readonly description: string;
  readonly brand: string;
  readonly model: string;
  readonly cpu: string;
  readonly ramGb: string;
  readonly storageType: '' | StorageType;
  readonly storageGb: string;
  readonly screenSizeInches: string;
  readonly grade: '' | ConditionGrade;
  readonly batteryHealthMinPercent: string;
  readonly batteryCycleMin: string;
  readonly batteryCycleMax: string;
  readonly knownDefects: string;
  /** Whole kronor with optional öre, as typed: "7 490", "7490", "7490,50". */
  readonly priceSek: string;
  readonly quantityTotal: string;
  readonly fulfillmentExpectations: string;
}

export const EMPTY_LISTING_FORM: ListingFormValues = {
  title: '',
  description: '',
  brand: '',
  model: '',
  cpu: '',
  ramGb: '',
  storageType: '',
  storageGb: '',
  screenSizeInches: '',
  grade: '',
  batteryHealthMinPercent: '',
  batteryCycleMin: '',
  batteryCycleMax: '',
  knownDefects: '',
  priceSek: '',
  quantityTotal: '',
  fulfillmentExpectations: '',
};

export const STORAGE_TYPE_LABEL: Record<StorageType, string> = {
  ssd: 'SSD',
  nvme: 'NVMe',
  hdd: 'HDD',
};

/** The same words the catalogue uses, so sellers and buyers read one scale. */
export const GRADE_WORD: Record<ConditionGrade, string> = {
  A: 'Like new',
  B: 'Light wear',
  C: 'Visible wear',
};

/**
 * Kronor as typed → öre, or `undefined` when the text is not an amount. Accepts a thousands
 * space and either decimal separator, at most two decimals, and nothing else.
 */
export const parseSekToMinor = (raw: string): number | undefined => {
  const normalized = raw
    .trim()
    .replaceAll(/[\s ]/g, '')
    .replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return undefined;
  }
  const [kronor = '0', decimals = ''] = normalized.split('.');
  return Number(kronor) * 100 + Number(decimals.padEnd(2, '0'));
};

/** Öre → the text the form shows: whole kronor, or kronor with two decimals when there are öre. */
export const formatMinorAsSekInput = (amountMinor: number): string => {
  const kronor = Math.floor(amountMinor / 100);
  const ore = amountMinor % 100;
  return ore === 0 ? String(kronor) : `${kronor}.${String(ore).padStart(2, '0')}`;
};

const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}.`)
    .max(
      max,
      `${label[0]?.toUpperCase() ?? ''}${label.slice(1)} must be at most ${max} characters.`
    );

const wholeNumber = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Enter ${label}.`)
    .refine((value) => /^\d+$/.test(value), `${capitalize(label)} must be a whole number.`)
    .refine(
      (value) => Number(value) >= min && Number(value) <= max,
      `${capitalize(label)} must be between ${min} and ${max}.`
    );

const optionalWholeNumber = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (/^\d+$/.test(value) && Number(value) <= max),
      `${capitalize(label)} must be a whole number up to ${max}.`
    );

const capitalize = (label: string): string => `${label[0]?.toUpperCase() ?? ''}${label.slice(1)}`;

const fields = z.object({
  title: text('a title', 140),
  description: text('a description', 5000),
  brand: text('the brand', 80),
  model: text('the model', 120),
  cpu: text('the processor', 120),
  ramGb: wholeNumber('memory', 1, 2048),
  storageType: storageTypeSchema.or(z.literal('')).refine((value) => value !== '', {
    message: 'Choose a storage type.',
  }),
  storageGb: wholeNumber('storage size', 1, 1_048_576),
  screenSizeInches: z
    .string()
    .trim()
    .min(1, 'Enter the screen size.')
    .refine(
      (value) => /^\d+([.,]\d)?$/.test(value),
      'Screen size must be a number with at most one decimal.'
    )
    .refine((value) => {
      const inches = Number(value.replace(',', '.'));
      return inches >= 5 && inches <= 30;
    }, 'Screen size must be between 5 and 30 inches.'),
  grade: conditionGradeSchema.or(z.literal('')).refine((value) => value !== '', {
    message: 'Choose a condition grade.',
  }),
  batteryHealthMinPercent: wholeNumber('battery health', 1, 100),
  batteryCycleMin: optionalWholeNumber('battery cycles', 10_000),
  batteryCycleMax: optionalWholeNumber('battery cycles', 10_000),
  knownDefects: z
    .string()
    .trim()
    .min(1, 'Known defects must be disclosed; write "none" if there are none.')
    .max(2000, 'Known defects must be at most 2000 characters.'),
  priceSek: z
    .string()
    .trim()
    .min(1, 'Enter a price.')
    .refine(
      (value) => parseSekToMinor(value) !== undefined,
      'Enter a price in kronor, with at most two decimals.'
    )
    .refine((value) => (parseSekToMinor(value) ?? 0) > 0, 'Enter a price above 0 kr.'),
  quantityTotal: wholeNumber('quantity', 1, 10_000),
  fulfillmentExpectations: text('fulfillment expectations', 2000),
});

/**
 * Form values → `CreateListingRequest`. Field-level messages land on the form field that caused
 * them; the cycle-pair rule lands on `batteryCycleMin` so the pair is marked together.
 */
export const listingFormSchema = fields
  .superRefine((values, ctx) => {
    const hasMin = values.batteryCycleMin !== '';
    const hasMax = values.batteryCycleMax !== '';
    if (hasMin !== hasMax) {
      ctx.addIssue({
        code: 'custom',
        path: ['batteryCycleMin'],
        message: 'Enter both bounds or leave both empty.',
      });
    } else if (hasMin && Number(values.batteryCycleMin) > Number(values.batteryCycleMax)) {
      ctx.addIssue({
        code: 'custom',
        path: ['batteryCycleMin'],
        message: 'The lower bound must not exceed the upper bound.',
      });
    }
  })
  .transform((values): CreateListingRequest =>
    createListingRequestSchema.parse({
      title: values.title,
      description: values.description,
      specifications: {
        brand: values.brand,
        model: values.model,
        cpu: values.cpu,
        ramGb: Number(values.ramGb),
        storageType: values.storageType,
        storageGb: Number(values.storageGb),
        screenSizeInches: Number(values.screenSizeInches.replace(',', '.')),
      },
      condition: {
        grade: values.grade,
        guarantees: {
          batteryHealthMinPercent: Number(values.batteryHealthMinPercent),
          ...(values.batteryCycleMin === ''
            ? {}
            : {
                batteryCycleMin: Number(values.batteryCycleMin),
                batteryCycleMax: Number(values.batteryCycleMax),
              }),
        },
        knownDefects: values.knownDefects,
      },
      priceMinor: parseSekToMinor(values.priceSek),
      currency: 'SEK',
      quantityTotal: Number(values.quantityTotal),
      fulfillmentExpectations: values.fulfillmentExpectations,
    })
  );

/** An existing listing → the form's values, for the edit route. */
export const toListingFormValues = (listing: Listing): ListingFormValues => ({
  title: listing.title,
  description: listing.description,
  brand: listing.specifications.brand,
  model: listing.specifications.model,
  cpu: listing.specifications.cpu,
  ramGb: String(listing.specifications.ramGb),
  storageType: listing.specifications.storageType,
  storageGb: String(listing.specifications.storageGb),
  screenSizeInches: String(listing.specifications.screenSizeInches),
  grade: listing.condition.grade,
  batteryHealthMinPercent: String(listing.condition.guarantees.batteryHealthMinPercent),
  batteryCycleMin:
    listing.condition.guarantees.batteryCycleMin === undefined
      ? ''
      : String(listing.condition.guarantees.batteryCycleMin),
  batteryCycleMax:
    listing.condition.guarantees.batteryCycleMax === undefined
      ? ''
      : String(listing.condition.guarantees.batteryCycleMax),
  knownDefects: listing.condition.knownDefects,
  priceSek: formatMinorAsSekInput(listing.price.amountMinor),
  quantityTotal: String(listing.totalQuantity),
  fulfillmentExpectations: listing.fulfillmentExpectations,
});
