/**
 * Invented data for the buyer-ordering mockups (UC-001, UC-013, UC-014; design spec:
 * `docs/design/buyer-ordering.md`). One laptop, one order, told at different moments of its life.
 *
 * Nothing here is fetched and no number is real. The timeline wording mirrors the API presenter's
 * voice (what happened, when, who, what next); the page-level "next step" line is the product's
 * own, per spec decision D11.
 */

export const formatSek = (amountMinor: number): string =>
  `${new Intl.NumberFormat('sv-SE').format(Math.round(amountMinor / 100))} kr`;

export interface MockSnapshot {
  readonly title: string;
  readonly grade: 'A' | 'B' | 'C';
  readonly gradeWord: string;
  readonly specs: readonly { label: string; value: string }[];
  readonly knownDefects: string;
  readonly priceMinor: number;
  readonly fulfillment: string;
  readonly sellerName: string;
}

export const snapshot: MockSnapshot = {
  title: 'ThinkPad T14 Gen 3 — refurbished',
  grade: 'A',
  gradeWord: 'Like new',
  specs: [
    { label: 'Processor', value: 'Intel Core i5-1245U' },
    { label: 'Memory', value: '16 GB' },
    { label: 'Storage', value: '512 GB NVMe SSD' },
    { label: 'Screen', value: '14″' },
    { label: 'Battery health', value: '≥ 92% guaranteed' },
  ],
  knownDefects: 'None',
  priceMinor: 799_000,
  fulfillment: 'Dispatched within 2 business days from Gothenburg.',
  sellerName: 'Nordic Refurb',
};

/** The four order states the page must render (UC-014 O3–O5, A2, A3). */
export type MockOrderState = 'awaiting' | 'cancelled' | 'expired' | 'paid';

export interface MockTimelineEntry {
  readonly title: string;
  readonly when: string;
  readonly description: string;
  /** The API's per-entry next step — narration inside the entry, never the page's banner (D11). */
  readonly nextStep?: string;
}

const createdEntry: MockTimelineEntry = {
  title: 'Order created',
  when: '12 Nov 2026, 14:12',
  description: 'You ordered one unit from Nordic Refurb. The unit is reserved for you.',
  nextStep: 'Pay to secure this order — unpaid orders expire after 24 hours.',
};

export interface MockOrderStateView {
  readonly state: MockOrderState;
  readonly statusLabel: string;
  readonly badgeVariant: 'accent' | 'neutral' | 'success';
  /** The one forward-looking line on the page, owned by the product (D11). */
  readonly nextStepLine: string;
  /** Whether the cancel action exists in this state (UC-013). */
  readonly cancellable: boolean;
  readonly timeline: readonly MockTimelineEntry[];
}

export const ORDER_STATES: Record<MockOrderState, MockOrderStateView> = {
  awaiting: {
    state: 'awaiting',
    statusLabel: 'Awaiting payment',
    badgeVariant: 'accent',
    nextStepLine:
      'Next: pay to make this laptop yours. Your unit is held until 13 Nov, 14:12 — paying from the browser opens with the next release.',
    cancellable: true,
    timeline: [createdEntry],
  },
  cancelled: {
    state: 'cancelled',
    statusLabel: 'Cancelled',
    badgeVariant: 'neutral',
    nextStepLine:
      'Nothing left to do here. You cancelled this order and the unit went back on sale — the listing may still have stock.',
    cancellable: false,
    timeline: [
      createdEntry,
      {
        title: 'Order cancelled',
        when: '12 Nov 2026, 16:40',
        description: 'You cancelled this order. The reserved unit returned to sale.',
      },
    ],
  },
  expired: {
    state: 'expired',
    statusLabel: 'Cancelled',
    badgeVariant: 'neutral',
    nextStepLine:
      'Nothing left to do here. This order expired unpaid after 24 hours and the unit went back on sale — order again from the listing if you still want it.',
    cancellable: false,
    timeline: [
      createdEntry,
      {
        title: 'Order expired',
        when: '13 Nov 2026, 14:12',
        description:
          'The 24-hour payment window passed, so the order was cancelled and the reserved unit returned to sale.',
      },
    ],
  },
  paid: {
    state: 'paid',
    statusLabel: 'Paid into escrow',
    badgeVariant: 'success',
    nextStepLine:
      'Your money is held safely in escrow. The seller prepares your laptop next — nothing for you to do right now.',
    cancellable: false,
    timeline: [
      createdEntry,
      {
        title: 'Payment secured',
        when: '12 Nov 2026, 14:31',
        description:
          '7 990 kr is held in escrow. It is released to the seller only after delivery.',
        nextStep: 'The seller prepares your order next.',
      },
    ],
  },
};

export const orderNumber = 'ord_7KD2MQ';
export const placedAt = '12 Nov 2026, 14:12';
export const expiresAt = '13 Nov 2026, 14:12';

/** Rows for the `/orders` list exhibit (UC-014 O1, D7/D9). */
export interface MockOrderRow {
  readonly title: string;
  readonly statusLabel: string;
  readonly badgeVariant: 'accent' | 'neutral' | 'success';
  readonly placed: string;
  readonly amountMinor: number;
  readonly note?: string;
}

export const orderRows: readonly MockOrderRow[] = [
  {
    title: 'ThinkPad T14 Gen 3 — refurbished',
    statusLabel: 'Awaiting payment',
    badgeVariant: 'accent',
    placed: '12 Nov 2026',
    amountMinor: 799_000,
    note: 'Held until 13 Nov, 14:12',
  },
  {
    title: 'MacBook Air M1 13″ — refurbished',
    statusLabel: 'Paid into escrow',
    badgeVariant: 'success',
    placed: '9 Nov 2026',
    amountMinor: 899_000,
  },
  {
    title: 'Dell Latitude 7420 — refurbished',
    statusLabel: 'Cancelled',
    badgeVariant: 'neutral',
    placed: '2 Nov 2026',
    amountMinor: 549_000,
    note: 'Cancelled by you',
  },
  {
    title: 'HP EliteBook 840 G8 — refurbished',
    statusLabel: 'Cancelled',
    badgeVariant: 'neutral',
    placed: '28 Oct 2026',
    amountMinor: 379_000,
    note: 'Expired unpaid',
  },
];
