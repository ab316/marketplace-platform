import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Brand from the curated list (P1-017; seller listing management spec D12).
 *
 * Written by hand and reviewed deliberately (ADR-006).
 *
 * Brand used to be free text. One pass maps every brand that matches a curated value apart from
 * capitalization and surrounding spaces ("lenovo", "LENOVO ") to that value. Anything else is
 * left untouched: nothing has been released, so such rows are local or test data. A draft
 * holding one cannot be published until a listed brand is chosen, and the write contract refuses
 * new off-list values. No database rule on brand values is added because the list is expected
 * to move to marketplace staff (idea 005).
 *
 * The list is copied here on purpose: a migration must keep meaning what it meant when it ran.
 */
const BRANDS = [
  'Lenovo',
  'Dell',
  'HP',
  'Apple',
  'Acer',
  'Asus',
  'Fujitsu',
  'Huawei',
  'LG',
  'Microsoft',
  'MSI',
  'Razer',
  'Samsung',
  'Toshiba',
];

/** The one statement this migration runs; exported so a test can run it against real rows. */
export const canonicalBrandsSql = (): string => {
  const values = BRANDS.map((brand) => `('${brand}')`).join(', ');
  return `
    UPDATE listings
    SET brand = canonical.name
    FROM (VALUES ${values}) AS canonical(name)
    WHERE lower(btrim(listings.brand)) = lower(canonical.name)
      AND listings.brand <> canonical.name
  `;
};

export function up(pgm: MigrationBuilder): void {
  pgm.sql(canonicalBrandsSql());
}

/** Irreversible by nature: the original spellings are not kept. Rolling back changes nothing. */
export function down(): void {}
