import { Money } from '@acme/core-domain';
import type { Insertable, Kysely, Selectable } from 'kysely';

import { readEnum } from '../../../../shared/infrastructure/database/row-values.ts';
import type {
  Database,
  PaymentAttemptsTable,
} from '../../../../shared/infrastructure/database/schema.ts';
import type { PaymentAttemptRepository, ProviderEventRecord } from '../../application/ports.ts';
import { PaymentConcurrencyError, PaymentInProgressError } from '../../domain/errors.ts';
import {
  PAYMENT_ATTEMPT_STATUSES,
  PAYMENT_SCENARIOS,
  PaymentAttempt,
} from '../../domain/payment-attempt.ts';

const PG_UNIQUE_VIOLATION = '23505';

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === PG_UNIQUE_VIOLATION;

const toAttempt = (row: Selectable<PaymentAttemptsTable>): PaymentAttempt =>
  PaymentAttempt.restore({
    id: row.id,
    orderId: row.order_id,
    buyerUserId: row.buyer_user_id,
    amount: Money.fromMinor(row.amount_minor, row.currency),
    status: readEnum(PAYMENT_ATTEMPT_STATUSES, row.status, 'payment_attempts.status'),
    provider: row.provider,
    scenario:
      row.scenario === null
        ? null
        : readEnum(PAYMENT_SCENARIOS, row.scenario, 'payment_attempts.scenario'),
    providerReference: row.provider_reference,
    feeRateBps: row.fee_rate_bps,
    failureReason: row.failure_reason,
    version: row.version,
    startedAt: row.started_at,
    timesOutAt: row.times_out_at,
    resolvedAt: row.resolved_at,
  });

const toRow = (attempt: PaymentAttempt): Insertable<PaymentAttemptsTable> => {
  const state = attempt.state;
  return {
    id: state.id,
    order_id: state.orderId,
    buyer_user_id: state.buyerUserId,
    amount_minor: state.amount.amountMinor,
    currency: state.amount.currency,
    status: state.status,
    provider: state.provider,
    scenario: state.scenario,
    provider_reference: state.providerReference,
    fee_rate_bps: state.feeRateBps,
    failure_reason: state.failureReason,
    version: state.version,
    started_at: state.startedAt,
    times_out_at: state.timesOutAt,
    resolved_at: state.resolvedAt,
  };
};

export class PgPaymentAttemptRepository implements PaymentAttemptRepository {
  readonly #db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.#db = db;
  }

  async findById(attemptId: string): Promise<PaymentAttempt | null> {
    const row = await this.#db
      .selectFrom('payment_attempts')
      .selectAll()
      .where('id', '=', attemptId)
      .executeTakeFirst();
    return row === undefined ? null : toAttempt(row);
  }

  /** The partial unique index on pending attempts is the one-attempt-per-order guard (UC-004 A6). */
  async insert(attempt: PaymentAttempt): Promise<void> {
    try {
      await this.#db.insertInto('payment_attempts').values(toRow(attempt)).execute();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new PaymentInProgressError(attempt.orderId);
      }
      throw error;
    }
  }

  async save(attempt: PaymentAttempt): Promise<void> {
    const { id, version, ...columns } = toRow(attempt);

    const result = await this.#db
      .updateTable('payment_attempts')
      .set({ ...columns, version: version + 1 })
      .where('id', '=', id)
      .where('version', '=', version)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      throw new PaymentConcurrencyError(id);
    }
  }

  async findByOrder(orderId: string): Promise<readonly PaymentAttempt[]> {
    const rows = await this.#db
      .selectFrom('payment_attempts')
      .selectAll()
      .where('order_id', '=', orderId)
      .orderBy('started_at', 'asc')
      .orderBy('id', 'asc')
      .execute();
    return rows.map(toAttempt);
  }

  async findOverdue(now: Date, limit: number): Promise<readonly PaymentAttempt[]> {
    const rows = await this.#db
      .selectFrom('payment_attempts')
      .selectAll()
      .where('status', '=', 'pending')
      .where('times_out_at', '<=', now)
      .orderBy('times_out_at', 'asc')
      .limit(limit)
      .execute();
    return rows.map(toAttempt);
  }

  async recordProviderEvent(event: ProviderEventRecord): Promise<boolean> {
    const result = await this.#db
      .insertInto('payment_provider_events')
      .values({
        provider: event.provider,
        provider_event_id: event.providerEventId,
        attempt_id: event.attemptId,
        type: event.type,
        received_at: event.receivedAt,
      })
      .onConflict((builder) => builder.columns(['provider', 'provider_event_id']).doNothing())
      .executeTakeFirst();
    return (result.numInsertedOrUpdatedRows ?? 0n) > 0n;
  }
}
