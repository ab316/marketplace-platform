/**
 * Static content for the home-page mockups.
 *
 * Everything here is invented. It exists so the mockups show the *shape and density* of a real
 * refurbished-laptop marketplace — the thing a hand-wavy placeholder page can never tell you:
 * whether twelve products fit comfortably above the fold, whether a condition grade stays legible
 * beside a price, how much room the trust messaging actually needs.
 *
 * The marketplace sells refurbished laptops only (PD-0002), so every product, category, seller
 * and review here is a laptop. Nothing else may appear, however tempting a phone is for filling a
 * grid.
 *
 * Deliberately a plain module with no `server-only` import: mockups must render in both Server and
 * Client Components. When these pages become real this file is deleted and the data comes from
 * `src/data/` — nothing outside `features/home-mocks` may import it.
 */

/** Condition grades, worst to best. Buyers compare on this as much as on price. */
export type Grade = 'fair' | 'good' | 'excellent';

export const GRADE_LABEL: Record<Grade, string> = {
  fair: 'Fair',
  good: 'Good',
  excellent: 'Excellent',
};

/** What each grade promises, in a buyer's words rather than a grading rubric's. */
export const GRADE_DESCRIPTION: Record<Grade, string> = {
  fair: 'Visible scratches or dents on the lid or deck. Works exactly as it should.',
  good: 'Light marks you have to look for. No dents, no dead pixels.',
  excellent: 'Almost no signs of use. Looks close to new.',
};

/**
 * The browse axis for a laptops-only catalogue. "Category" here means the *kind* of laptop —
 * the question a buyer actually asks first — not a product family the marketplace does not sell.
 */
export type ProductCategory =
  | 'macbook'
  | 'business'
  | 'workstation'
  | 'gaming'
  | 'convertible'
  | 'chromebook';

export type MockProduct = {
  readonly id: string;
  readonly name: string;
  readonly variant: string;
  readonly category: ProductCategory;
  readonly grade: Grade;
  /** Minor units (öre), matching `Money` in `packages/core-domain`. */
  readonly priceMinor: number;
  /** What the same model costs new, for the saving callout. */
  readonly newPriceMinor: number;
  readonly seller: string;
  readonly sellerRating: number;
  readonly reviewCount: number;
  /** Drives the "only N left" treatment. Mock stock, not real inventory. */
  readonly stock: number;
  readonly freeShipping: boolean;
};

export const formatSek = (amountMinor: number): string =>
  new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);

export const savingPercent = (product: MockProduct): number =>
  Math.round((1 - product.priceMinor / product.newPriceMinor) * 100);

/**
 * Twelve laptops. The order matters: the first four are the "deals" row in the commerce-first
 * direction and the first three are the curated shortlist in the editorial one, so the list opens
 * on well-graded machines from sellers with a long record.
 */
export const products: readonly MockProduct[] = [
  {
    id: 'mbp-14-m3',
    name: 'MacBook Pro 14"',
    variant: 'M3 · 16 GB · 512 GB',
    category: 'macbook',
    grade: 'excellent',
    priceMinor: 1_649_000,
    newPriceMinor: 2_449_000,
    seller: 'Nordic Refurb AB',
    sellerRating: 4.8,
    reviewCount: 1243,
    stock: 3,
    freeShipping: true,
  },
  {
    id: 'tp-x1-g11',
    name: 'ThinkPad X1 Carbon',
    variant: 'Gen 11 · i7 · 32 GB · 1 TB',
    category: 'business',
    grade: 'good',
    priceMinor: 989_000,
    newPriceMinor: 1_899_000,
    seller: 'Business IT Återbruk',
    sellerRating: 4.9,
    reviewCount: 642,
    stock: 7,
    freeShipping: true,
  },
  {
    id: 'tp-t14s-g4',
    name: 'ThinkPad T14s',
    variant: 'Gen 4 · Ryzen 7 · 16 GB · 512 GB',
    category: 'business',
    grade: 'excellent',
    priceMinor: 749_000,
    newPriceMinor: 1_549_000,
    seller: 'Business IT Återbruk',
    sellerRating: 4.9,
    reviewCount: 642,
    stock: 4,
    freeShipping: true,
  },
  {
    id: 'hp-elitebook-840',
    name: 'HP EliteBook 840 G10',
    variant: 'i5 · 16 GB · 512 GB',
    category: 'business',
    grade: 'good',
    priceMinor: 599_000,
    newPriceMinor: 1_449_000,
    seller: 'Business IT Återbruk',
    sellerRating: 4.9,
    reviewCount: 642,
    stock: 23,
    freeShipping: true,
  },
  {
    id: 'mba-13-m2',
    name: 'MacBook Air 13"',
    variant: 'M2 · 8 GB · 256 GB · Midnight',
    category: 'macbook',
    grade: 'good',
    priceMinor: 829_000,
    newPriceMinor: 1_399_000,
    seller: 'Nordic Refurb AB',
    sellerRating: 4.8,
    reviewCount: 1243,
    stock: 11,
    freeShipping: true,
  },
  {
    id: 'dell-xps-13-plus',
    name: 'Dell XPS 13 Plus',
    variant: 'i7 · 16 GB · 1 TB · OLED',
    category: 'business',
    grade: 'fair',
    priceMinor: 649_000,
    newPriceMinor: 1_599_000,
    seller: 'Business IT Återbruk',
    sellerRating: 4.9,
    reviewCount: 642,
    stock: 9,
    freeShipping: true,
  },
  {
    id: 'rog-zephyrus-g14',
    name: 'ASUS ROG Zephyrus G14',
    variant: 'Ryzen 9 · RTX 4060 · 16 GB · 1 TB',
    category: 'gaming',
    grade: 'good',
    priceMinor: 1_199_000,
    newPriceMinor: 1_999_000,
    seller: 'Laptopverkstan',
    sellerRating: 4.6,
    reviewCount: 1578,
    stock: 2,
    freeShipping: true,
  },
  {
    id: 'hp-spectre-x360-14',
    name: 'HP Spectre x360 14',
    variant: 'i7 · 16 GB · 1 TB · OLED touch',
    category: 'convertible',
    grade: 'excellent',
    priceMinor: 899_000,
    newPriceMinor: 1_749_000,
    seller: 'Laptopverkstan',
    sellerRating: 4.6,
    reviewCount: 1578,
    stock: 5,
    freeShipping: false,
  },
  {
    id: 'yoga-9i-14',
    name: 'Lenovo Yoga 9i 14',
    variant: 'i7 · 16 GB · 512 GB · 2-in-1',
    category: 'convertible',
    grade: 'good',
    priceMinor: 729_000,
    newPriceMinor: 1_499_000,
    seller: 'Återbruk Uppsala',
    sellerRating: 4.4,
    reviewCount: 318,
    stock: 6,
    freeShipping: false,
  },
  {
    id: 'dell-precision-5570',
    name: 'Dell Precision 5570',
    variant: 'i9 · RTX A2000 · 64 GB · 2 TB',
    category: 'workstation',
    grade: 'fair',
    priceMinor: 1_249_000,
    newPriceMinor: 3_499_000,
    seller: 'Business IT Återbruk',
    sellerRating: 4.9,
    reviewCount: 642,
    stock: 1,
    freeShipping: true,
  },
  {
    id: 'surface-laptop-5',
    name: 'Surface Laptop 5',
    variant: '13.5" · i5 · 8 GB · 256 GB',
    category: 'business',
    grade: 'excellent',
    priceMinor: 549_000,
    newPriceMinor: 1_199_000,
    seller: 'Laptopverkstan',
    sellerRating: 4.6,
    reviewCount: 1578,
    stock: 8,
    freeShipping: true,
  },
  {
    id: 'acer-chromebook-spin-714',
    name: 'Acer Chromebook Spin 714',
    variant: 'i5 · 8 GB · 256 GB · touch',
    category: 'chromebook',
    grade: 'good',
    priceMinor: 329_000,
    newPriceMinor: 799_000,
    seller: 'Återbruk Uppsala',
    sellerRating: 4.4,
    reviewCount: 318,
    stock: 14,
    freeShipping: false,
  },
];

/** Kinds of laptop. Counts sum to `TOTAL_LISTINGS`. */
export const categories: readonly {
  readonly id: ProductCategory;
  readonly label: string;
  readonly count: number;
  readonly fromMinor: number;
}[] = [
  { id: 'business', label: 'Business ultrabooks', count: 1360, fromMinor: 299_000 },
  { id: 'macbook', label: 'MacBooks', count: 1120, fromMinor: 549_000 },
  { id: 'convertible', label: '2-in-1 convertibles', count: 450, fromMinor: 399_000 },
  { id: 'gaming', label: 'Gaming laptops', count: 420, fromMinor: 649_000 },
  { id: 'workstation', label: 'Workstations', count: 310, fromMinor: 799_000 },
  { id: 'chromebook', label: 'Chromebooks', count: 180, fromMinor: 199_000 },
];

/**
 * Headline numbers. On a real page these would be computed; here they set the visual weight.
 * Roughly 290 kg CO₂e and 2.4 kg of e-waste per laptop, so the figures agree with each other.
 */
export const impact = [
  { value: '48 000', unit: 'laptops', label: 'given a second life' },
  { value: '13 900', unit: 'tonnes', label: 'of CO₂e avoided' },
  { value: '1 150', unit: 'tonnes', label: 'of e-waste kept out of landfill' },
  { value: '86 %', unit: '', label: 'less raw material than buying new' },
] as const;

export const guarantees = [
  {
    title: '30-day free returns',
    body: 'Changed your mind, or it is not what you expected? Send it back, no reason needed.',
  },
  {
    title: '24-month warranty',
    body: 'Every laptop, every seller, every grade. Handled by us, not passed back to you.',
  },
  {
    title: 'Payment held in escrow',
    body: 'Your money reaches the seller only once the order is confirmed and on its way.',
  },
  {
    title: 'Verified sellers only',
    body: 'Each seller is a registered business with a published track record you can read.',
  },
] as const;

export const buyingSteps = [
  {
    title: 'Pick a grade, not a gamble',
    body: 'Fair, Good, Excellent describe cosmetic condition only. Every laptop is fully working, with its measured battery health listed.',
  },
  {
    title: 'Pay into escrow',
    body: 'Your payment is held by the platform. The seller cannot touch it until the order is confirmed.',
  },
  {
    title: 'It ships within 48 hours',
    body: 'Tracked delivery across Sweden, included on most listings. Unpaid reservations release automatically.',
  },
  {
    title: 'Thirty days to be sure',
    body: 'Use it properly. If it is wrong, the return is free and the refund goes back the way it came.',
  },
] as const;

export const topSellers = [
  {
    name: 'Nordic Refurb AB',
    location: 'Göteborg',
    rating: 4.8,
    orders: 12_400,
    speciality: 'Apple laptops, every generation since the M1',
  },
  {
    name: 'Business IT Återbruk',
    location: 'Stockholm',
    rating: 4.9,
    orders: 8930,
    speciality: 'Ex-corporate ThinkPads, Latitudes and EliteBooks',
  },
  {
    name: 'Laptopverkstan',
    location: 'Malmö',
    rating: 4.6,
    orders: 6210,
    speciality: 'Gaming and creator laptops, all brands',
  },
] as const;

export const reviews = [
  {
    quote:
      'Ordered a ThinkPad graded Good. The only mark was on the underside. It arrived in two days and has been my work machine ever since.',
    author: 'Elin, Uppsala',
    purchase: 'ThinkPad X1 Carbon · Good',
  },
  {
    quote:
      'I was nervous about buying a used laptop online. Seeing that the payment was held until it shipped is what made me go through with it.',
    author: 'Marcus, Malmö',
    purchase: 'MacBook Air 13" · Good',
  },
  {
    quote:
      'Battery health was listed at 91 % and it was 91 %. A small thing, but it is the thing nobody else tells you.',
    author: 'Sofia, Stockholm',
    purchase: 'HP EliteBook 840 · Excellent',
  },
] as const;

/**
 * Catalogue size, quoted in several places across the mockups. Kept here so the figure cannot
 * disagree with itself between one direction and the next — an inconsistent count is exactly the
 * detail that makes a mockup look unconsidered in a review. Equals the sum of `categories`.
 */
export const TOTAL_LISTINGS = '3 840';
