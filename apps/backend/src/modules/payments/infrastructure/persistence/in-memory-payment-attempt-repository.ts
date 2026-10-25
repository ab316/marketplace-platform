import type { PaymentAttemptRepository, ProviderEventRecord } from '../../application/ports.ts';
import { PaymentConcurrencyError, PaymentInProgressError } from '../../domain/errors.ts';
import { PaymentAttempt, type PaymentAttemptState } from '../../domain/payment-attempt.ts';

/** Process-local store for the `memory` persistence mode and tests. */
export class InMemoryPaymentAttemptRepository implements PaymentAttemptRepository {
  readonly #rows = new Map<string, PaymentAttemptState>();
  readonly #events = new Set<string>();

  findById(attemptId: string): Promise<PaymentAttempt | null> {
    const state = this.#rows.get(attemptId);
    return Promise.resolve(state === undefined ? null : PaymentAttempt.restore(state));
  }

  insert(attempt: PaymentAttempt): Promise<void> {
    const pendingForOrder = [...this.#rows.values()].some(
      (state) => state.orderId === attempt.orderId && state.status === 'pending'
    );
    if (pendingForOrder) {
      return Promise.reject(new PaymentInProgressError(attempt.orderId));
    }
    this.#rows.set(attempt.id, attempt.state);
    return Promise.resolve();
  }

  save(attempt: PaymentAttempt): Promise<void> {
    const stored = this.#rows.get(attempt.id);
    if (stored === undefined || stored.version !== attempt.version) {
      return Promise.reject(new PaymentConcurrencyError(attempt.id));
    }
    this.#rows.set(attempt.id, { ...attempt.state, version: attempt.version + 1 });
    return Promise.resolve();
  }

  findByOrder(orderId: string): Promise<readonly PaymentAttempt[]> {
    return Promise.resolve(
      [...this.#rows.values()]
        .filter((state) => state.orderId === orderId)
        .toSorted((left, right) => left.startedAt.getTime() - right.startedAt.getTime())
        .map((state) => PaymentAttempt.restore(state))
    );
  }

  findOverdue(now: Date, limit: number): Promise<readonly PaymentAttempt[]> {
    return Promise.resolve(
      [...this.#rows.values()]
        .filter(
          (state) => state.status === 'pending' && state.timesOutAt.getTime() <= now.getTime()
        )
        .toSorted((left, right) => left.timesOutAt.getTime() - right.timesOutAt.getTime())
        .slice(0, limit)
        .map((state) => PaymentAttempt.restore(state))
    );
  }

  recordProviderEvent(event: ProviderEventRecord): Promise<boolean> {
    const key = `${event.provider}:${event.providerEventId}`;
    if (this.#events.has(key)) {
      return Promise.resolve(false);
    }
    this.#events.add(key);
    return Promise.resolve(true);
  }
}
