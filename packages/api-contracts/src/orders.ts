import { z } from 'zod';

import { moneySchema, paginationQuerySchema } from './common.ts';
import { listingConditionSchema, listingSpecificationsSchema } from './listings.ts';

export const orderStatusSchema = z.enum(['awaiting_payment', 'paid_into_escrow', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const cancellationReasonSchema = z.enum(['buyer_cancelled', 'expired']);
export type CancellationReason = z.infer<typeof cancellationReasonSchema>;

export const timelineEntryTypeSchema = z.enum([
  'order_created',
  'order_cancelled',
  'payment_secured',
  'payment_failed',
  'payment_returned',
]);
export type TimelineEntryType = z.infer<typeof timelineEntryTypeSchema>;

/** Where payment stands, in the buyer's terms (UC-004). */
export const orderPaymentStatusSchema = z.enum([
  'none',
  'in_progress',
  'paid',
  'failed',
  'returned',
]);
export type OrderPaymentStatus = z.infer<typeof orderPaymentStatusSchema>;

export const orderPaymentSchema = z.object({
  status: orderPaymentStatusSchema,
  /** While set, a payment is in progress and the order will not expire (PD-0004 §2). */
  holdUntil: z.iso.datetime().nullable(),
  paidAt: z.iso.datetime().nullable(),
  /** The payment attempt that paid the order, once paid. */
  attemptId: z.string().nullable(),
  /** Marketplace fee rate frozen at payment, in basis points (PD-0004 §1). */
  feeRateBps: z.number().int().nullable(),
});
export type OrderPayment = z.infer<typeof orderPaymentSchema>;

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
  payment: orderPaymentSchema,
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
