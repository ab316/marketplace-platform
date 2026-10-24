import { z } from 'zod';

import { conditionGradeSchema, conditionGuaranteesSchema } from './listings.ts';

export const createOrderRequestSchema = z.object({
  listingId: z.string().min(1),
});
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

export const orderStatusSchema = z.enum(['awaiting_payment', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const cancellationReasonSchema = z.enum(['buyer_cancelled', 'expired']);
export type CancellationReason = z.infer<typeof cancellationReasonSchema>;

// Immutable snapshot of what the buyer was promised at order time (UC-001 B5).
export const listingSnapshotSchema = z.object({
  listingId: z.string(),
  title: z.string(),
  description: z.string(),
  brand: z.string(),
  model: z.string(),
  cpu: z.string(),
  ram: z.string(),
  storage: z.string(),
  screenSize: z.string(),
  conditionGrade: conditionGradeSchema,
  conditionGuarantees: conditionGuaranteesSchema,
  knownDefects: z.string(),
  priceOre: z.number().int().positive(),
  currency: z.literal('SEK'),
  fulfillmentExpectations: z.string(),
});
export type ListingSnapshot = z.infer<typeof listingSnapshotSchema>;

export const timelineEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['order_created', 'order_cancelled']),
  message: z.string(),
  nextStep: z.string().nullable(),
  actorId: z.string().nullable(),
  occurredAt: z.string(),
});
export type TimelineEntry = z.infer<typeof timelineEntrySchema>;

export const orderResponseSchema = z.object({
  id: z.string(),
  buyerId: z.string(),
  sellerOrganizationId: z.string(),
  status: orderStatusSchema,
  cancellationReason: cancellationReasonSchema.nullable(),
  listingSnapshot: listingSnapshotSchema,
  priceOre: z.number().int().positive(),
  currency: z.literal('SEK'),
  expiresAt: z.string(),
  timeline: z.array(timelineEntrySchema),
  createdAt: z.string(),
});
export type OrderResponse = z.infer<typeof orderResponseSchema>;
