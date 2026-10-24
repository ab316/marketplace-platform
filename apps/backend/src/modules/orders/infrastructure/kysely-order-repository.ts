import type { Kysely, Selectable } from 'kysely';

import type { Database } from '../../../shared/infrastructure/database.ts';
import { OrderVersionConflictError, type OrderRepository } from '../application/ports.ts';
import { Order, type TimelineEntry } from '../domain/order.ts';
import type { OrderTimelineEntriesTable, OrdersTable } from './orders-tables.ts';

type OrderRow = Selectable<OrdersTable>;
type TimelineRow = Selectable<OrderTimelineEntriesTable>;

function toDomain(row: OrderRow, timelineRows: TimelineRow[]): Order {
  const timeline: TimelineEntry[] = timelineRows.map((entry) => ({
    id: entry.id,
    type: entry.type,
    message: entry.message,
    nextStep: entry.next_step,
    actorId: entry.actor_id,
    occurredAt: entry.occurred_at,
  }));

  return Order.fromProps({
    id: row.id,
    buyerId: row.buyer_id,
    sellerOrganizationId: row.seller_organization_id,
    status: row.status,
    cancellationReason: row.cancellation_reason,
    listingSnapshot: row.listing_snapshot,
    priceOre: row.price_ore,
    currency: row.currency,
    expiresAt: row.expires_at,
    version: row.version,
    createdAt: row.created_at,
    timeline,
  });
}

function timelineRowsFor(order: Order): TimelineRow[] {
  return order.props.timeline.map((entry) => ({
    id: entry.id,
    order_id: order.props.id,
    type: entry.type,
    message: entry.message,
    next_step: entry.nextStep,
    actor_id: entry.actorId,
    occurred_at: entry.occurredAt,
  }));
}

export function createKyselyOrderRepository(db: Kysely<Database>): OrderRepository {
  async function insertMissingTimelineEntries(order: Order): Promise<void> {
    const existing = await db
      .selectFrom('order_timeline_entries')
      .select('id')
      .where('order_id', '=', order.props.id)
      .execute();
    const existingIds = new Set(existing.map((row) => row.id));
    const missing = timelineRowsFor(order).filter((row) => !existingIds.has(row.id));
    if (missing.length > 0) {
      await db.insertInto('order_timeline_entries').values(missing).execute();
    }
  }

  return {
    async insert(order) {
      const p = order.props;
      await db
        .insertInto('orders')
        .values({
          id: p.id,
          listing_id: p.listingSnapshot.listingId,
          buyer_id: p.buyerId,
          seller_organization_id: p.sellerOrganizationId,
          status: p.status,
          cancellation_reason: p.cancellationReason,
          listing_snapshot: JSON.stringify(p.listingSnapshot),
          price_ore: p.priceOre,
          currency: p.currency,
          expires_at: p.expiresAt,
          version: p.version,
          created_at: p.createdAt,
        })
        .execute();
      await insertMissingTimelineEntries(order);
    },

    async update(order) {
      const currentVersion = order.props.version;
      const result = await db
        .updateTable('orders')
        .set({
          status: order.props.status,
          cancellation_reason: order.props.cancellationReason,
          version: currentVersion + 1,
        })
        .where('id', '=', order.props.id)
        .where('version', '=', currentVersion)
        .executeTakeFirst();

      if (result.numUpdatedRows === 0n) {
        throw new OrderVersionConflictError(order.props.id);
      }
      order.props.version = currentVersion + 1;
      await insertMissingTimelineEntries(order);
    },

    async findById(id) {
      const row = await db.selectFrom('orders').selectAll().where('id', '=', id).executeTakeFirst();
      if (!row) {
        return undefined;
      }
      const timelineRows = await db
        .selectFrom('order_timeline_entries')
        .selectAll()
        .where('order_id', '=', id)
        .orderBy('occurred_at', 'asc')
        .execute();
      return toDomain(row, timelineRows);
    },
  };
}
