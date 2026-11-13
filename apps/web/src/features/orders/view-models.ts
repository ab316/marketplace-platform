import type { CatalogueListing, Order, OrderTimelineEntry } from '@acme/api-contracts';
import type { Route } from 'next';

import { formatSek } from '../../lib/formatting/listing.ts';

/**
 * View models for the buyer's order pages (UC-001, UC-013, UC-014; design:
 * `docs/design/buyer-ordering.md`). Pure functions, so every rule the pages show — the status in
 * plain words, the product-owned next-step line (spec D11), when cancelling is offered — is
 * unit-testable without rendering.
 *
 * The marketplace fee never appears in anything here (spec D12).
 */

const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** "13 Nov 2026, 14:12" — absolute, because an unpaid order's expiry is a commitment, not vibes. */
export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso));

export type OrderBadgeVariant = 'accent' | 'neutral' | 'success';

export interface OrderStatusViewModel {
  /** The status in the buyer's words, always inside the badge (never colour alone). */
  readonly label: string;
  readonly badge: OrderBadgeVariant;
  /**
   * The one forward-looking line on the page, owned by the product and derived from the order's
   * current state (spec D11). Timeline entries narrate history; this says what happens next.
   */
  readonly nextStepLine: string;
  /** Cancelling is offered only while it can succeed (UC-013 preconditions). */
  readonly cancellable: boolean;
}

export const orderStatusViewModel = (order: Order): OrderStatusViewModel => {
  if (order.status === 'paid_into_escrow') {
    return {
      label: 'Paid into escrow',
      badge: 'success',
      nextStepLine:
        'Your money is held safely in escrow. The seller prepares your laptop next — nothing for you to do right now.',
      cancellable: false,
    };
  }

  if (order.status === 'cancelled') {
    return {
      label: 'Cancelled',
      badge: 'neutral',
      nextStepLine:
        order.cancellationReason === 'expired'
          ? 'Nothing left to do here. This order expired unpaid after 24 hours and the unit went back on sale — order again from the listing if you still want it.'
          : 'Nothing left to do here. You cancelled this order and the unit went back on sale — the listing may still have stock.',
      cancellable: false,
    };
  }

  // Awaiting payment. While a payment attempt runs, the order cannot be cancelled (UC-013 A2).
  if (order.payment.status === 'in_progress') {
    return {
      label: 'Awaiting payment',
      badge: 'accent',
      nextStepLine:
        'A payment for this order is in progress. Wait for it to finish — the order cannot be cancelled until it does.',
      cancellable: false,
    };
  }

  return {
    label: 'Awaiting payment',
    badge: 'accent',
    nextStepLine: `Next: pay to make this laptop yours. Your unit is held until ${formatDateTime(order.expiresAt)} — paying from the browser opens with the next release.`,
    cancellable: true,
  };
};

export interface TimelineEntryViewModel {
  readonly id: string;
  readonly title: string;
  readonly when: string;
  readonly description: string;
  /** The API's per-entry next step: narration inside the entry, never the page's banner (D11). */
  readonly note: string | null;
}

const toTimelineEntryViewModel = (entry: OrderTimelineEntry): TimelineEntryViewModel => ({
  id: entry.id,
  title: entry.title,
  when: formatDateTime(entry.occurredAt),
  description: entry.description,
  note: entry.nextStep,
});

export interface SnapshotRow {
  readonly label: string;
  readonly value: string;
}

export interface OrderDetailViewModel {
  readonly id: string;
  readonly status: OrderStatusViewModel;
  readonly placed: string;
  /** Shown only while the order is unpaid (UC-014 O3). */
  readonly heldUntil: string | null;
  readonly price: string;
  readonly sellerName: string;
  readonly listingHref: Route;
  readonly snapshot: {
    readonly title: string;
    readonly gradeLabel: string;
    readonly rows: readonly SnapshotRow[];
    readonly knownDefects: string;
    readonly fulfillmentExpectations: string;
  };
  readonly timeline: readonly TimelineEntryViewModel[];
}

export const toOrderDetailViewModel = (order: Order): OrderDetailViewModel => {
  const snapshot = order.listingSnapshot;
  const spec = snapshot.specifications;
  const status = orderStatusViewModel(order);

  return {
    id: order.id,
    status,
    placed: formatDateTime(order.createdAt),
    heldUntil: order.status === 'awaiting_payment' ? formatDateTime(order.expiresAt) : null,
    price: formatSek(order.total.amountMinor),
    sellerName: order.seller.name,
    listingHref: `/listings/${encodeURIComponent(order.listingId)}` as Route,
    snapshot: {
      title: snapshot.title,
      gradeLabel: `Grade ${snapshot.condition.grade}`,
      rows: [
        { label: 'Processor', value: spec.cpu },
        { label: 'Memory', value: `${spec.ramGb} GB` },
        { label: 'Storage', value: `${spec.storageGb} GB` },
        { label: 'Screen', value: `${spec.screenSizeInches}"` },
        {
          label: 'Battery health',
          value: `At least ${snapshot.condition.guarantees.batteryHealthMinPercent}%`,
        },
      ],
      knownDefects: snapshot.condition.knownDefects,
      fulfillmentExpectations: snapshot.fulfillmentExpectations,
    },
    timeline: order.timeline.map(toTimelineEntryViewModel),
  };
};

export interface OrderRowViewModel {
  readonly id: string;
  readonly href: Route;
  readonly title: string;
  readonly statusLabel: string;
  readonly badge: OrderBadgeVariant;
  readonly placed: string;
  /** The one state detail worth a list row: the expiry while unpaid, the reason once cancelled. */
  readonly note: string | null;
  readonly price: string;
}

export const toOrderRowViewModel = (order: Order): OrderRowViewModel => {
  const status = orderStatusViewModel(order);

  const note =
    order.status === 'awaiting_payment'
      ? `Held until ${formatDateTime(order.expiresAt)}`
      : order.status === 'cancelled'
        ? order.cancellationReason === 'expired'
          ? 'Expired unpaid'
          : 'Cancelled by you'
        : null;

  return {
    id: order.id,
    href: `/orders/${encodeURIComponent(order.id)}` as Route,
    title: order.listingSnapshot.title,
    statusLabel: status.label,
    badge: status.badge,
    placed: formatDateTime(order.createdAt),
    note,
    price: formatSek(order.total.amountMinor),
  };
};

/** What the buyer is committing to on the confirmation page (spec D2). */
export interface OrderConfirmViewModel {
  readonly listingId: string;
  readonly listingHref: Route;
  readonly title: string;
  readonly subtitle: string;
  readonly gradeLabel: string;
  readonly price: string;
  readonly sellerName: string;
  readonly fulfillmentExpectations: string;
}

export const toOrderConfirmViewModel = (listing: CatalogueListing): OrderConfirmViewModel => ({
  listingId: listing.id,
  listingHref: `/listings/${encodeURIComponent(listing.id)}` as Route,
  title: listing.title,
  subtitle: `${listing.specifications.brand} ${listing.specifications.model}`,
  gradeLabel: `Grade ${listing.condition.grade}`,
  price: formatSek(listing.price.amountMinor),
  sellerName: listing.seller.name,
  fulfillmentExpectations: listing.fulfillmentExpectations,
});
