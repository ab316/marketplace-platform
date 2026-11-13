import type { CatalogueListing, CurrentUser } from '@acme/api-contracts';
import type { Route } from 'next';

import { GRADES, STORAGE_TYPE_LABEL, formatSek } from '../../lib/formatting/listing.ts';
import {
  type RawSearchParams,
  catalogueHref,
  parseCatalogueSearchParams,
} from '../catalogue/search-params.ts';

/**
 * View models for the buyer's listing page (UC-012). Pure functions, so every rule the page
 * shows — what "unavailable" means, who may order, what the grade says — is unit-testable
 * without rendering (REPO_MAP.md §6).
 */

/**
 * Where "Back to results" goes. The carried value is never trusted as a URL: it is parsed as
 * catalogue refinements and rebuilt, so it can only ever point back at the catalogue.
 */
export const backToResultsHref = (back: string | undefined): Route => {
  if (back === undefined || back === '') {
    return '/listings';
  }

  const params: RawSearchParams = {};
  for (const [key, value] of new URLSearchParams(back)) {
    const existing = params[key];
    if (existing === undefined) {
      params[key] = value;
    } else {
      params[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
    }
  }

  return catalogueHref(parseCatalogueSearchParams(params).search);
};

/** Whether the listing can be ordered, and what to tell the buyer when it cannot (UC-012 V6). */
export type Availability =
  | { readonly kind: 'available'; readonly label: string }
  | { readonly kind: 'sold-out'; readonly label: string; readonly explanation: string }
  | { readonly kind: 'archived'; readonly label: string; readonly explanation: string };

export const availabilityOf = (listing: CatalogueListing): Availability => {
  if (listing.status === 'archived') {
    return {
      kind: 'archived',
      label: 'No longer sold',
      explanation:
        'The seller has stopped selling this laptop. It stays here so earlier orders and shared links still show what was promised.',
    };
  }

  if (listing.availableQuantity > 0) {
    return { kind: 'available', label: 'In stock' };
  }

  return {
    kind: 'sold-out',
    label: 'Currently unavailable',
    explanation:
      listing.reservedQuantity > 0
        ? 'Every unit is held by an unpaid order right now. Units come back if those orders are cancelled or expire, so it is worth checking again.'
        : 'Every unit has been sold.',
  };
};

/**
 * The next step this viewer has (UC-012 V7, ordering spec D2/D3/D5): the order action for an
 * eligible signed-in buyer, the sign-in handoff for an anonymous one — which returns them to this
 * listing, never placing anything on their behalf — and an explanation for the viewers who may
 * not order at all. The API enforces the same eligibility rule (P1-021); hiding the action here
 * is honesty, not authorization.
 */
export type OrderAction =
  | { readonly kind: 'order'; readonly href: Route }
  | { readonly kind: 'sign-in'; readonly href: Route }
  | { readonly kind: 'own-organization'; readonly href: Route }
  | { readonly kind: 'staff' }
  | { readonly kind: 'unavailable' };

export const orderActionFor = (
  listing: CatalogueListing,
  availability: Availability,
  actor: CurrentUser | null
): OrderAction => {
  if (availability.kind !== 'available') {
    return { kind: 'unavailable' };
  }

  // Staff never transact, and a seller does not buy from themselves (ordering spec D3).
  if (actor?.isPlatformAdmin === true) {
    return { kind: 'staff' };
  }
  if (actor?.membership?.organizationId === listing.seller.organizationId) {
    return {
      kind: 'own-organization',
      href: `/seller/listings/${encodeURIComponent(listing.id)}` as Route,
    };
  }

  if (actor === null) {
    return {
      kind: 'sign-in',
      href: `/sign-in?next=${encodeURIComponent(`/listings/${listing.id}`)}` as Route,
    };
  }

  return {
    kind: 'order',
    href: `/listings/${encodeURIComponent(listing.id)}/order` as Route,
  };
};

export interface DetailRow {
  readonly label: string;
  readonly value: string;
}

export interface DetailSection {
  readonly title: string;
  readonly rows: readonly DetailRow[];
}

export interface ListingDetailViewModel {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly price: string;
  readonly grade: { readonly letter: string; readonly name: string; readonly definition: string };
  readonly knownDefects: string;
  readonly fulfillmentExpectations: string;
  readonly sellerName: string;
  readonly specifications: DetailSection;
  readonly condition: DetailSection;
  readonly availability: Availability;
}

const batteryCycleLine = (listing: CatalogueListing): string | null => {
  const { batteryCycleMin, batteryCycleMax } = listing.condition.guarantees;
  if (batteryCycleMin !== undefined && batteryCycleMax !== undefined) {
    return `${batteryCycleMin}–${batteryCycleMax} cycles`;
  }
  if (batteryCycleMin !== undefined) {
    return `At least ${batteryCycleMin} cycles`;
  }
  if (batteryCycleMax !== undefined) {
    return `At most ${batteryCycleMax} cycles`;
  }
  return null;
};

export const toListingDetailViewModel = (listing: CatalogueListing): ListingDetailViewModel => {
  const spec = listing.specifications;
  const grade = GRADES[listing.condition.grade];
  const cycles = batteryCycleLine(listing);

  return {
    id: listing.id,
    title: listing.title,
    subtitle: `${spec.brand} ${spec.model}`,
    description: listing.description,
    price: formatSek(listing.price.amountMinor),
    grade: { letter: listing.condition.grade, ...grade },
    knownDefects: listing.condition.knownDefects,
    fulfillmentExpectations: listing.fulfillmentExpectations,
    sellerName: listing.seller.name,
    specifications: {
      title: 'Specification',
      rows: [
        { label: 'Brand', value: spec.brand },
        { label: 'Model', value: spec.model },
        { label: 'Processor', value: spec.cpu },
        { label: 'Memory', value: `${spec.ramGb} GB` },
        { label: 'Storage', value: `${spec.storageGb} GB ${STORAGE_TYPE_LABEL[spec.storageType]}` },
        { label: 'Screen', value: `${spec.screenSizeInches}"` },
      ],
    },
    condition: {
      title: 'Condition',
      rows: [
        { label: 'Cosmetic grade', value: `${listing.condition.grade} — ${grade.name}` },
        {
          label: 'Battery health',
          value: `At least ${listing.condition.guarantees.batteryHealthMinPercent}% of original capacity`,
        },
        ...(cycles === null ? [] : [{ label: 'Battery cycles', value: cycles }]),
      ],
    },
    availability: availabilityOf(listing),
  };
};
