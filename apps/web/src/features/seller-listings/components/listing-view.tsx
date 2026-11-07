import type { Listing, ListingDraft } from '@acme/api-contracts';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Badge } from '../../../components/ui/badge.tsx';
import { STATUS_BADGE, displayTitle, lifecycleLine, toDetailSections } from '../view-models.ts';
import { ListingDetailsPanel } from './listing-details-panel.tsx';
import { NoticeBanner } from './notice-banner.tsx';
import { ReadinessPanel } from './readiness-panel.tsx';
import { StockSummary } from './stock-summary.tsx';

export interface ListingNoticeView {
  readonly tone: 'success' | 'info';
  readonly text: string;
}

const Notice = ({
  notice,
  live,
}: {
  readonly notice?: ListingNoticeView | undefined;
  readonly live: boolean;
}) =>
  notice === undefined ? null : (
    <NoticeBanner tone={notice.tone}>
      {notice.text}
      {live ? (
        <>
          {' '}
          <Link href="/listings" className="underline">
            See the catalogue
          </Link>
        </>
      ) : null}
    </NoticeBanner>
  );

/**
 * An active or archived listing as its organization sees it (UC-009, UC-010): status, stock, and
 * every disclosure as buyers read it. `archive` is the archive control, present only when the
 * member may archive (design: absent, not disabled).
 */
export const PublishedListingView = ({
  listing,
  notice,
  archive,
}: {
  readonly listing: Listing;
  readonly notice?: ListingNoticeView | undefined;
  readonly archive?: ReactNode;
}) => (
  <div className="flex flex-col gap-8">
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">{listing.title}</h1>
        <Badge variant={STATUS_BADGE[listing.status].variant}>
          {STATUS_BADGE[listing.status].label}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">{lifecycleLine(listing)}</p>
    </div>

    <Notice notice={notice} live={listing.status === 'active'} />
    <StockSummary listing={listing} />
    {archive}
    {listing.status === 'archived' ? (
      <p className="text-muted-foreground text-sm">
        Archiving is final. The stock figures still move as orders placed before archiving finish.
      </p>
    ) : null}
    <ListingDetailsPanel sections={toDetailSections(listing)} />
  </div>
);

/** A draft the member may not edit: a viewer, or any member of a deactivated organization. */
export const ReadOnlyDraftView = ({ draft }: { readonly draft: ListingDraft }) => (
  <div className="flex flex-col gap-8">
    <div className="flex flex-wrap items-center gap-3">
      <h1
        className={
          draft.title === null ? 'text-2xl font-semibold italic' : 'text-2xl font-semibold'
        }
      >
        {displayTitle(draft)}
      </h1>
      <Badge variant={STATUS_BADGE.draft.variant}>{STATUS_BADGE.draft.label}</Badge>
    </div>
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <ListingDetailsPanel sections={toDetailSections(draft)} />
      <aside className="lg:self-start">
        <ReadinessPanel readiness={draft.readiness} linkToFields={false} />
      </aside>
    </div>
  </div>
);
