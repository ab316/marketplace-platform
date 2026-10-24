/**
 * UC-001: listings (pooled stock) and orders (awaiting payment / cancelled)
 * with the order timeline. Draft listings may be incomplete, so disclosure
 * columns are nullable; publishing is validated in the domain.
 */

export const up = (pgm) => {
  pgm.createTable('listings', {
    id: { type: 'uuid', primaryKey: true },
    organization_id: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, check: "status IN ('draft', 'active', 'archived')" },
    title: { type: 'text' },
    description: { type: 'text' },
    brand: { type: 'text' },
    model: { type: 'text' },
    cpu: { type: 'text' },
    ram: { type: 'text' },
    storage: { type: 'text' },
    screen_size: { type: 'text' },
    condition_grade: { type: 'text', check: "condition_grade IN ('A', 'B', 'C')" },
    condition_guarantees: { type: 'jsonb' },
    known_defects: { type: 'text' },
    price_ore: { type: 'integer', check: 'price_ore > 0' },
    currency: { type: 'text', notNull: true, default: 'SEK' },
    quantity: { type: 'integer', check: 'quantity >= 1' },
    quantity_available: {
      type: 'integer',
      notNull: true,
      default: 0,
      check: 'quantity_available >= 0',
    },
    fulfillment_expectations: { type: 'text' },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true },
  });
  pgm.createIndex('listings', ['status', 'created_at']);

  pgm.createTable('orders', {
    id: { type: 'uuid', primaryKey: true },
    listing_id: { type: 'uuid', notNull: true, references: 'listings' },
    buyer_id: { type: 'text', notNull: true },
    seller_organization_id: { type: 'text', notNull: true },
    status: { type: 'text', notNull: true, check: "status IN ('awaiting_payment', 'cancelled')" },
    cancellation_reason: {
      type: 'text',
      check: "cancellation_reason IN ('buyer_cancelled', 'expired')",
    },
    listing_snapshot: { type: 'jsonb', notNull: true },
    price_ore: { type: 'integer', notNull: true, check: 'price_ore > 0' },
    currency: { type: 'text', notNull: true, default: 'SEK' },
    expires_at: { type: 'timestamptz', notNull: true },
    version: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true },
  });
  pgm.createIndex('orders', ['buyer_id', 'created_at']);
  pgm.createIndex('orders', ['status', 'expires_at']);

  pgm.createTable('order_timeline_entries', {
    id: { type: 'uuid', primaryKey: true },
    order_id: { type: 'uuid', notNull: true, references: 'orders' },
    type: { type: 'text', notNull: true },
    message: { type: 'text', notNull: true },
    next_step: { type: 'text' },
    actor_id: { type: 'text' },
    occurred_at: { type: 'timestamptz', notNull: true },
  });
  pgm.createIndex('order_timeline_entries', ['order_id', 'occurred_at']);
};

export const down = (pgm) => {
  pgm.dropTable('order_timeline_entries');
  pgm.dropTable('orders');
  pgm.dropTable('listings');
};
