import { z } from 'zod';

import { moneySchema, paginationQuerySchema } from './common.ts';

export const listingStatusSchema = z.enum(['draft', 'active', 'archived']);
export type ListingStatus = z.infer<typeof listingStatusSchema>;

export const conditionGradeSchema = z.enum(['A', 'B', 'C']);
export type ConditionGrade = z.infer<typeof conditionGradeSchema>;

export const storageTypeSchema = z.enum(['ssd', 'nvme', 'hdd']);
export type StorageType = z.infer<typeof storageTypeSchema>;

export const listingSpecificationsSchema = z.object({
  brand: z.string().trim().min(1).max(80),
  model: z.string().trim().min(1).max(120),
  cpu: z.string().trim().min(1).max(120),
  ramGb: z.number().int().min(1).max(2048),
  storageType: storageTypeSchema,
  storageGb: z.number().int().min(1).max(1_048_576),
  screenSizeInches: z.number().min(5).max(30),
});
export type ListingSpecifications = z.infer<typeof listingSpecificationsSchema>;

/**
 * Condition is promised as guarantees over pooled stock, not measured per unit: every unit on the
 * listing must satisfy them. Stock that cannot meet the same guarantees belongs on another listing.
 */
export const conditionGuaranteesSchema = z.object({
  batteryHealthMinPercent: z.number().int().min(1).max(100),
  batteryCycleMin: z.number().int().min(0).max(10_000).optional(),
  batteryCycleMax: z.number().int().min(0).max(10_000).optional(),
});
export type ConditionGuarantees = z.infer<typeof conditionGuaranteesSchema>;

export const listingConditionSchema = z.object({
  grade: conditionGradeSchema,
  guarantees: conditionGuaranteesSchema,
  /** Required disclosure; `none` is an explicit, valid answer. */
  knownDefects: z.string().trim().min(1).max(2000),
});
export type ListingCondition = z.infer<typeof listingConditionSchema>;

const listingWritableFields = {
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().min(1).max(5000),
  specifications: listingSpecificationsSchema,
  condition: listingConditionSchema,
  priceMinor: z.number().int().positive(),
  currency: z.literal('SEK').default('SEK'),
  quantityTotal: z.number().int().min(1).max(10_000),
  fulfillmentExpectations: z.string().trim().min(1).max(2000),
};

export const createListingRequestSchema = z.object(listingWritableFields);
export type CreateListingRequest = z.infer<typeof createListingRequestSchema>;

export const updateListingRequestSchema = z
  .object(listingWritableFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });
export type UpdateListingRequest = z.infer<typeof updateListingRequestSchema>;

export const listingSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  status: listingStatusSchema,
  title: z.string(),
  description: z.string(),
  specifications: listingSpecificationsSchema,
  condition: listingConditionSchema,
  price: moneySchema,
  totalQuantity: z.number().int(),
  reservedQuantity: z.number().int(),
  /** Units whose order was paid; they never return to stock. */
  soldQuantity: z.number().int(),
  availableQuantity: z.number().int(),
  fulfillmentExpectations: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  publishedAt: z.iso.datetime().nullable(),
  archivedAt: z.iso.datetime().nullable(),
});
export type Listing = z.infer<typeof listingSchema>;

/**
 * The curated marketplace brand list (UC-006 Q2): what the brand filter offers and accepts.
 * Matched case-insensitively against the listing's free-text brand until P1-017 moves the
 * vocabulary to publish time. Conceptually marketplace configuration; it lives here so the web
 * app and the backend validate against the same list.
 */
export const CATALOGUE_BRANDS = [
  'Lenovo',
  'Dell',
  'HP',
  'Apple',
  'Acer',
  'Asus',
  'Fujitsu',
  'Huawei',
  'LG',
  'Microsoft',
  'MSI',
  'Razer',
  'Samsung',
  'Toshiba',
] as const;
export type CatalogueBrand = (typeof CATALOGUE_BRANDS)[number];

const catalogueBrandSchema = z.enum(CATALOGUE_BRANDS);

/** Memory filter buckets (UC-006 Q3); each is an inclusive minimum in GB. */
export const CATALOGUE_RAM_MINIMUMS = [8, 16, 32, 64] as const;

export const catalogueSortSchema = z.enum(['newest', 'price_asc', 'price_desc']);
export type CatalogueSort = z.infer<typeof catalogueSortSchema>;

/**
 * UC-006 browse refinements. Every field is optional except sort's default; an unknown or
 * malformed value is rejected with a field-level reason (UC-006 E1), never silently dropped.
 */
export const browseListingsQuerySchema = paginationQuerySchema
  .extend({
    /** Keyword matched against title, description, brand, and model. */
    q: z.string().trim().min(1).max(140).optional(),
    /** One or more curated brands (UC-006 Q2); values OR within the filter. */
    brand: z
      .union([catalogueBrandSchema, z.array(catalogueBrandSchema)])
      .optional()
      .transform((value) => (value === undefined || Array.isArray(value) ? value : [value])),
    /** Inclusive price bounds in SEK minor units; each independently optional (UC-006 Q4). */
    priceMin: z.coerce.number().int().min(0).optional(),
    priceMax: z.coerce.number().int().min(0).optional(),
    /** Minimum condition grade, inclusive of better grades: B means A or B. */
    grade: conditionGradeSchema.optional(),
    /** Minimum memory in GB, from the fixed buckets (UC-006 Q3). */
    ramMin: z.coerce
      .number()
      .int()
      .refine((value): value is (typeof CATALOGUE_RAM_MINIMUMS)[number] =>
        CATALOGUE_RAM_MINIMUMS.some((minimum) => minimum === value)
      )
      .optional(),
    sort: catalogueSortSchema.default('newest'),
  })
  .refine(
    (query) =>
      query.priceMin === undefined ||
      query.priceMax === undefined ||
      query.priceMax >= query.priceMin,
    {
      path: ['priceMax'],
      message: 'Max price must be at least the min price.',
    }
  );
export type BrowseListingsQuery = z.infer<typeof browseListingsQuerySchema>;

export const listingListResponseSchema = z.object({
  items: z.array(listingSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type ListingListResponse = z.infer<typeof listingListResponseSchema>;

export const listingIdParamsSchema = z.object({ listingId: z.string().min(1) });
export type ListingIdParams = z.infer<typeof listingIdParamsSchema>;
