import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Phase 4 — simulated escrow payment (UC-004, PD-0004, ADR-009).
 *
 * Written by hand and reviewed deliberately (ADR-006). Money is SEK minor units in `bigint`.
 *
 * - Payments: payment attempts (one pending per order) and provider events for deduplication.
 * - Orders: the `paid_into_escrow` status, the payment hold, the frozen fee rate, and the new
 *   timeline entry types.
 * - Listings: a sold counter; reserved + sold never exceeds total.
 */
export function up(pgm: MigrationBuilder): void {
  // --- Payments ---------------------------------------------------------------------------------

  pgm.createTable('payment_attempts', {
    id: { type: 'text', primaryKey: true },
    order_id: { type: 'text', notNull: true, references: 'orders', onDelete: 'RESTRICT' },
    buyer_user_id: { type: 'text', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    amount_minor: { type: 'bigint', notNull: true },
    currency: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true },
    provider: { type: 'text', notNull: true },
    /** Only meaningful for the simulated provider (PD-0004 §9). */
    scenario: { type: 'text' },
    provider_reference: { type: 'text' },
    /** Frozen at success (PD-0004 §1); basis points. */
    fee_rate_bps: { type: 'integer' },
    failure_reason: { type: 'text' },
    version: { type: 'integer', notNull: true, default: 1 },
    started_at: { type: 'timestamptz', notNull: true },
    /** The payment hold (PD-0004 §2) ends here if the provider has not answered. */
    times_out_at: { type: 'timestamptz', notNull: true },
    resolved_at: { type: 'timestamptz' },
  });
  pgm.addConstraint('payment_attempts', 'payment_attempts_status_known', {
    check: "status IN ('pending', 'succeeded', 'failed', 'timed_out', 'reversed')",
  });
  pgm.addConstraint('payment_attempts', 'payment_attempts_scenario_known', {
    check: "scenario IS NULL OR scenario IN ('success', 'failure', 'timeout', 'duplicate_success')",
  });
  pgm.addConstraint('payment_attempts', 'payment_attempts_currency_supported', {
    check: "currency = 'SEK'",
  });
  pgm.addConstraint('payment_attempts', 'payment_attempts_amount_positive', {
    check: 'amount_minor > 0',
  });
  pgm.addConstraint('payment_attempts', 'payment_attempts_fee_rate_range', {
    check: 'fee_rate_bps IS NULL OR (fee_rate_bps >= 0 AND fee_rate_bps <= 10000)',
  });
  pgm.addConstraint('payment_attempts', 'payment_attempts_resolved_fields_consistent', {
    check: "(status = 'pending') = (resolved_at IS NULL)",
  });
  // UC-004 A6: at most one payment in progress per order, enforced by the database so two
  // simultaneous starts cannot both win.
  pgm.sql(`
    CREATE UNIQUE INDEX payment_attempts_one_pending_per_order
      ON payment_attempts (order_id) WHERE status = 'pending';
  `);
  pgm.createIndex('payment_attempts', ['order_id', 'started_at']);
  pgm.createIndex('payment_attempts', ['status', 'times_out_at']);

  /** One row per provider event id: the deduplication record for callbacks (UC-004 A3). */
  pgm.createTable('payment_provider_events', {
    provider: { type: 'text', notNull: true },
    provider_event_id: { type: 'text', notNull: true },
    attempt_id: { type: 'text', notNull: true },
    type: { type: 'text', notNull: true },
    received_at: { type: 'timestamptz', notNull: true },
  });
  pgm.addConstraint('payment_provider_events', 'payment_provider_events_pkey', {
    primaryKey: ['provider', 'provider_event_id'],
  });
  pgm.addConstraint('payment_provider_events', 'payment_provider_events_type_known', {
    check: "type IN ('succeeded', 'failed')",
  });

  // --- Orders -----------------------------------------------------------------------------------

  pgm.addColumns('orders', {
    /** While set and in the future, the expiry sweep leaves the order alone (PD-0004 §2). */
    payment_hold_until: { type: 'timestamptz' },
    paid_at: { type: 'timestamptz' },
    paid_by_attempt_id: { type: 'text' },
    fee_rate_bps: { type: 'integer' },
  });
  pgm.dropConstraint('orders', 'orders_status_known');
  pgm.addConstraint('orders', 'orders_status_known', {
    check: "status IN ('awaiting_payment', 'paid_into_escrow', 'cancelled')",
  });
  pgm.addConstraint('orders', 'orders_paid_fields_consistent', {
    check:
      "(status = 'paid_into_escrow') = (paid_at IS NOT NULL AND paid_by_attempt_id IS NOT NULL AND fee_rate_bps IS NOT NULL)",
  });
  pgm.addConstraint('orders', 'orders_fee_rate_range', {
    check: 'fee_rate_bps IS NULL OR (fee_rate_bps >= 0 AND fee_rate_bps <= 10000)',
  });
  // Supports the expiry sweep's "skip held orders" filter.
  pgm.createIndex('orders', ['status', 'payment_hold_until']);

  pgm.dropConstraint('order_timeline_entries', 'order_timeline_entries_type_known');
  pgm.addConstraint('order_timeline_entries', 'order_timeline_entries_type_known', {
    check:
      "type IN ('order_created', 'order_cancelled', 'payment_secured', 'payment_failed', 'payment_returned')",
  });

  // --- Listings ---------------------------------------------------------------------------------

  pgm.addColumns('listings', {
    quantity_sold: { type: 'integer', notNull: true, default: 0 },
  });
  pgm.dropConstraint('listings', 'listings_reserved_within_total');
  // The no-oversell invariant, now across reserved and sold units (PD-0004 §4).
  pgm.addConstraint('listings', 'listings_reserved_and_sold_within_total', {
    check:
      'quantity_reserved >= 0 AND quantity_sold >= 0 AND quantity_reserved + quantity_sold <= quantity_total',
  });
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropConstraint('listings', 'listings_reserved_and_sold_within_total');
  pgm.addConstraint('listings', 'listings_reserved_within_total', {
    check: 'quantity_reserved >= 0 AND quantity_reserved <= quantity_total',
  });
  pgm.dropColumns('listings', ['quantity_sold']);

  pgm.dropConstraint('order_timeline_entries', 'order_timeline_entries_type_known');
  pgm.addConstraint('order_timeline_entries', 'order_timeline_entries_type_known', {
    check: "type IN ('order_created', 'order_cancelled')",
  });

  pgm.dropIndex('orders', ['status', 'payment_hold_until']);
  pgm.dropConstraint('orders', 'orders_fee_rate_range');
  pgm.dropConstraint('orders', 'orders_paid_fields_consistent');
  pgm.dropConstraint('orders', 'orders_status_known');
  pgm.addConstraint('orders', 'orders_status_known', {
    check: "status IN ('awaiting_payment', 'cancelled')",
  });
  pgm.dropColumns('orders', [
    'payment_hold_until',
    'paid_at',
    'paid_by_attempt_id',
    'fee_rate_bps',
  ]);

  pgm.dropTable('payment_provider_events');
  pgm.dropTable('payment_attempts');
}
