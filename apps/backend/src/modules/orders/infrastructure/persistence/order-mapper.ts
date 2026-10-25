import { Money } from '@acme/core-domain';
import { z } from 'zod';

import { readEnum, readJsonObject } from '../../../../shared/infrastructure/database/row-values.ts';
import type { ListingSnapshot } from '../../domain/listing-snapshot.ts';
import type {
  CancellationReason,
  Order,
  OrderState,
  OrderStatus,
  TimelineEntry,
  TimelineEntryType,
} from '../../domain/order.ts';

const ORDER_STATUSES: readonly OrderStatus[] = [
  'awaiting_payment',
  'paid_into_escrow',
  'cancelled',
];
const CANCELLATION_REASONS: readonly CancellationReason[] = ['buyer_cancelled', 'expired'];
const TIMELINE_ENTRY_TYPES: readonly TimelineEntryType[] = [
  'order_created',
  'order_cancelled',
  'payment_secured',
  'payment_failed',
  'payment_returned',
];

/**
 * Shape of the `listing_snapshot` jsonb column: money is plain data and timestamps are ISO
 * strings. It is validated on read, because the database cannot enforce the structure of jsonb and
 * the snapshot is what the buyer was promised.
 */
const storedSnapshotSchema = z.object({
  listingId: z.string(),
  sellerOrganizationId: z.string(),
  title: z.string(),
  description: z.string(),
  specifications: z.object({
    brand: z.string(),
    model: z.string(),
    cpu: z.string(),
    ramGb: z.number(),
    storageType: z.enum(['ssd', 'nvme', 'hdd']),
    storageGb: z.number(),
    screenSizeInches: z.number(),
  }),
  condition: z.object({
    grade: z.enum(['A', 'B', 'C']),
    guarantees: z.object({
      batteryHealthMinPercent: z.number(),
      batteryCycleMin: z.number().optional(),
      batteryCycleMax: z.number().optional(),
    }),
    knownDefects: z.string(),
  }),
  price: z.object({ amountMinor: z.number(), currency: z.string() }),
  fulfillmentExpectations: z.string(),
  capturedAt: z.string(),
});

export type StoredSnapshot = z.infer<typeof storedSnapshotSchema>;

export const toStoredSnapshot = (snapshot: ListingSnapshot): StoredSnapshot => ({
  listingId: snapshot.listingId,
  sellerOrganizationId: snapshot.sellerOrganizationId,
  title: snapshot.title,
  description: snapshot.description,
  specifications: snapshot.specifications,
  condition: snapshot.condition,
  price: snapshot.price.toJSON(),
  fulfillmentExpectations: snapshot.fulfillmentExpectations,
  capturedAt: snapshot.capturedAt.toISOString(),
});

export const fromStoredSnapshot = (value: unknown): ListingSnapshot => {
  const stored = storedSnapshotSchema.parse(value);

  return {
    listingId: stored.listingId,
    sellerOrganizationId: stored.sellerOrganizationId,
    title: stored.title,
    description: stored.description,
    specifications: stored.specifications,
    condition: stored.condition,
    price: Money.fromMinor(stored.price.amountMinor, stored.price.currency),
    fulfillmentExpectations: stored.fulfillmentExpectations,
    capturedAt: new Date(stored.capturedAt),
  };
};

export interface OrderRowLike {
  readonly id: string;
  readonly buyer_user_id: string;
  readonly listing_id: string;
  readonly seller_organization_id: string;
  readonly status: string;
  readonly cancellation_reason: string | null;
  readonly total_minor: number;
  readonly currency: string;
  readonly listing_snapshot: unknown;
  readonly version: number;
  readonly created_at: Date;
  readonly expires_at: Date;
  readonly cancelled_at: Date | null;
  readonly payment_hold_until: Date | null;
  readonly paid_at: Date | null;
  readonly paid_by_attempt_id: string | null;
  readonly fee_rate_bps: number | null;
}

export interface TimelineRowLike {
  readonly id: string;
  readonly order_id: string;
  readonly sequence: number;
  readonly type: string;
  readonly actor_user_id: string | null;
  readonly occurred_at: Date;
  readonly details: unknown;
}

export const toTimelineEntry = (row: TimelineRowLike): TimelineEntry => ({
  id: row.id,
  sequence: row.sequence,
  type: readEnum(TIMELINE_ENTRY_TYPES, row.type, 'order_timeline_entries.type'),
  occurredAt: row.occurred_at,
  actorUserId: row.actor_user_id,
  details: readJsonObject(row.details),
});

export const toOrderState = (
  row: OrderRowLike,
  timeline: readonly TimelineEntry[]
): OrderState => ({
  id: row.id,
  buyerUserId: row.buyer_user_id,
  listingId: row.listing_id,
  sellerOrganizationId: row.seller_organization_id,
  status: readEnum(ORDER_STATUSES, row.status, 'orders.status'),
  cancellationReason:
    row.cancellation_reason === null
      ? null
      : readEnum(CANCELLATION_REASONS, row.cancellation_reason, 'orders.cancellation_reason'),
  total: Money.fromMinor(row.total_minor, row.currency),
  listingSnapshot: fromStoredSnapshot(row.listing_snapshot),
  timeline: timeline.toSorted((left, right) => left.sequence - right.sequence),
  version: row.version,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  cancelledAt: row.cancelled_at,
  paymentHoldUntil: row.payment_hold_until,
  paidAt: row.paid_at,
  paidByAttemptId: row.paid_by_attempt_id,
  feeRateBps: row.fee_rate_bps,
});

export const toOrderRow = (order: Order) => {
  const state = order.state;
  return {
    id: state.id,
    buyer_user_id: state.buyerUserId,
    listing_id: state.listingId,
    seller_organization_id: state.sellerOrganizationId,
    status: state.status,
    cancellation_reason: state.cancellationReason,
    total_minor: state.total.amountMinor,
    currency: state.total.currency,
    listing_snapshot: JSON.stringify(toStoredSnapshot(state.listingSnapshot)),
    version: state.version,
    created_at: state.createdAt,
    expires_at: state.expiresAt,
    cancelled_at: state.cancelledAt,
    payment_hold_until: state.paymentHoldUntil,
    paid_at: state.paidAt,
    paid_by_attempt_id: state.paidByAttemptId,
    fee_rate_bps: state.feeRateBps,
  };
};

export const toTimelineRows = (order: Order) =>
  order.state.timeline.map((entry) => ({
    id: entry.id,
    order_id: order.id,
    sequence: entry.sequence,
    type: entry.type,
    actor_user_id: entry.actorUserId,
    occurred_at: entry.occurredAt,
    details: JSON.stringify(entry.details),
  }));
