import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Incomplete listing drafts (P1-012; UC-005, UC-007, UC-008).
 *
 * Written by hand and reviewed deliberately (ADR-006).
 *
 * A draft may now be saved with any subset of its disclosures, so those columns become nullable.
 * Buyers are protected by the database, not only by the domain:
 *
 * - `listings_published_complete`: an active or archived listing has every required disclosure
 *   and a publication time. The battery cycle range stays optional.
 * - `listings_draft_holds_no_stock`: a draft never has reserved or sold units. Together with the
 *   first rule this keeps the no-oversell check meaningful, since `quantity_total` can only be
 *   NULL on a row that holds no stock.
 *
 * Existing CHECK constraints (price > 0, quantity >= 1, grade and storage type known, cycle range
 * ordered) already pass on NULL, so they keep applying to every value that is present.
 */
const DISCLOSURE_COLUMNS = [
  'title',
  'description',
  'brand',
  'model',
  'cpu',
  'ram_gb',
  'storage_type',
  'storage_gb',
  'screen_size_inches',
  'condition_grade',
  'battery_health_min_percent',
  'known_defects',
  'price_minor',
  'quantity_total',
  'fulfillment_expectations',
] as const;

const allPresent = (columns: readonly string[]) =>
  columns.map((column) => `${column} IS NOT NULL`).join(' AND ');

export function up(pgm: MigrationBuilder): void {
  for (const column of DISCLOSURE_COLUMNS) {
    pgm.alterColumn('listings', column, { notNull: false });
  }

  pgm.addConstraint('listings', 'listings_published_complete', {
    check: `status = 'draft' OR (${allPresent([...DISCLOSURE_COLUMNS, 'published_at'])})`,
  });
  pgm.addConstraint('listings', 'listings_draft_holds_no_stock', {
    check: "status <> 'draft' OR (quantity_reserved = 0 AND quantity_sold = 0)",
  });
}

/**
 * Restores the NOT NULL columns. Incomplete drafts cannot satisfy them, so they are deleted
 * first: a draft was never visible to buyers and no order can reference one. Acceptable before
 * the first release only; revisit if this migration is ever rolled back on real data.
 */
export function down(pgm: MigrationBuilder): void {
  pgm.dropConstraint('listings', 'listings_draft_holds_no_stock');
  pgm.dropConstraint('listings', 'listings_published_complete');

  pgm.sql(
    `DELETE FROM listings WHERE status = 'draft' AND NOT (${allPresent(DISCLOSURE_COLUMNS)})`
  );

  for (const column of DISCLOSURE_COLUMNS) {
    pgm.alterColumn('listings', column, { notNull: true });
  }
}
