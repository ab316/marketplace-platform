import type { BuyerOrderCriteria, OrderPage, OrderRepository } from '../../application/ports.ts';
import { OrderConcurrencyError } from '../../domain/errors.ts';
import { Order, type OrderState } from '../../domain/order.ts';

/** Mirrors `ORDER BY created_at DESC, id DESC` in the Postgres repository. */
const byCreatedAtThenIdDescending = (left: OrderState, right: OrderState): number => {
  const timeDifference = right.createdAt.getTime() - left.createdAt.getTime();
  if (timeDifference !== 0) {
    return timeDifference;
  }
  if (left.id === right.id) {
    return 0;
  }
  return left.id < right.id ? 1 : -1;
};

/**
 * Process-local store used by the `memory` persistence mode and by tests, so the API can be
 * exercised without a database. It reproduces the optimistic-locking guard of the Postgres
 * repository; it does not reproduce SQL semantics.
 */
export class InMemoryOrderRepository implements OrderRepository {
  readonly #rows = new Map<string, OrderState>();

  findById(orderId: string): Promise<Order | null> {
    const state = this.#rows.get(orderId);
    return Promise.resolve(state === undefined ? null : Order.restore(state));
  }

  insert(order: Order): Promise<void> {
    this.#rows.set(order.id, order.state);
    return Promise.resolve();
  }

  save(order: Order): Promise<void> {
    const stored = this.#rows.get(order.id);
    if (stored === undefined || stored.version !== order.version) {
      return Promise.reject(new OrderConcurrencyError(order.id));
    }

    this.#rows.set(order.id, { ...order.state, version: order.version + 1 });
    return Promise.resolve();
  }

  findByBuyer(criteria: BuyerOrderCriteria): Promise<OrderPage> {
    const matched = [...this.#rows.values()]
      .filter((state) => state.buyerUserId === criteria.buyerUserId)
      .toSorted(byCreatedAtThenIdDescending);

    return Promise.resolve({
      items: matched
        .slice(criteria.offset, criteria.offset + criteria.limit)
        .map((state) => Order.restore(state)),
      total: matched.length,
    });
  }

  findExpired(now: Date, limit: number): Promise<readonly Order[]> {
    const matched = [...this.#rows.values()]
      .filter((state) => Order.restore(state).isExpiredAt(now))
      .toSorted((left, right) => left.expiresAt.getTime() - right.expiresAt.getTime())
      .slice(0, limit)
      .map((state) => Order.restore(state));

    return Promise.resolve(matched);
  }
}
