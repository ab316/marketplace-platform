import type { Listing, ListingDraft, SellerListing } from '@acme/api-contracts';
import type { Route } from 'next';

import {
  GRADES,
  STORAGE_TYPE_LABEL,
  formatLongDate,
  formatSek,
  formatShortDate,
} from '../../lib/formatting/listing.ts';

/**
 * View models for the seller listing pages (REPO_MAP.md §6: map DTOs before rendering complex
 * screens). Pure functions, so every rule a page shows is unit-testable without rendering.
 */

export const listingHref = (listingId: string): Route =>
  `/seller/listings/${encodeURIComponent(listingId)}` as Route;

export type StatusBadge = {
  readonly label: string;
  readonly variant: 'outline' | 'success' | 'neutral';
};

export const STATUS_BADGE: Readonly<Record<SellerListing['status'], StatusBadge>> = {
  draft: { label: 'Draft', variant: 'outline' },
  active: { label: 'Active', variant: 'success' },
  archived: { label: 'Archived', variant: 'neutral' },
};

/** "Untitled draft" when a draft has no title yet (UC-005 A1). */
export const displayTitle = (listing: SellerListing): string => listing.title ?? 'Untitled draft';

const missingCount = (draft: ListingDraft): number => draft.readiness.issues.length;

export const readinessLabel = (draft: ListingDraft): string => {
  if (draft.readiness.ready) {
    return 'Ready to publish';
  }
  const count = missingCount(draft);
  return `${count} ${count === 1 ? 'detail' : 'details'} missing`;
};

/** Why an active listing is out of the catalogue, or `null` while units are available. */
export const catalogueAbsence = (listing: Listing): string | null => {
  if (listing.status !== 'active' || listing.availableQuantity > 0) {
    return null;
  }
  return listing.reservedQuantity > 0
    ? 'Not in the catalogue: every remaining unit is reserved by unpaid orders. Units return if those orders are cancelled or expire.'
    : 'Not in the catalogue: sold out.';
};

export interface SellerListingRow {
  readonly id: string;
  readonly href: Route;
  readonly title: string;
  readonly untitled: boolean;
  readonly subtitle: string | null;
  readonly status: StatusBadge;
  readonly price: string;
  /** Stock for published listings, readiness for drafts. */
  readonly stockOrReadiness: string;
  readonly ready: boolean;
  readonly notInCatalogue: boolean;
  readonly date: string;
}

export const toSellerListingRow = (listing: SellerListing): SellerListingRow => {
  const { brand, model } = listing.specifications;
  const subtitle = [brand, model].filter((part) => part !== null).join(' ') || null;
  const base = {
    id: listing.id,
    href: listingHref(listing.id),
    title: displayTitle(listing),
    untitled: listing.title === null,
    subtitle,
    status: STATUS_BADGE[listing.status],
    price: listing.price === null ? '—' : formatSek(listing.price.amountMinor),
  };

  if (listing.status === 'draft') {
    return {
      ...base,
      stockOrReadiness: readinessLabel(listing),
      ready: listing.readiness.ready,
      notInCatalogue: false,
      date: `Created ${formatShortDate(listing.createdAt)}`,
    };
  }

  return {
    ...base,
    stockOrReadiness: `${listing.availableQuantity} available · ${listing.reservedQuantity} reserved · ${listing.soldQuantity} sold (of ${listing.totalQuantity})`,
    ready: true,
    notInCatalogue: catalogueAbsence(listing) !== null,
    date:
      listing.archivedAt === null
        ? `Published ${formatShortDate(listing.publishedAt)}`
        : `Archived ${formatShortDate(listing.archivedAt)}`,
  };
};

export interface DetailRow {
  readonly label: string;
  /** `null` renders as "Not entered" (drafts only). */
  readonly value: string | null;
}

export interface DetailSection {
  readonly title: string;
  readonly rows: readonly DetailRow[];
}

const withUnit = (value: number | null, unit: string): string | null =>
  value === null ? null : `${value} ${unit}`;

const cycleRange = (min: number | null, max: number | null): string => {
  if (min === null && max === null) {
    return 'Not guaranteed';
  }
  if (min !== null && max !== null) {
    return `${min}–${max} cycles`;
  }
  return min === null ? `At most ${max} cycles` : `At least ${min} cycles`;
};

/** Every disclosure, grouped as the editor groups them, as buyers will read it. */
export const toDetailSections = (listing: SellerListing): readonly DetailSection[] => {
  const spec = listing.specifications;
  const { grade, guarantees, knownDefects } = listing.condition;
  const storage =
    spec.storageGb === null && spec.storageType === null
      ? null
      : [
          spec.storageGb === null ? null : `${spec.storageGb} GB`,
          spec.storageType === null ? null : STORAGE_TYPE_LABEL[spec.storageType],
        ]
          .filter((part) => part !== null)
          .join(' ');

  return [
    {
      title: 'Basics',
      rows: [
        { label: 'Title', value: listing.title },
        { label: 'Description', value: listing.description },
      ],
    },
    {
      title: 'Specifications',
      rows: [
        { label: 'Brand', value: spec.brand },
        { label: 'Model', value: spec.model },
        { label: 'CPU', value: spec.cpu },
        { label: 'RAM', value: withUnit(spec.ramGb, 'GB') },
        { label: 'Storage', value: storage },
        { label: 'Screen size', value: withUnit(spec.screenSizeInches, 'inches') },
      ],
    },
    {
      title: 'Condition',
      rows: [
        { label: 'Grade', value: grade === null ? null : `Grade ${grade} — ${GRADES[grade].name}` },
        {
          label: 'Battery health',
          value:
            guarantees.batteryHealthMinPercent === null
              ? null
              : `At least ${guarantees.batteryHealthMinPercent}%`,
        },
        {
          label: 'Battery cycles',
          value: cycleRange(guarantees.batteryCycleMin ?? null, guarantees.batteryCycleMax ?? null),
        },
        { label: 'Known defects', value: knownDefects },
      ],
    },
    {
      title: 'Price and stock',
      rows: [
        {
          label: 'Price',
          value: listing.price === null ? null : formatSek(listing.price.amountMinor),
        },
        { label: 'Quantity', value: withUnit(listing.totalQuantity, 'units') },
      ],
    },
    {
      title: 'Fulfillment',
      rows: [{ label: 'Fulfillment expectations', value: listing.fulfillmentExpectations }],
    },
  ];
};

/** "Published 3 November 2026 · Archived 5 November 2026". */
export const lifecycleLine = (listing: Listing): string =>
  [
    `Published ${formatLongDate(listing.publishedAt)}`,
    listing.archivedAt === null ? null : `Archived ${formatLongDate(listing.archivedAt)}`,
  ]
    .filter((part) => part !== null)
    .join(' · ');
