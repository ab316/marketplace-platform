import type { Kysely } from 'kysely';

import type { Database } from '../../../../shared/infrastructure/database/schema.ts';
import type { BuyerOrderCriteria, OrderPage, OrderRepository } from '../../application/ports.ts';
import { OrderConcurrencyError } from '../../domain/errors.ts';
import { Order, type TimelineEntry } from '../../domain/order.ts';
import {
  type OrderRowLike,
  toOrderRow,
  toOrderState,
  toTimelineEntry,
  toTimelineRows,
} from './order-mapper.ts';

export class PgOrderRepository implements OrderRepository {
  readonly #db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.#db = db;
  }

  async findById(orderId: string): Promise<Order | null> {
    const row = await this.#db
      .selectFrom('orders')
      .selectAll()
      .where('id', '=', orderId)
      .executeTakeFirst();

    if (row === undefined) {
      return null;
    }

    const timeline = await this.#loadTimeline([orderId]);
    return Order.restore(toOrderState(row, timeline.get(orderId) ?? []));
  }

  /**
   * An order and its first timeline entry are one aggregate, so they are written together. This is
   * a single-aggregate write, not the general transaction strategy, which ADR-007 leaves open.
   */
  async insert(order: Order): Promise<void> {
    await this.#db.transaction().execute(async (trx) => {
      await trx.insertInto('orders').values(toOrderRow(order)).execute();
      await trx.insertInto('order_timeline_entries').values(toTimelineRows(order)).execute();
    });
  }

  async save(order: Order): Promise<void> {
    await this.#db.transaction().execute(async (trx) => {
      const { id, version, ...columns } = toOrderRow(order);

      const result = await trx
        .updateTable('orders')
        .set({ ...columns, version: version + 1 })
        .where('id', '=', id)
        .where('version', '=', version)
        .executeTakeFirst();

      if (result.numUpdatedRows === 0n) {
        throw new OrderConcurrencyError(id);
      }

      // The timeline is append-only, so re-offering known entries is a no-op.
      await trx
        .insertInto('order_timeline_entries')
        .values(toTimelineRows(order))
        .onConflict((builder) => builder.columns(['order_id', 'sequence']).doNothing())
        .execute();
    });
  }

  async findByBuyer(criteria: BuyerOrderCriteria): Promise<OrderPage> {
    const base = this.#db.selectFrom('orders').where('buyer_user_id', '=', criteria.buyerUserId);

    const rows = await base
      .selectAll()
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(criteria.limit)
      .offset(criteria.offset)
      .execute();

    const counted = await base
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow();

    return { items: await this.#hydrate(rows), total: Number(counted.count) };
  }

  async findExpired(now: Date, limit: number): Promise<readonly Order[]> {
    const rows = await this.#db
      .selectFrom('orders')
      .selectAll()
      .where('status', '=', 'awaiting_payment')
      .where('expires_at', '<=', now)
      // A payment in progress protects the order (PD-0004 §2).
      .where((eb) =>
        eb.or([eb('payment_hold_until', 'is', null), eb('payment_hold_until', '<=', now)])
      )
      .orderBy('expires_at', 'asc')
      .limit(limit)
      .execute();

    return this.#hydrate(rows);
  }

  async #hydrate(rows: readonly OrderRowLike[]): Promise<Order[]> {
    if (rows.length === 0) {
      return [];
    }

    const timeline = await this.#loadTimeline(rows.map((row) => row.id));
    return rows.map((row) => Order.restore(toOrderState(row, timeline.get(row.id) ?? [])));
  }

  async #loadTimeline(orderIds: readonly string[]): Promise<Map<string, TimelineEntry[]>> {
    const rows = await this.#db
      .selectFrom('order_timeline_entries')
      .selectAll()
      .where('order_id', 'in', [...orderIds])
      .orderBy('sequence', 'asc')
      .execute();

    const grouped = new Map<string, TimelineEntry[]>();
    for (const row of rows) {
      const entries = grouped.get(row.order_id) ?? [];
      entries.push(toTimelineEntry(row));
      grouped.set(row.order_id, entries);
    }
    return grouped;
  }
}
