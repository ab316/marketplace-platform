import type { Listing } from '@acme/api-contracts';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Badge } from '../../../components/ui/badge.tsx';
import { Card, CardContent } from '../../../components/ui/card.tsx';
import { formatLongDate, formatMediumDate } from '../../../lib/formatting/date.ts';
import { formatSek } from '../../../lib/formatting/money.ts';
import { GRADE_WORD, STORAGE_TYPE_LABEL } from '../form-schema.ts';
import { publicListingHref } from '../paths.ts';
import { type ListingAction, ListingActions } from './listing-actions.tsx';
import { ListingStatusBadge } from './listing-status-badge.tsx';

/**
 * The seller-facing listing detail (UC-007 S2–S4, UC-008 W4; design contract
 * `/seller/listings/[listingId]`): the disclosures as the seller promised them, the stock in all
 * three states, what the status means, and — when the page decided the actor may write — the
 * actions that status allows. Synchronous per ADR-013.
 */
export interface ListingDetailProps {
  readonly listing: Listing;
  readonly canWrite: boolean;
  readonly publishAction: ListingAction;
  readonly archiveAction: ListingAction;
}

const GRADE_BADGE_VARIANT = { A: 'success', B: 'accent', C: 'warning' } as const;

const Disclosure = ({ term, children }: { term: string; children: ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-muted-foreground text-xs">{term}</dt>
    <dd className="text-sm">{children}</dd>
  </div>
);

const DisclosureGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className="text-sm font-semibold">{title}</h2>
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">{children}</dl>
  </section>
);

const StockLine = ({ listing }: { listing: Listing }) => (
  <dl className="grid grid-cols-3 gap-3 text-center">
    {(
      [
        ['Available', listing.availableQuantity],
        ['Reserved', listing.reservedQuantity],
        ['Sold', listing.soldQuantity],
      ] as const
    ).map(([term, value]) => (
      <div key={term} className="bg-muted/50 rounded-lg px-2 py-3">
        <dt className="text-muted-foreground text-xs">{term}</dt>
        <dd className="text-lg font-semibold tabular-nums">{value}</dd>
      </div>
    ))}
  </dl>
);

const STATUS_NOTES: Record<Listing['status'], (listing: Listing) => ReactNode> = {
  draft: () => (
    <p className="text-muted-foreground text-sm">
      Not visible to buyers. Publish when every detail is final — published content can&rsquo;t be
      edited.
    </p>
  ),
  active: (listing) => (
    <p className="text-muted-foreground text-sm">
      Visible in the catalogue since {formatLongDate(listing.publishedAt ?? listing.createdAt)}
      {listing.availableQuantity === 0 ? ', but hidden while no units are available' : ''}.{' '}
      <Link
        href={publicListingHref(listing.specifications.model)}
        className="text-primary inline-flex items-center gap-1 hover:underline"
      >
        View as a buyer <ExternalLink className="size-3.5" aria-hidden="true" />
      </Link>
    </p>
  ),
  archived: (listing) => (
    <p className="text-muted-foreground text-sm">
      Withdrawn from sale on {formatLongDate(listing.archivedAt ?? listing.updatedAt)}. Archived
      listings can&rsquo;t be re-published; create a new listing to sell this model again.
    </p>
  ),
};

export const ListingDetail = ({
  listing,
  canWrite,
  publishAction,
  archiveAction,
}: ListingDetailProps) => (
  <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
    <div className="flex flex-col gap-8">
      <p className="text-sm leading-relaxed whitespace-pre-line">{listing.description}</p>

      <DisclosureGroup title="Laptop">
        <Disclosure term="Brand and model">
          {listing.specifications.brand} {listing.specifications.model}
        </Disclosure>
        <Disclosure term="Processor">{listing.specifications.cpu}</Disclosure>
        <Disclosure term="Memory">{listing.specifications.ramGb} GB</Disclosure>
        <Disclosure term="Storage">
          {listing.specifications.storageGb} GB{' '}
          {STORAGE_TYPE_LABEL[listing.specifications.storageType]}
        </Disclosure>
        <Disclosure term="Screen">{listing.specifications.screenSizeInches}&quot;</Disclosure>
      </DisclosureGroup>

      <DisclosureGroup title="Condition">
        <Disclosure term="Grade">
          <span className="flex items-center gap-2">
            <Badge variant={GRADE_BADGE_VARIANT[listing.condition.grade]}>
              Grade {listing.condition.grade}
            </Badge>
            {GRADE_WORD[listing.condition.grade]} · cosmetic only
          </span>
        </Disclosure>
        <Disclosure term="Battery health">
          at least {listing.condition.guarantees.batteryHealthMinPercent}%
        </Disclosure>
        <Disclosure term="Battery cycles">
          {listing.condition.guarantees.batteryCycleMin === undefined
            ? 'No range promised'
            : `${listing.condition.guarantees.batteryCycleMin}–${listing.condition.guarantees.batteryCycleMax}`}
        </Disclosure>
        <Disclosure term="Known defects">{listing.condition.knownDefects}</Disclosure>
      </DisclosureGroup>

      <DisclosureGroup title="Offer">
        <Disclosure term="Price per unit">{formatSek(listing.price.amountMinor)}</Disclosure>
        <Disclosure term="Fulfillment">{listing.fulfillmentExpectations}</Disclosure>
      </DisclosureGroup>
    </div>

    <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Status and actions">
      <Card>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Status</h2>
            <ListingStatusBadge status={listing.status} />
          </div>

          {STATUS_NOTES[listing.status](listing)}
          <StockLine listing={listing} />

          {canWrite ? (
            <ListingActions
              listing={listing}
              publishAction={publishAction}
              archiveAction={archiveAction}
            />
          ) : listing.status === 'archived' ? null : (
            <p className="text-muted-foreground text-xs">
              Your role can view this listing but not change it.
            </p>
          )}

          <p className="text-muted-foreground border-border border-t pt-3 text-xs">
            Created {formatMediumDate(listing.createdAt)} · Updated{' '}
            {formatMediumDate(listing.updatedAt)}
          </p>
        </CardContent>
      </Card>
    </aside>
  </div>
);
