import { z } from 'zod';

export const conditionGradeSchema = z.enum(['A', 'B', 'C']);
export type ConditionGrade = z.infer<typeof conditionGradeSchema>;

// Structured condition guarantees for pooled-stock listings (UC-001).
// The shape is expected to evolve; keep fields optional and additive.
export const conditionGuaranteesSchema = z.object({
  batteryHealthMinPercent: z.number().int().min(0).max(100).optional(),
  batteryCycleCountMax: z.number().int().min(0).optional(),
});
export type ConditionGuarantees = z.infer<typeof conditionGuaranteesSchema>;

const listingFieldsSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  cpu: z.string().min(1).max(100),
  ram: z.string().min(1).max(50),
  storage: z.string().min(1).max(100),
  screenSize: z.string().min(1).max(50),
  conditionGrade: conditionGradeSchema,
  conditionGuarantees: conditionGuaranteesSchema,
  knownDefects: z.string().min(1).max(2000),
  priceOre: z.number().int().positive(),
  quantity: z.number().int().min(1),
  fulfillmentExpectations: z.string().min(1).max(2000),
});

export const createListingDraftRequestSchema = listingFieldsSchema.partial().extend({
  title: z.string().min(1).max(200),
});
export type CreateListingDraftRequest = z.infer<typeof createListingDraftRequestSchema>;

export const updateListingDraftRequestSchema = listingFieldsSchema.partial();
export type UpdateListingDraftRequest = z.infer<typeof updateListingDraftRequestSchema>;

export const listingStatusSchema = z.enum(['draft', 'active', 'archived']);
export type ListingStatus = z.infer<typeof listingStatusSchema>;

export const listingResponseSchema = listingFieldsSchema.partial().extend({
  id: z.string(),
  organizationId: z.string(),
  status: listingStatusSchema,
  currency: z.literal('SEK'),
  quantityAvailable: z.number().int().min(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ListingResponse = z.infer<typeof listingResponseSchema>;

export const browseListingsQuerySchema = z.object({
  search: z.string().max(200).optional(),
});
export type BrowseListingsQuery = z.infer<typeof browseListingsQuerySchema>;

export const browseListingsResponseSchema = z.object({
  listings: z.array(listingResponseSchema),
});
export type BrowseListingsResponse = z.infer<typeof browseListingsResponseSchema>;
