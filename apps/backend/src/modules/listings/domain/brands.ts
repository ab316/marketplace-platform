/**
 * The curated marketplace brand list (P1-017; business rules, "Brand"). A listing's brand must be
 * one of these exact values before it can be published, and the buyer's brand filter offers the
 * same list (UC-006).
 *
 * Mirrors `CATALOGUE_BRANDS` in `@acme/api-contracts`, which the domain may not import; a unit test
 * fails if the two drift. When marketplace staff manage the list (idea 005, P2-024) this becomes a
 * port backed by stored configuration.
 */
export const LISTED_BRANDS: readonly string[] = [
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

const LISTED = new Set(LISTED_BRANDS);

export const isListedBrand = (brand: string): boolean => LISTED.has(brand);
