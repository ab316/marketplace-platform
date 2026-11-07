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

/** Blank text in a draft means "not entered yet", never a value (UC-005). */
const blankToNull = (value: unknown): unknown =>
  typeof value === 'string' && value.trim().length === 0 ? null : value;

/**
 * One draft field in a write request. Omitted leaves the stored value alone; `null` (or blank
 * text) clears it. A value that is present must be well-formed (UC-005, UC-007).
 */
const draftText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().min(1).max(max).nullable()).optional();
const draftValue = <T extends z.ZodType>(schema: T) => schema.nullable().optional();

const draftSpecificationsInputSchema = z.object({
  brand: draftText(80),
  model: draftText(120),
  cpu: draftText(120),
  ramGb: draftValue(z.number().int().min(1).max(2048)),
  storageType: draftValue(storageTypeSchema),
  storageGb: draftValue(z.number().int().min(1).max(1_048_576)),
  screenSizeInches: draftValue(z.number().min(5).max(30)),
});

const draftGuaranteesInputSchema = z.object({
  batteryHealthMinPercent: draftValue(z.number().int().min(1).max(100)),
  batteryCycleMin: draftValue(z.number().int().min(0).max(10_000)),
  batteryCycleMax: draftValue(z.number().int().min(0).max(10_000)),
});

const draftConditionInputSchema = z.object({
  grade: draftValue(conditionGradeSchema),
  guarantees: draftValue(draftGuaranteesInputSchema),
  knownDefects: draftText(2000),
});

/**
 * Every field a seller can write on a draft. All are optional: a draft may be saved with any
 * subset, including none (P1-012). Completeness is checked only when publishing (UC-008).
 * Nested objects merge field by field; `null` on a nested object clears everything inside it.
 */
const listingDraftFields = {
  title: draftText(140),
  description: draftText(5000),
  specifications: draftValue(draftSpecificationsInputSchema),
  condition: draftValue(draftConditionInputSchema),
  priceMinor: draftValue(z.number().int().positive()),
  currency: z.literal('SEK').optional(),
  quantityTotal: draftValue(z.number().int().min(1).max(10_000)),
  fulfillmentExpectations: draftText(2000),
};

/** UC-005: send `{}` to create an empty draft. */
export const createListingRequestSchema = z.object(listingDraftFields);
export type CreateListingRequest = z.infer<typeof createListingRequestSchema>;

/** UC-007: JSON merge-patch semantics — omitted keeps, `null` clears, nested objects merge. */
export const updateListingRequestSchema = z
  .object(listingDraftFields)
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  });
export type UpdateListingRequest = z.infer<typeof updateListingRequestSchema>;

export const publishedListingStatusSchema = z.enum(['active', 'archived']);
export type PublishedListingStatus = z.infer<typeof publishedListingStatusSchema>;

/**
 * A published listing: active or archived, every required disclosure present. This is all a buyer
 * ever sees, and the only shape the catalogue returns.
 */
export const listingSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  status: publishedListingStatusSchema,
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
  publishedAt: z.iso.datetime(),
  archivedAt: z.iso.datetime().nullable(),
});
export type Listing = z.infer<typeof listingSchema>;

/**
 * Something that stops a draft from being published. `path` names the write-request field, in
 * the same dotted form as request validation errors, so a form can put the message on the field.
 */
export const listingIssueSchema = z.object({ path: z.string(), message: z.string() });
export type ListingIssue = z.infer<typeof listingIssueSchema>;

/** Whether a draft can be published now, and if not, every reason why (UC-005 step 6, UC-010). */
export const listingReadinessSchema = z.object({
  ready: z.boolean(),
  issues: z.array(listingIssueSchema),
});
export type ListingReadiness = z.infer<typeof listingReadinessSchema>;

/** A draft as its organization sees it. `null` means "not entered yet". Never shown to buyers. */
export const listingDraftSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  status: z.literal('draft'),
  title: z.string().nullable(),
  description: z.string().nullable(),
  specifications: z.object({
    brand: z.string().nullable(),
    model: z.string().nullable(),
    cpu: z.string().nullable(),
    ramGb: z.number().int().nullable(),
    storageType: storageTypeSchema.nullable(),
    storageGb: z.number().int().nullable(),
    screenSizeInches: z.number().nullable(),
  }),
  condition: z.object({
    grade: conditionGradeSchema.nullable(),
    guarantees: z.object({
      batteryHealthMinPercent: z.number().int().nullable(),
      batteryCycleMin: z.number().int().nullable(),
      batteryCycleMax: z.number().int().nullable(),
    }),
    knownDefects: z.string().nullable(),
  }),
  price: moneySchema.nullable(),
  totalQuantity: z.number().int().nullable(),
  fulfillmentExpectations: z.string().nullable(),
  readiness: listingReadinessSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ListingDraft = z.infer<typeof listingDraftSchema>;

/**
 * A listing in any status, as its own organization and marketplace staff see it. Tell the shapes
 * apart by `status`: a draft may be incomplete, a published listing never is.
 */
export const sellerListingSchema = z.discriminatedUnion('status', [
  listingDraftSchema,
  listingSchema,
]);
export type SellerListing = z.infer<typeof sellerListingSchema>;

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

/** An organization's listings in every status (UC-010; operators through UC-003 A1). */
export const sellerListingListResponseSchema = z.object({
  items: z.array(sellerListingSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type SellerListingListResponse = z.infer<typeof sellerListingListResponseSchema>;

export const listingIdParamsSchema = z.object({ listingId: z.string().min(1) });
export type ListingIdParams = z.infer<typeof listingIdParamsSchema>;
