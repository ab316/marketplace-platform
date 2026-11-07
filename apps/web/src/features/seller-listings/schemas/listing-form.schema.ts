import {
  CATALOGUE_BRANDS,
  type ListingDraft,
  type UpdateListingRequest,
} from '@acme/api-contracts';
import { z } from 'zod';

/**
 * The draft editor's values (design: `docs/design/seller-listing-management.md`). Every input is
 * a string, so "not entered" is simply empty. Field names are the request paths, so a server
 * issue such as `condition.guarantees.batteryHealthMinPercent` lands on its field as-is. The one
 * exception is price, entered in whole kronor (`priceKronor`) and sent as öre (`priceMinor`).
 */
export interface ListingFormValues {
  title: string;
  description: string;
  specifications: {
    brand: string;
    model: string;
    cpu: string;
    ramGb: string;
    storageType: string;
    storageGb: string;
    screenSizeInches: string;
  };
  condition: {
    grade: string;
    guarantees: {
      batteryHealthMinPercent: string;
      batteryCycleMin: string;
      batteryCycleMax: string;
    };
    knownDefects: string;
  };
  priceKronor: string;
  quantityTotal: string;
  fulfillmentExpectations: string;
}

/** Every field path of the form, for mapping server issues onto fields safely. */
export const LISTING_FORM_PATHS = [
  'title',
  'description',
  'specifications.brand',
  'specifications.model',
  'specifications.cpu',
  'specifications.ramGb',
  'specifications.storageType',
  'specifications.storageGb',
  'specifications.screenSizeInches',
  'condition.grade',
  'condition.guarantees.batteryHealthMinPercent',
  'condition.guarantees.batteryCycleMin',
  'condition.guarantees.batteryCycleMax',
  'condition.knownDefects',
  'priceKronor',
  'quantityTotal',
  'fulfillmentExpectations',
] as const;
export type ListingFormPath = (typeof LISTING_FORM_PATHS)[number];

export const isListingFormPath = (path: string): path is ListingFormPath =>
  LISTING_FORM_PATHS.some((known) => known === path);

/** Where a request path's issue belongs on the form. */
export const formPathFor = (requestPath: string): string =>
  requestPath === 'priceMinor' ? 'priceKronor' : requestPath;

/** The DOM id of the control for a form path, so readiness links can move focus to it. */
export const fieldIdFor = (formPath: string): string => `listing-${formPath.replaceAll('.', '-')}`;

/**
 * Well-formedness only (UC-005): a value that is present must be valid; an empty field is never
 * an error. Completeness is the backend's readiness answer, not the form's (REPO_MAP §6).
 */
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max.toLocaleString('en-GB')} characters.`)
    .transform((value) => (value === '' ? null : value));

const wholeNumber = (min: number, max: number, unit = '') =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+$/.test(value), 'Enter a whole number.')
    .transform((value) => (value === '' ? null : Number(value)))
    .refine(
      (value) => value === null || (value >= min && value <= max),
      `Enter a number from ${min.toLocaleString('en-GB')} to ${max.toLocaleString('en-GB')}${unit}.`
    );

const decimal = (min: number, max: number, unit: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+([.,]\d+)?$/.test(value), 'Enter a number.')
    .transform((value) => (value === '' ? null : Number(value.replace(',', '.'))))
    .refine(
      (value) => value === null || (value >= min && value <= max),
      `Enter a number from ${min} to ${max}${unit}.`
    );

const oneOf = <T extends string>(options: readonly T[], message: string) =>
  z
    .string()
    .refine((value) => value === '' || options.some((option) => option === value), message)
    .transform((value): T | null => options.find((option) => option === value) ?? null);

export const listingFormSchema = z
  .object({
    title: text(140),
    description: text(5000),
    specifications: z.object({
      brand: oneOf(CATALOGUE_BRANDS, 'Choose a brand from the marketplace list.'),
      model: text(120),
      cpu: text(120),
      ramGb: wholeNumber(1, 2048, ' GB'),
      storageType: oneOf(['ssd', 'nvme', 'hdd'] as const, 'Choose a storage type.'),
      storageGb: wholeNumber(1, 1_048_576, ' GB'),
      screenSizeInches: decimal(5, 30, ' inches'),
    }),
    condition: z.object({
      grade: oneOf(['A', 'B', 'C'] as const, 'Choose a grade.'),
      guarantees: z.object({
        batteryHealthMinPercent: wholeNumber(1, 100, '%'),
        batteryCycleMin: wholeNumber(0, 10_000),
        batteryCycleMax: wholeNumber(0, 10_000),
      }),
      knownDefects: text(2000),
    }),
    // Whole kronor (design decision 4). Capped so öre stay a safe integer.
    priceKronor: wholeNumber(1, 10_000_000, ' kr'),
    quantityTotal: wholeNumber(1, 10_000, ' units'),
    fulfillmentExpectations: text(2000),
  })
  .superRefine((values, context) => {
    const { batteryCycleMin, batteryCycleMax } = values.condition.guarantees;
    if (batteryCycleMin !== null && batteryCycleMax !== null && batteryCycleMin > batteryCycleMax) {
      context.addIssue({
        code: 'custom',
        path: ['condition', 'guarantees', 'batteryCycleMin'],
        message: 'The minimum must not be above the maximum.',
      });
    }
  })
  .transform((values): UpdateListingRequest => ({
    title: values.title,
    description: values.description,
    specifications: values.specifications,
    condition: values.condition,
    // Every field is always sent, so what the seller sees is exactly what is stored.
    priceMinor: values.priceKronor === null ? null : values.priceKronor * 100,
    quantityTotal: values.quantityTotal,
    fulfillmentExpectations: values.fulfillmentExpectations,
  }));

const show = (value: string | number | null): string => (value === null ? '' : String(value));

export const EMPTY_LISTING_FORM: ListingFormValues = {
  title: '',
  description: '',
  specifications: {
    brand: '',
    model: '',
    cpu: '',
    ramGb: '',
    storageType: '',
    storageGb: '',
    screenSizeInches: '',
  },
  condition: {
    grade: '',
    guarantees: { batteryHealthMinPercent: '', batteryCycleMin: '', batteryCycleMax: '' },
    knownDefects: '',
  },
  priceKronor: '',
  quantityTotal: '',
  fulfillmentExpectations: '',
};

/** A saved draft as editor values. Öre are rounded down to kronor; the form never shows öre. */
export const toFormValues = (draft: ListingDraft): ListingFormValues => {
  const { specifications: spec, condition } = draft;
  return {
    title: show(draft.title),
    description: show(draft.description),
    specifications: {
      brand: show(spec.brand),
      model: show(spec.model),
      cpu: show(spec.cpu),
      ramGb: show(spec.ramGb),
      storageType: show(spec.storageType),
      storageGb: show(spec.storageGb),
      screenSizeInches: show(spec.screenSizeInches),
    },
    condition: {
      grade: show(condition.grade),
      guarantees: {
        batteryHealthMinPercent: show(condition.guarantees.batteryHealthMinPercent),
        batteryCycleMin: show(condition.guarantees.batteryCycleMin),
        batteryCycleMax: show(condition.guarantees.batteryCycleMax),
      },
      knownDefects: show(condition.knownDefects),
    },
    priceKronor: draft.price === null ? '' : String(Math.floor(draft.price.amountMinor / 100)),
    quantityTotal: show(draft.totalQuantity),
    fulfillmentExpectations: show(draft.fulfillmentExpectations),
  };
};
