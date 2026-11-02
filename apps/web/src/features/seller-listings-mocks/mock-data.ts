/**
 * Static content for the seller listing management mockups (`/mocks/seller-listings`, UC-007 and
 * UC-008).
 *
 * Everything here is invented. The set covers every listing status, and an active listing whose
 * stock is exhausted, so the list and detail states can be judged against data that behaves like a
 * real seller's catalogue. Shapes mirror the real listing contract (`packages/api-contracts`
 * `listingSchema`) where the pages need them, but stay a plain mock type: when the pages become
 * real this file is deleted and the data comes from `src/data/`. Nothing outside
 * `features/seller-listings-mocks` may import it.
 */

export type MockStatus = 'draft' | 'active' | 'archived';
export type MockGrade = 'A' | 'B' | 'C';
export type MockStorageType = 'SSD' | 'NVMe' | 'HDD';

export type MockSellerListing = {
  readonly id: string;
  readonly status: MockStatus;
  readonly title: string;
  readonly description: string;
  readonly brand: string;
  readonly model: string;
  readonly cpu: string;
  readonly ramGb: number;
  readonly storageType: MockStorageType;
  readonly storageGb: number;
  readonly screenSizeInches: number;
  readonly grade: MockGrade;
  readonly batteryHealthMinPercent: number;
  readonly batteryCycleMin?: number;
  readonly batteryCycleMax?: number;
  readonly knownDefects: string;
  readonly fulfillmentExpectations: string;
  /** Minor units (öre), matching the SEK-only money rule. */
  readonly priceMinor: number;
  readonly totalQuantity: number;
  readonly reservedQuantity: number;
  readonly soldQuantity: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly publishedAt: string | null;
  readonly archivedAt: string | null;
};

/** The organization every mock page belongs to. */
export const ORGANIZATION_NAME = 'Nordic Refurb AB';

/** When the deactivated state's banner says staff acted. */
export const DEACTIVATED_AT = '2026-10-28T09:12:00.000Z';

/** Condition grades as the product defines them: a letter plus the plain-language word the catalogue uses. */
export const GRADE_WORD: Record<MockGrade, string> = {
  A: 'Like new',
  B: 'Light wear',
  C: 'Visible wear',
};

export const GRADE_BADGE_VARIANT: Record<MockGrade, 'success' | 'accent' | 'warning'> = {
  A: 'success',
  B: 'accent',
  C: 'warning',
};

export const STATUS_LABEL: Record<MockStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

export const STATUS_BADGE_VARIANT: Record<MockStatus, 'neutral' | 'success' | 'outline'> = {
  draft: 'neutral',
  active: 'success',
  archived: 'outline',
};

/**
 * The curated marketplace brand list (shared contracts `CATALOGUE_BRANDS`), offered to the form as
 * suggestions only. Brand stays free text until P1-017; a seller may type a brand that is not here.
 */
export const BRAND_SUGGESTIONS = [
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

export const formatSek = (amountMinor: number): string =>
  new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);

const shortDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });
const longDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' });

export const formatShortDate = (iso: string): string => shortDate.format(new Date(iso));
export const formatLongDate = (iso: string): string => longDate.format(new Date(iso));

export const availableOf = (listing: MockSellerListing): number =>
  listing.totalQuantity - listing.reservedQuantity - listing.soldQuantity;

export const sellerListings: readonly MockSellerListing[] = [
  {
    id: 'sl-06',
    status: 'draft',
    title: 'ThinkPad X1 Carbon Gen 10 — ultralight for travel',
    description:
      'Off-lease fleet units from a Stockholm consultancy. Carbon-fibre lid, matte 14" display, backlit keyboard. Every unit has been wiped, re-imaged with a clean Windows 11 Pro install, and stress-tested for 24 hours.',
    brand: 'Lenovo',
    model: 'ThinkPad X1 Carbon Gen 10',
    cpu: 'Intel Core i7-1260P',
    ramGb: 16,
    storageType: 'NVMe',
    storageGb: 512,
    screenSizeInches: 14,
    grade: 'A',
    batteryHealthMinPercent: 92,
    batteryCycleMin: 50,
    batteryCycleMax: 200,
    knownDefects: 'none',
    fulfillmentExpectations:
      'Shipped with PostNord within 2 working days of payment, tracked, in original-style packaging with a 65 W USB-C charger.',
    priceMinor: 1_149_000,
    totalQuantity: 5,
    reservedQuantity: 0,
    soldQuantity: 0,
    createdAt: '2026-11-01T08:40:00.000Z',
    updatedAt: '2026-11-01T09:05:00.000Z',
    publishedAt: null,
    archivedAt: null,
  },
  {
    id: 'sl-05',
    status: 'active',
    title: 'ThinkPad T14 Gen 3 — business workhorse',
    description:
      'The most common off-lease laptop in Sweden for a reason: serviceable, sturdy, and quiet. These came from a two-year corporate lease and have been fully refurbished, with new keyboard caps where worn.',
    brand: 'Lenovo',
    model: 'ThinkPad T14 Gen 3',
    cpu: 'AMD Ryzen 5 PRO 6650U',
    ramGb: 16,
    storageType: 'NVMe',
    storageGb: 256,
    screenSizeInches: 14,
    grade: 'B',
    batteryHealthMinPercent: 85,
    batteryCycleMin: 150,
    batteryCycleMax: 400,
    knownDefects: 'Light scuffing on the lid corners; faint keyboard shine on the space bar.',
    fulfillmentExpectations:
      'Shipped with PostNord within 2 working days of payment, tracked. Charger included.',
    priceMinor: 749_000,
    totalQuantity: 12,
    reservedQuantity: 2,
    soldQuantity: 3,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-30T15:22:00.000Z',
    publishedAt: '2026-10-21T07:30:00.000Z',
    archivedAt: null,
  },
  {
    id: 'sl-04',
    status: 'active',
    title: 'Latitude 7420 — compact 14" with LTE',
    description:
      'Dell business ultrabooks with a built-in 4G modem. Ideal for field work. Refurbished with new thermal paste and a tested battery.',
    brand: 'Dell',
    model: 'Latitude 7420',
    cpu: 'Intel Core i5-1145G7',
    ramGb: 16,
    storageType: 'NVMe',
    storageGb: 512,
    screenSizeInches: 14,
    grade: 'B',
    batteryHealthMinPercent: 80,
    knownDefects: 'Small dent on the underside near the rear vent; does not affect operation.',
    fulfillmentExpectations: 'Shipped with DHL within 3 working days of payment, tracked.',
    priceMinor: 629_000,
    totalQuantity: 4,
    reservedQuantity: 1,
    soldQuantity: 3,
    createdAt: '2026-10-12T12:00:00.000Z',
    updatedAt: '2026-10-29T08:10:00.000Z',
    publishedAt: '2026-10-12T14:00:00.000Z',
    archivedAt: null,
  },
  {
    id: 'sl-03',
    status: 'active',
    title: 'MacBook Air M1 — silent, all-day battery',
    description:
      'Apple silicon Airs from a design agency upgrade cycle. Fanless, cool, and still fast for everyday work. Fresh macOS install, activation lock removed and verified.',
    brand: 'Apple',
    model: 'MacBook Air (M1, 2020)',
    cpu: 'Apple M1 (8-core)',
    ramGb: 8,
    storageType: 'SSD',
    storageGb: 256,
    screenSizeInches: 13.3,
    grade: 'A',
    batteryHealthMinPercent: 90,
    batteryCycleMin: 40,
    batteryCycleMax: 180,
    knownDefects: 'none',
    fulfillmentExpectations:
      'Shipped with PostNord within 2 working days of payment, tracked. 30 W charger included.',
    priceMinor: 699_000,
    totalQuantity: 3,
    reservedQuantity: 0,
    soldQuantity: 0,
    createdAt: '2026-10-25T09:00:00.000Z',
    updatedAt: '2026-10-25T09:45:00.000Z',
    publishedAt: '2026-10-25T09:45:00.000Z',
    archivedAt: null,
  },
  {
    id: 'sl-02',
    status: 'archived',
    title: 'EliteBook 840 G8 — bright display, great keyboard',
    description:
      'HP business laptops with the 400-nit panel option. Solid everyday machines; this batch is now sold through.',
    brand: 'HP',
    model: 'EliteBook 840 G8',
    cpu: 'Intel Core i5-1135G7',
    ramGb: 16,
    storageType: 'NVMe',
    storageGb: 512,
    screenSizeInches: 14,
    grade: 'B',
    batteryHealthMinPercent: 82,
    knownDefects: 'Minor wear on the palm rest; one unit has a faint pressure mark on the display.',
    fulfillmentExpectations: 'Shipped with PostNord within 2 working days of payment, tracked.',
    priceMinor: 589_000,
    totalQuantity: 6,
    reservedQuantity: 1,
    soldQuantity: 5,
    createdAt: '2026-09-30T11:00:00.000Z',
    updatedAt: '2026-10-27T16:40:00.000Z',
    publishedAt: '2026-10-01T08:00:00.000Z',
    archivedAt: '2026-10-27T16:40:00.000Z',
  },
  {
    id: 'sl-01',
    status: 'draft',
    title: 'Surface Laptop 4 — 13.5" touch',
    description: 'Microsoft Surface Laptop 4 in platinum. Draft while we finish battery testing.',
    brand: 'Microsoft',
    model: 'Surface Laptop 4 (13.5")',
    cpu: 'AMD Ryzen 5 4680U',
    ramGb: 8,
    storageType: 'SSD',
    storageGb: 256,
    screenSizeInches: 13.5,
    grade: 'B',
    batteryHealthMinPercent: 80,
    knownDefects: 'Alcantara palm rest shows light discolouration.',
    fulfillmentExpectations: 'Shipped with PostNord within 3 working days of payment, tracked.',
    priceMinor: 549_000,
    totalQuantity: 2,
    reservedQuantity: 0,
    soldQuantity: 0,
    createdAt: '2026-09-18T13:00:00.000Z',
    updatedAt: '2026-09-18T13:30:00.000Z',
    publishedAt: null,
    archivedAt: null,
  },
];

const byStatus = (status: MockStatus): MockSellerListing => {
  const listing = sellerListings.find((candidate) => candidate.status === status);
  if (listing === undefined) {
    throw new Error(`Mock data has no ${status} listing.`);
  }
  return listing;
};

/** The listings the detail-page states show. */
export const draftListing = byStatus('draft');
export const activeListing = byStatus('active');
export const archivedListing = byStatus('archived');
