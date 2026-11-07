import { RotateCw } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EmptyState } from '../../../components/feedback/empty-state.tsx';
import { Container } from '../../../components/layout/container.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { ApiTransportError } from '../../../data/api-error.ts';
import { getPublicListing } from '../../../data/server/catalogue.ts';
import { getCurrentActor } from '../../../data/server/current-actor.ts';
import {
  ListingDetailView,
  availabilityOf,
  backToResultsHref,
  orderActionFor,
  toListingDetailViewModel,
} from '../../../features/listing-detail/index.ts';

type PageProps = {
  readonly params: Promise<{ listingId: string }>;
  readonly searchParams: Promise<{ back?: string | string[] }>;
};

const firstParam = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/** Shared links are the point of this page, so the title and description come from the listing. */
export const generateMetadata = async ({ params }: PageProps): Promise<Metadata> => {
  const { listingId } = await params;

  try {
    const listing = await getPublicListing(listingId);
    if (listing === null) {
      return { title: 'Listing not available' };
    }
    return {
      title: listing.title,
      description: `${listing.specifications.brand} ${listing.specifications.model} — grade ${listing.condition.grade}, sold by ${listing.seller.name}. Payment held in escrow until you confirm the order.`,
    };
  } catch {
    // Metadata must never be the reason a page fails; the body below reports the failure.
    return { title: 'Listing' };
  }
};

/**
 * One listing as a buyer reads it (UC-012), public by design: no session is required, and the
 * page renders identically signed out. A thin composition shell per ADR-013 — resolve the id,
 * call the data layer, hand a view model to a synchronous component.
 */
const Page = async ({ params, searchParams }: PageProps) => {
  const { listingId } = await params;
  const back = firstParam((await searchParams).back);
  const backHref = backToResultsHref(back);
  const backLabel = back === undefined || back === '' ? 'Browse all laptops' : 'Back to results';

  let listing;
  try {
    listing = await getPublicListing(listingId);
  } catch (error) {
    if (error instanceof ApiTransportError) {
      // The backend is unreachable. Recoverable and distinct from "not available": keep the URL
      // so a retry re-runs the same request (UC-012 E2).
      return (
        <ListingUnavailable retryHref={`/listings/${encodeURIComponent(listingId)}` as Route} />
      );
    }
    throw error;
  }

  // One answer for an unknown id, a draft, and a deactivated seller's listing (UC-012 A5/E1).
  if (listing === null) {
    notFound();
  }

  // Only to decide which next step to offer; the page itself is public, and an anonymous visitor
  // never costs a round trip here (`getCurrentActor` returns null without a session cookie).
  const actor = await getCurrentActor();

  return (
    <ListingDetailView
      listing={toListingDetailViewModel(listing)}
      orderAction={orderActionFor(listing, availabilityOf(listing), actor)}
      backHref={backHref}
      backLabel={backLabel}
    />
  );
};

const ListingUnavailable = ({ retryHref }: { readonly retryHref: Route }) => (
  <Container className="py-16" width="narrow">
    <EmptyState
      icon={RotateCw}
      title="We could not load this listing"
      description="Something went wrong on our side, not with the listing itself. Trying again often works."
      action={
        <Button asChild variant="secondary">
          <Link href={retryHref}>Try again</Link>
        </Button>
      }
    />
  </Container>
);

export default Page;
