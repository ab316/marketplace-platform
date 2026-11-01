/**
 * Static content for the catalogue-search mockups (`/mocks/catalog`, UC-006).
 *
 * Everything here is invented. The set is deliberately varied across the four filter axes —
 * brand, price, condition grade, memory — so the filtered and zero-result states can be staged
 * with data that behaves like a real catalogue, and dense enough (14 listings) to show what a
 * results grid looks like past one row.
 *
 * Shapes mirror the real listing contract (`packages/api-contracts` `listingSchema`) where the
 * card needs them, but stay a plain mock type: when the page becomes real this file is deleted
 * and the data comes from `src/data/`. Nothing outside `features/catalogue-mocks` may import it.
 */

/** Condition grades as the product defines them (UC-001): a letter plus a plain-language word. */
export type MockGrade = 'A' | 'B' | 'C';

export const GRADE_WORD: Record<MockGrade, string> = {
  A: 'Like new',
  B: 'Light wear',
  C: 'Visible wear',
};

/**
 * The curated marketplace brand list (UC-006 Q2) — also the brand filter's options.
 *
 * The common laptop manufacturers a Swedish refurbished catalogue actually carries, most-stocked
 * first. Business off-lease fleets (Lenovo, Dell, HP) dominate refurbished supply, which is why
 * they lead; the rest follow in rough order of how often they appear. Kept alphabetical after the
 * top three so the filter list stays scannable.
 *
 * Mock content: the real list is marketplace configuration, to be confirmed against seller stock
 * before launch (design spec open question).
 */
export const BRAND_OPTIONS = [
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
] as const;

export type MockListing = {
  readonly id: string;
  readonly title: string;
  readonly brand: (typeof BRAND_OPTIONS)[number];
  readonly model: string;
  readonly cpu: string;
  readonly ramGb: 8 | 16 | 32 | 64;
  readonly storage: string;
  readonly screenSizeInches: number;
  readonly grade: MockGrade;
  /** The guarantee floor shown on the card, e.g. "Battery health ≥ 90%". */
  readonly batteryHealthMinPercent: number;
  /** Minor units (öre), matching the SEK-only money rule. */
  readonly priceMinor: number;
  readonly sellerName: string;
  readonly publishedDaysAgo: number;
};

export const formatSek = (amountMinor: number): string =>
  new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);

export const listings: readonly MockListing[] = [
  {
    id: 'l-01',
    title: 'ThinkPad T14 Gen 3 — business workhorse',
    brand: 'Lenovo',
    model: 'ThinkPad T14 Gen 3',
    cpu: 'Ryzen 7 PRO 6850U',
    ramGb: 16,
    storage: '512 GB NVMe',
    screenSizeInches: 14,
    grade: 'A',
    batteryHealthMinPercent: 92,
    priceMinor: 789_900,
    sellerName: 'Nordic Refurb AB',
    publishedDaysAgo: 1,
  },
  {
    id: 'l-02',
    title: 'MacBook Air M2 in excellent shape',
    brand: 'Apple',
    model: 'MacBook Air (M2, 2022)',
    cpu: 'Apple M2',
    ramGb: 16,
    storage: '256 GB SSD',
    screenSizeInches: 13.6,
    grade: 'A',
    batteryHealthMinPercent: 90,
    priceMinor: 949_000,
    sellerName: 'Circular Computing',
    publishedDaysAgo: 2,
  },
  {
    id: 'l-03',
    title: 'Dell Latitude 7430 — fleet off-lease',
    brand: 'Dell',
    model: 'Latitude 7430',
    cpu: 'Core i7-1265U',
    ramGb: 16,
    storage: '512 GB NVMe',
    screenSizeInches: 14,
    grade: 'B',
    batteryHealthMinPercent: 85,
    priceMinor: 619_000,
    sellerName: 'ReTech Stockholm',
    publishedDaysAgo: 3,
  },
  {
    id: 'l-04',
    title: 'HP EliteBook 840 G9, barely used',
    brand: 'HP',
    model: 'EliteBook 840 G9',
    cpu: 'Core i5-1235U',
    ramGb: 16,
    storage: '256 GB NVMe',
    screenSizeInches: 14,
    grade: 'A',
    batteryHealthMinPercent: 93,
    priceMinor: 699_500,
    sellerName: 'Nordic Refurb AB',
    publishedDaysAgo: 4,
  },
  {
    id: 'l-05',
    title: 'Budget ThinkPad E15 for students',
    brand: 'Lenovo',
    model: 'ThinkPad E15 Gen 2',
    cpu: 'Core i3-1115G4',
    ramGb: 8,
    storage: '256 GB SSD',
    screenSizeInches: 15.6,
    grade: 'C',
    batteryHealthMinPercent: 78,
    priceMinor: 329_000,
    sellerName: 'ReTech Stockholm',
    publishedDaysAgo: 5,
  },
  {
    id: 'l-06',
    title: 'Dell XPS 15 creator machine',
    brand: 'Dell',
    model: 'XPS 15 9520',
    cpu: 'Core i7-12700H',
    ramGb: 32,
    storage: '1 TB NVMe',
    screenSizeInches: 15.6,
    grade: 'B',
    batteryHealthMinPercent: 84,
    priceMinor: 1_249_000,
    sellerName: 'Circular Computing',
    publishedDaysAgo: 6,
  },
  {
    id: 'l-07',
    title: 'MacBook Pro 14 M1 Pro — power to spare',
    brand: 'Apple',
    model: 'MacBook Pro 14 (M1 Pro, 2021)',
    cpu: 'Apple M1 Pro',
    ramGb: 32,
    storage: '512 GB SSD',
    screenSizeInches: 14.2,
    grade: 'B',
    batteryHealthMinPercent: 87,
    priceMinor: 1_399_000,
    sellerName: 'Mac Second Life',
    publishedDaysAgo: 7,
  },
  {
    id: 'l-08',
    title: 'Asus ZenBook 14 OLED ultraportable',
    brand: 'Asus',
    model: 'ZenBook 14 UX3402',
    cpu: 'Core i5-1240P',
    ramGb: 16,
    storage: '512 GB NVMe',
    screenSizeInches: 14,
    grade: 'A',
    batteryHealthMinPercent: 91,
    priceMinor: 579_000,
    sellerName: 'ReTech Stockholm',
    publishedDaysAgo: 8,
  },
  {
    id: 'l-09',
    title: 'Acer Aspire 5 — honest daily driver',
    brand: 'Acer',
    model: 'Aspire 5 A515',
    cpu: 'Ryzen 5 5500U',
    ramGb: 8,
    storage: '256 GB SSD',
    screenSizeInches: 15.6,
    grade: 'C',
    batteryHealthMinPercent: 75,
    priceMinor: 279_000,
    sellerName: 'Budget Bytes AB',
    publishedDaysAgo: 9,
  },
  {
    id: 'l-10',
    title: 'ThinkPad X1 Carbon Gen 10 executive',
    brand: 'Lenovo',
    model: 'ThinkPad X1 Carbon Gen 10',
    cpu: 'Core i7-1260P',
    ramGb: 32,
    storage: '1 TB NVMe',
    screenSizeInches: 14,
    grade: 'A',
    batteryHealthMinPercent: 94,
    priceMinor: 1_149_000,
    sellerName: 'Nordic Refurb AB',
    publishedDaysAgo: 10,
  },
  {
    id: 'l-11',
    title: 'HP ProBook 450 G8 office laptop',
    brand: 'HP',
    model: 'ProBook 450 G8',
    cpu: 'Core i5-1135G7',
    ramGb: 8,
    storage: '512 GB SSD',
    screenSizeInches: 15.6,
    grade: 'B',
    batteryHealthMinPercent: 82,
    priceMinor: 429_000,
    sellerName: 'Budget Bytes AB',
    publishedDaysAgo: 12,
  },
  {
    id: 'l-12',
    title: 'Dell Precision 5570 mobile workstation',
    brand: 'Dell',
    model: 'Precision 5570',
    cpu: 'Core i9-12900H',
    ramGb: 64,
    storage: '2 TB NVMe',
    screenSizeInches: 15.6,
    grade: 'B',
    batteryHealthMinPercent: 83,
    priceMinor: 1_899_000,
    sellerName: 'Circular Computing',
    publishedDaysAgo: 13,
  },
  {
    id: 'l-13',
    title: 'Asus ROG Zephyrus G14 gaming compact',
    brand: 'Asus',
    model: 'ROG Zephyrus G14',
    cpu: 'Ryzen 9 6900HS',
    ramGb: 32,
    storage: '1 TB NVMe',
    screenSizeInches: 14,
    grade: 'B',
    batteryHealthMinPercent: 80,
    priceMinor: 1_349_000,
    sellerName: 'ReTech Stockholm',
    publishedDaysAgo: 14,
  },
  {
    id: 'l-14',
    title: 'MacBook Air M1 — the value pick',
    brand: 'Apple',
    model: 'MacBook Air (M1, 2020)',
    cpu: 'Apple M1',
    ramGb: 8,
    storage: '256 GB SSD',
    screenSizeInches: 13.3,
    grade: 'B',
    batteryHealthMinPercent: 86,
    priceMinor: 619_000,
    sellerName: 'Mac Second Life',
    publishedDaysAgo: 16,
  },
];

/**
 * The staged "filtered" state: Lenovo or Dell, 16 GB+, grade B or better, max 12 000 kr —
 * chosen because it exercises every filter axis at once and still returns a believable grid.
 */
export const filteredListings: readonly MockListing[] = listings.filter(
  (l) =>
    (l.brand === 'Lenovo' || l.brand === 'Dell') &&
    l.ramGb >= 16 &&
    (l.grade === 'A' || l.grade === 'B') &&
    l.priceMinor <= 1_200_000
);
