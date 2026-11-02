import { AlertTriangle, Archive, ExternalLink, Laptop, Pencil, Plus, Rocket } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Container } from '../../components/layout/container.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Card, CardContent } from '../../components/ui/card.tsx';
import { cn } from '../../lib/cn.ts';
import { ListingFormMock } from './components/listing-form-mock.tsx';
import {
  DEACTIVATED_AT,
  GRADE_BADGE_VARIANT,
  GRADE_WORD,
  type MockSellerListing,
  ORGANIZATION_NAME,
  STATUS_BADGE_VARIANT,
  STATUS_LABEL,
  activeListing,
  archivedListing,
  availableOf,
  draftListing,
  formatLongDate,
  formatSek,
  formatShortDate,
  sellerListings,
} from './mock-data.ts';
import { type SellerListingsMockState, sellerListingsMockPages } from './mock-routes.ts';

/**
 * Seller listing management mockups for UC-007 and UC-008 (design contract:
 * `docs/design/seller-listing-management.md`).
 *
 * Presentational only: every control is decorative, no state, no handlers, no JavaScript beyond
 * the form's `Field` wiring. The point is layout, density, copy, and the states the four routes
 * must handle — rendered with data varied enough to be honest about how a table of mixed statuses
 * and a detail page with real stock counts behave.
 */

// --- Chrome shared by every state ---------------------------------------------------------------

const StateSwitcher = ({ current }: { current: SellerListingsMockState }) => (
  <div className="border-border bg-muted/40 border-b">
    <Container className="flex flex-wrap items-center gap-2 py-2 text-sm" width="wide">
      <span className="text-muted-foreground mr-2">
        <Link href="/mocks" className="text-foreground font-medium hover:underline">
          Mockups
        </Link>{' '}
        · UC-007/008 seller listings, static content. State:
      </span>
      {sellerListingsMockPages.map(({ state, href, name }) => (
        <Link
          key={state}
          href={href}
          aria-current={state === current ? 'page' : undefined}
          className={cn(
            'rounded-md px-2.5 py-1',
            state === current
              ? 'bg-primary text-primary-foreground'
              : 'text-foreground hover:bg-muted'
          )}
        >
          {name}
        </Link>
      ))}
    </Container>
  </div>
);

/**
 * The seller sub-navigation the contract proposes: a tab row under the site header on every
 * `/seller/*` page. Decided in this mockup round against a left rail (open question in the
 * contract); the row degrades to a wrapping line on narrow screens without a mobile design.
 */
const SellerNav = ({ current }: { current: 'overview' | 'listings' }) => (
  <nav aria-label="Seller" className="border-border border-b">
    <Container className="flex items-center gap-1" width="default">
      {(
        [
          ['overview', 'Overview'],
          ['listings', 'Listings'],
        ] as const
      ).map(([key, label]) => (
        <span
          key={key}
          aria-current={key === current ? 'page' : undefined}
          className={cn(
            '-mb-px border-b-2 px-3 py-3 text-sm font-medium',
            key === current
              ? 'border-primary text-foreground'
              : 'text-muted-foreground border-transparent'
          )}
        >
          {label}
        </span>
      ))}
    </Container>
  </nav>
);

const DeactivationBanner = () => (
  <div
    role="alert"
    className="border-warning/35 bg-warning/10 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
  >
    <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <p>
      Your organization was deactivated by marketplace staff on {formatLongDate(DEACTIVATED_AT)}.
      Its listings are hidden from buyers and seller actions are paused; existing orders continue.
      Contact support if you believe this is a mistake.
    </p>
  </div>
);

/** Page shell: eyebrow with the organization, the h1, an optional action slot, then the content. */
const SellerPage = ({
  title,
  eyebrow = ORGANIZATION_NAME,
  action,
  banner,
  width = 'default',
  children,
}: {
  title: ReactNode;
  eyebrow?: string;
  action?: ReactNode;
  banner?: ReactNode;
  width?: 'default' | 'narrow';
  children: ReactNode;
}) => (
  <Container className="flex flex-col gap-6 py-10" width={width}>
    {banner}
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-muted-foreground text-sm">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {action}
    </div>
    {children}
  </Container>
);

// --- The listing list --------------------------------------------------------------------------

const StatusBadge = ({ listing }: { listing: MockSellerListing }) => (
  <Badge variant={STATUS_BADGE_VARIANT[listing.status]}>{STATUS_LABEL[listing.status]}</Badge>
);

/**
 * Stock in one cell. Available is the number that matters day to day; reserved and sold sit under
 * it in a muted line so the row still reads at a glance. A published listing with nothing available
 * is called out, because the catalogue hides it (UC-006 Q1) and the seller should know why.
 */
const StockCell = ({ listing }: { listing: MockSellerListing }) => {
  const available = availableOf(listing);
  const soldOut = listing.status === 'active' && available === 0;
  return (
    <div className="flex flex-col">
      <span className={cn('tabular-nums', soldOut && 'text-warning-foreground dark:text-warning')}>
        {available} of {listing.totalQuantity} available
      </span>
      <span className="text-muted-foreground text-xs tabular-nums">
        {listing.reservedQuantity} reserved · {listing.soldQuantity} sold
        {soldOut ? ' · not shown to buyers' : ''}
      </span>
    </div>
  );
};

const ListingsTable = ({ rows }: { rows: readonly MockSellerListing[] }) => (
  <div className="border-border overflow-x-auto rounded-xl border">
    <table className="w-full text-sm">
      <caption className="sr-only">Listings of {ORGANIZATION_NAME}</caption>
      <thead className="bg-muted/50 text-muted-foreground text-left text-xs uppercase tracking-wide">
        <tr>
          <th scope="col" className="px-4 py-3 font-medium">
            Listing
          </th>
          <th scope="col" className="px-4 py-3 font-medium">
            Status
          </th>
          <th scope="col" className="px-4 py-3 font-medium">
            Stock
          </th>
          <th scope="col" className="px-4 py-3 text-right font-medium">
            Price
          </th>
          <th scope="col" className="px-4 py-3 text-right font-medium">
            Updated
          </th>
        </tr>
      </thead>
      <tbody className="divide-border divide-y">
        {rows.map((listing) => (
          <tr key={listing.id} className="hover:bg-muted/30">
            <td className="px-4 py-3">
              <div className="flex items-start gap-3">
                <div
                  aria-hidden="true"
                  className="from-muted to-accent/50 text-muted-foreground grid size-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br"
                >
                  <Laptop className="size-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-primary block truncate font-medium hover:underline">
                    {listing.title}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {listing.brand} {listing.model} · Grade {listing.grade}
                  </span>
                </div>
              </div>
            </td>
            <td className="px-4 py-3 align-top">
              <StatusBadge listing={listing} />
            </td>
            <td className="px-4 py-3 align-top">
              <StockCell listing={listing} />
            </td>
            <td className="px-4 py-3 text-right align-top font-medium tabular-nums">
              {formatSek(listing.priceMinor)}
            </td>
            <td className="text-muted-foreground px-4 py-3 text-right align-top tabular-nums">
              {formatShortDate(listing.updatedAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const NewListingButton = () => (
  <Button aria-hidden="true" tabIndex={-1}>
    <Plus /> New listing
  </Button>
);

const ListingListMock = ({
  canWrite,
  deactivated,
}: {
  canWrite: boolean;
  deactivated: boolean;
}) => (
  <>
    <SellerNav current="listings" />
    <SellerPage
      title="Your listings"
      banner={deactivated ? <DeactivationBanner /> : undefined}
      action={canWrite ? <NewListingButton /> : undefined}
    >
      <p className="text-muted-foreground -mt-2 text-sm">
        {sellerListings.length} listings · drafts, published, and archived together. Buyers see only
        published listings with stock{deactivated ? ', and none while deactivated' : ''}.
      </p>
      <ListingsTable rows={sellerListings} />
    </SellerPage>
  </>
);

const ListingListEmptyMock = () => (
  <>
    <SellerNav current="listings" />
    <SellerPage title="Your listings">
      <div className="border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <Laptop className="text-muted-foreground size-6" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p className="font-medium">No listings yet</p>
          <p className="text-muted-foreground max-w-prose text-sm">
            Your first listing starts as a draft only you can see. Publish it when every detail is
            in, and buyers can find it in the catalogue within seconds.
          </p>
        </div>
        <Button aria-hidden="true" tabIndex={-1}>
          <Plus /> Create your first listing
        </Button>
        <p className="text-muted-foreground mt-2 text-xs">
          A viewer-role member sees this page without the button.
        </p>
      </div>
    </SellerPage>
  </>
);

// --- The form -----------------------------------------------------------------------------------

const ListingFormPageMock = ({ withErrors }: { withErrors: boolean }) => (
  <>
    <SellerNav current="listings" />
    <SellerPage title="New listing" eyebrow={`${ORGANIZATION_NAME} · Listings`} width="narrow">
      {withErrors ? (
        <ListingFormMock
          mode="new"
          values={{
            description: draftListing.description,
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
            priceSek: '0',
            totalQuantity: 5,
            fulfillmentExpectations: draftListing.fulfillmentExpectations,
          }}
          errors={{
            title: 'Enter a title.',
            batteryCycles: 'Enter both bounds or leave both empty.',
            knownDefects: 'Known defects must be disclosed; write "none" if there are none.',
            priceSek: 'Enter a price above 0 kr.',
          }}
        />
      ) : (
        <ListingFormMock mode="new" />
      )}
    </SellerPage>
  </>
);

// --- The detail page ----------------------------------------------------------------------------

const Disclosure = ({ term, children }: { term: string; children: ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-muted-foreground text-xs">{term}</dt>
    <dd className="text-sm">{children}</dd>
  </div>
);

const DisclosureGroup = ({ title, children }: { title: string; children: ReactNode }) => (
  <section aria-labelledby={`group-${title}`} className="flex flex-col gap-3">
    <h2 id={`group-${title}`} className="text-sm font-semibold">
      {title}
    </h2>
    <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">{children}</dl>
  </section>
);

const ListingDisclosures = ({ listing }: { listing: MockSellerListing }) => (
  <div className="flex flex-col gap-8">
    <p className="text-sm leading-relaxed">{listing.description}</p>

    <DisclosureGroup title="Laptop">
      <Disclosure term="Brand and model">
        {listing.brand} {listing.model}
      </Disclosure>
      <Disclosure term="Processor">{listing.cpu}</Disclosure>
      <Disclosure term="Memory">{listing.ramGb} GB</Disclosure>
      <Disclosure term="Storage">
        {listing.storageGb} GB {listing.storageType}
      </Disclosure>
      <Disclosure term="Screen">{listing.screenSizeInches}&quot;</Disclosure>
    </DisclosureGroup>

    <DisclosureGroup title="Condition">
      <Disclosure term="Grade">
        <span className="flex items-center gap-2">
          <Badge variant={GRADE_BADGE_VARIANT[listing.grade]}>Grade {listing.grade}</Badge>
          {GRADE_WORD[listing.grade]} · cosmetic only
        </span>
      </Disclosure>
      <Disclosure term="Battery health">at least {listing.batteryHealthMinPercent}%</Disclosure>
      <Disclosure term="Battery cycles">
        {listing.batteryCycleMin === undefined
          ? 'No range promised'
          : `${listing.batteryCycleMin}–${listing.batteryCycleMax}`}
      </Disclosure>
      <Disclosure term="Known defects">{listing.knownDefects}</Disclosure>
    </DisclosureGroup>

    <DisclosureGroup title="Offer">
      <Disclosure term="Price per unit">{formatSek(listing.priceMinor)}</Disclosure>
      <Disclosure term="Fulfillment">{listing.fulfillmentExpectations}</Disclosure>
    </DisclosureGroup>
  </div>
);

const StockLine = ({ listing }: { listing: MockSellerListing }) => (
  <dl className="grid grid-cols-3 gap-3 text-center">
    {(
      [
        ['Available', availableOf(listing)],
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

/**
 * The status card: what the status means, the stock, and the actions the status allows. The
 * `status × canWrite` matrix lives in one place in the real feature; here each branch is spelled
 * out so the copy can be judged.
 */
const StatusCard = ({ listing, canWrite }: { listing: MockSellerListing; canWrite: boolean }) => (
  <Card>
    <CardContent className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Status</h2>
        <StatusBadge listing={listing} />
      </div>

      {listing.status === 'draft' ? (
        <p className="text-muted-foreground text-sm">
          Not visible to buyers. Publish when every detail is final — published content can&rsquo;t
          be edited.
        </p>
      ) : null}
      {listing.status === 'active' ? (
        <p className="text-muted-foreground text-sm">
          Visible in the catalogue since {formatLongDate(listing.publishedAt ?? listing.createdAt)}.{' '}
          <span className="text-primary inline-flex items-center gap-1">
            View as a buyer <ExternalLink className="size-3.5" aria-hidden="true" />
          </span>
        </p>
      ) : null}
      {listing.status === 'archived' ? (
        <p className="text-muted-foreground text-sm">
          Withdrawn from sale on {formatLongDate(listing.archivedAt ?? listing.updatedAt)}. Archived
          listings can&rsquo;t be re-published; create a new listing to sell this model again.
        </p>
      ) : null}

      <StockLine listing={listing} />

      {canWrite && listing.status === 'draft' ? (
        <div className="flex flex-col gap-2">
          <Button aria-hidden="true" tabIndex={-1}>
            <Rocket /> Publish listing
          </Button>
          <Button variant="secondary" aria-hidden="true" tabIndex={-1}>
            <Pencil /> Edit draft
          </Button>
        </div>
      ) : null}

      {canWrite && listing.status === 'active' ? (
        <div className="flex flex-col gap-3">
          <Button variant="secondary" aria-hidden="true" tabIndex={-1}>
            <Archive /> Archive listing…
          </Button>
          <p className="text-muted-foreground text-xs">
            Published content can&rsquo;t be edited so buyers always see what they ordered. To
            change it, archive this listing and publish a new one.
          </p>
        </div>
      ) : null}

      {!canWrite && listing.status !== 'archived' ? (
        <p className="text-muted-foreground text-xs">
          Your role can view this listing but not change it.
        </p>
      ) : null}

      <p className="text-muted-foreground border-border border-t pt-3 text-xs">
        Created {formatShortDate(listing.createdAt)} · Updated {formatShortDate(listing.updatedAt)}
      </p>
    </CardContent>
  </Card>
);

/**
 * The AlertDialog as it will render: `role="alertdialog"`, title and description wired, Cancel
 * first in reading and focus order, the destructive action last. Static here — Radix supplies the
 * focus trap, Escape, and the no-dismiss-on-outside-click behaviour in the real component.
 */
const ArchiveDialogOverlay = ({ listing }: { listing: MockSellerListing }) => (
  <div aria-hidden="true" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
    <div
      role="alertdialog"
      aria-labelledby="archive-title"
      aria-describedby="archive-description"
      className="bg-surface text-surface-foreground border-border shadow-raised w-full max-w-md rounded-xl border p-6"
    >
      <h2 id="archive-title" className="text-lg font-semibold">
        Archive this listing?
      </h2>
      <div
        id="archive-description"
        className="text-muted-foreground mt-3 flex flex-col gap-3 text-sm"
      >
        <p>
          <span className="text-foreground font-medium">{listing.title}</span> will be withdrawn
          from sale. This can&rsquo;t be undone.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>It leaves the catalogue and no new orders can be placed.</li>
          <li>
            Existing orders continue — {listing.reservedQuantity} reserved unit
            {listing.reservedQuantity === 1 ? '' : 's'} and {listing.soldQuantity} sold stay as they
            are.
          </li>
          <li>You and marketplace staff can still see it, marked Archived.</li>
          <li>To sell this model again, publish a new listing.</li>
        </ul>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" className="ring-ring ring-2 ring-offset-2">
          Cancel
        </Button>
        <Button variant="danger">
          <Archive /> Archive listing
        </Button>
      </div>
    </div>
  </div>
);

const ListingDetailMock = ({
  listing,
  canWrite,
  dialogOpen = false,
}: {
  listing: MockSellerListing;
  canWrite: boolean;
  dialogOpen?: boolean;
}) => (
  <>
    <SellerNav current="listings" />
    <SellerPage
      title={listing.title}
      eyebrow={`${ORGANIZATION_NAME} · Listings`}
      action={
        <span className="text-muted-foreground text-sm">
          {listing.brand} {listing.model}
        </span>
      }
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <ListingDisclosures listing={listing} />
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <StatusCard listing={listing} canWrite={canWrite} />
        </aside>
      </div>
    </SellerPage>
    {dialogOpen ? <ArchiveDialogOverlay listing={listing} /> : null}
  </>
);

// --- Entry ---------------------------------------------------------------------------------------

/** One renderer per state, so adding a state without a page is a type error, not a blank screen. */
const STATE_VIEWS: Record<SellerListingsMockState, () => ReactNode> = {
  list: () => <ListingListMock canWrite deactivated={false} />,
  'list-empty': () => <ListingListEmptyMock />,
  form: () => <ListingFormPageMock withErrors={false} />,
  'form-errors': () => <ListingFormPageMock withErrors />,
  'detail-draft': () => <ListingDetailMock listing={draftListing} canWrite />,
  'detail-active': () => <ListingDetailMock listing={activeListing} canWrite />,
  'detail-archived': () => <ListingDetailMock listing={archivedListing} canWrite />,
  'archive-dialog': () => <ListingDetailMock listing={activeListing} canWrite dialogOpen />,
  deactivated: () => <ListingListMock canWrite={false} deactivated />,
};

export const SellerListingsMock = ({ state }: { state: SellerListingsMockState }) => (
  <>
    <StateSwitcher current={state} />
    {STATE_VIEWS[state]()}
  </>
);
