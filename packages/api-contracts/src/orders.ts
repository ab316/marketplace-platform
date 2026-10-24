import { z } from 'zod';

import { moneySchema, paginationQuerySchema } from './common.ts';
import { listingConditionSchema, listingSpecificationsSchema } from './listings.ts';

export const orderStatusSchema = z.enum(['awaiting_payment', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const cancellationReasonSchema = z.enum(['buyer_cancelled', 'expired']);
export type CancellationReason = z.infer<typeof cancellationReasonSchema>;

export const timelineEntryTypeSchema = z.enum(['order_created', 'order_cancelled']);
export type TimelineEntryType = z.infer<typeof timelineEntryTypeSchema>;

/**
 * What the buyer was promised when the order was created. Immutable, so later listing edits cannot
 * change it.
 */
export const listingSnapshotSchema = z.object({
  listingId: z.string(),
  title: z.string(),
  description: z.string(),
  specifications: listingSpecificationsSchema,
  condition: listingConditionSchema,
  price: moneySchema,
  fulfillmentExpectations: z.string(),
  sellerOrganizationId: z.string(),
  capturedAt: z.iso.datetime(),
});
export type ListingSnapshot = z.infer<typeof listingSnapshotSchema>;

export const orderTimelineEntrySchema = z.object({
  id: z.string(),
  sequence: z.number().int(),
  type: timelineEntryTypeSchema,
  occurredAt: z.iso.datetime(),
  actorUserId: z.string().nullable(),
  /** Plain-language answers to: what happened, and what happens next. */
  title: z.string(),
  description: z.string(),
  nextStep: z.string().nullable(),
});
export type OrderTimelineEntry = z.infer<typeof orderTimelineEntrySchema>;

export const orderSchema = z.object({
  id: z.string(),
  status: orderStatusSchema,
  buyerUserId: z.string(),
  sellerOrganizationId: z.string(),
  listingId: z.string(),
  /** Always one unit per order in UC-001. */
  quantity: z.literal(1),
  total: moneySchema,
  listingSnapshot: listingSnapshotSchema,
  createdAt: z.iso.datetime(),
  /** Unpaid orders release their reserved unit at this time. */
  expiresAt: z.iso.datetime(),
  cancelledAt: z.iso.datetime().nullable(),
  cancellationReason: cancellationReasonSchema.nullable(),
  timeline: z.array(orderTimelineEntrySchema),
});
export type Order = z.infer<typeof orderSchema>;

export const createOrderRequestSchema = z.object({
  listingId: z.string().min(1),
});
export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

export const orderIdParamsSchema = z.object({ orderId: z.string().min(1) });
export type OrderIdParams = z.infer<typeof orderIdParamsSchema>;

export const listOrdersQuerySchema = paginationQuerySchema;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const orderListResponseSchema = z.object({
  items: z.array(orderSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type OrderListResponse = z.infer<typeof orderListResponseSchema>;
