import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * UC-001 schema: pooled-stock laptop listings, single-unit orders, and the order timeline.
 *
 * Written by hand and reviewed deliberately (ADR-006). Money is stored as SEK minor units in
 * `bigint`; never as a floating-point type.
 */
export function up(pgm: MigrationBuilder): void {
  pgm.createTable('listings', {
    id: { type: 'text', primaryKey: true },
    organization_id: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true },
    title: { type: 'text', notNull: true },
    description: { type: 'text', notNull: true },
    brand: { type: 'text', notNull: true },
    model: { type: 'text', notNull: true },
    cpu: { type: 'text', notNull: true },
    ram_gb: { type: 'integer', notNull: true },
    storage_type: { type: 'text', notNull: true },
    storage_gb: { type: 'integer', notNull: true },
    screen_size_inches: { type: 'double precision', notNull: true },
    condition_grade: { type: 'text', notNull: true },
    battery_health_min_percent: { type: 'integer', notNull: true },
    battery_cycle_min: { type: 'integer' },
    battery_cycle_max: { type: 'integer' },
    known_defects: { type: 'text', notNull: true },
    price_minor: { type: 'bigint', notNull: true },
    currency: { type: 'text', notNull: true },
    quantity_total: { type: 'integer', notNull: true },
    quantity_reserved: { type: 'integer', notNull: true, default: 0 },
    fulfillment_expectations: { type: 'text', notNull: true },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true },
    published_at: { type: 'timestamptz' },
    archived_at: { type: 'timestamptz' },
  });

  pgm.addConstraint('listings', 'listings_status_known', {
    check: "status IN ('draft', 'active', 'archived')",
  });
  pgm.addConstraint('listings', 'listings_condition_grade_known', {
    check: "condition_grade IN ('A', 'B', 'C')",
  });
  pgm.addConstraint('listings', 'listings_storage_type_known', {
    check: "storage_type IN ('ssd', 'nvme', 'hdd')",
  });
  pgm.addConstraint('listings', 'listings_currency_supported', {
    check: "currency = 'SEK'",
  });
  pgm.addConstraint('listings', 'listings_price_positive', {
    check: 'price_minor > 0',
  });
  pgm.addConstraint('listings', 'listings_battery_cycle_range_ordered', {
    check:
      'battery_cycle_min IS NULL OR battery_cycle_max IS NULL OR battery_cycle_min <= battery_cycle_max',
  });
  // The no-oversell invariant, enforced by the database itself.
  pgm.addConstraint('listings', 'listings_reserved_within_total', {
    check: 'quantity_reserved >= 0 AND quantity_reserved <= quantity_total',
  });
  pgm.addConstraint('listings', 'listings_quantity_total_positive', {
    check: 'quantity_total >= 1',
  });

  pgm.createIndex('listings', ['status', 'published_at']);
  pgm.createIndex('listings', 'organization_id');

  pgm.createTable('orders', {
    id: { type: 'text', primaryKey: true },
    buyer_user_id: { type: 'text', notNull: true },
    listing_id: { type: 'text', notNull: true, references: 'listings', onDelete: 'RESTRICT' },
    seller_organization_id: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true },
    cancellation_reason: { type: 'text' },
    total_minor: { type: 'bigint', notNull: true },
    currency: { type: 'text', notNull: true },
    /** Immutable copy of what the buyer was promised. */
    listing_snapshot: { type: 'jsonb', notNull: true },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    cancelled_at: { type: 'timestamptz' },
  });

  pgm.addConstraint('orders', 'orders_status_known', {
    check: "status IN ('awaiting_payment', 'cancelled')",
  });
  pgm.addConstraint('orders', 'orders_cancellation_reason_known', {
    check: "cancellation_reason IS NULL OR cancellation_reason IN ('buyer_cancelled', 'expired')",
  });
  pgm.addConstraint('orders', 'orders_cancelled_fields_consistent', {
    check: "(status = 'cancelled') = (cancelled_at IS NOT NULL)",
  });
  pgm.addConstraint('orders', 'orders_currency_supported', {
    check: "currency = 'SEK'",
  });
  pgm.addConstraint('orders', 'orders_total_positive', {
    check: 'total_minor > 0',
  });

  pgm.createIndex('orders', ['buyer_user_id', 'created_at']);
  pgm.createIndex('orders', 'seller_organization_id');
  // Supports the reservation-expiry sweep.
  pgm.createIndex('orders', ['status', 'expires_at']);

  pgm.createTable('order_timeline_entries', {
    id: { type: 'text', primaryKey: true },
    order_id: { type: 'text', notNull: true, references: 'orders', onDelete: 'CASCADE' },
    sequence: { type: 'integer', notNull: true },
    type: { type: 'text', notNull: true },
    actor_user_id: { type: 'text' },
    occurred_at: { type: 'timestamptz', notNull: true },
    details: { type: 'jsonb', notNull: true, default: '{}' },
  });

  pgm.addConstraint('order_timeline_entries', 'order_timeline_entries_type_known', {
    check: "type IN ('order_created', 'order_cancelled')",
  });
  // Append-only ordering: one entry per position, so a replayed write cannot duplicate history.
  pgm.addConstraint('order_timeline_entries', 'order_timeline_entries_sequence_unique', {
    unique: ['order_id', 'sequence'],
  });
  pgm.addConstraint('order_timeline_entries', 'order_timeline_entries_sequence_positive', {
    check: 'sequence >= 1',
  });
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropTable('order_timeline_entries');
  pgm.dropTable('orders');
  pgm.dropTable('listings');
}
