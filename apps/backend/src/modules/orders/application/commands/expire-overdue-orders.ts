import type { Clock, IdGenerator } from '@acme/core-contracts';

import type { ListingReservations, OrderRepository } from '../ports.ts';

export interface ExpireOverdueOrdersCommand {
  /** Caps one sweep so a large backlog cannot monopolise the process. */
  readonly limit: number;
}

export interface ExpireOverdueOrdersResult {
  readonly expiredOrderIds: readonly string[];
  readonly failedOrderIds: readonly string[];
}

/**
 * Cancels unpaid orders past their reservation window and returns their units to stock (UC-001 A2).
 *
 * One failing order must not stop the sweep, so failures are collected and reported instead of
 * thrown; the next sweep retries them because the order is still overdue.
 */
export class ExpireOverdueOrders {
  readonly #orders: OrderRepository;
  readonly #reservations: ListingReservations;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;

  constructor(
    orders: OrderRepository,
    reservations: ListingReservations,
    clock: Clock,
    ids: IdGenerator
  ) {
    this.#orders = orders;
    this.#reservations = reservations;
    this.#clock = clock;
    this.#ids = ids;
  }

  async execute(command: ExpireOverdueOrdersCommand): Promise<ExpireOverdueOrdersResult> {
    const now = this.#clock.now();
    const overdue = await this.#orders.findExpired(now, command.limit);

    const expiredOrderIds: string[] = [];
    const failedOrderIds: string[] = [];

    for (const order of overdue) {
      try {
        order.cancel({
          reason: 'expired',
          actorUserId: null,
          now,
          timelineEntryId: this.#ids.next(),
        });

        // oxlint-disable-next-line no-await-in-loop -- one order at a time, so one failure cannot abort the sweep
        await this.#orders.save(order);
        // oxlint-disable-next-line no-await-in-loop -- release only after the order is cancelled
        await this.#reservations.release(order.listingId);
        expiredOrderIds.push(order.id);
      } catch {
        failedOrderIds.push(order.id);
      }
    }

    return { expiredOrderIds, failedOrderIds };
  }
}
