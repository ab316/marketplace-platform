import type { JSONColumnType } from 'kysely';

import type {
  CancellationReason,
  ListingSnapshot,
  OrderStatus,
  TimelineEntryType,
} from '../domain/order.ts';

export type OrdersTable = {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_organization_id: string;
  status: OrderStatus;
  cancellation_reason: CancellationReason | null;
  listing_snapshot: JSONColumnType<ListingSnapshot>;
  price_ore: number;
  currency: 'SEK';
  expires_at: Date;
  version: number;
  created_at: Date;
};

export type OrderTimelineEntriesTable = {
  id: string;
  order_id: string;
  type: TimelineEntryType;
  message: string;
  next_step: string | null;
  actor_id: string | null;
  occurred_at: Date;
};
