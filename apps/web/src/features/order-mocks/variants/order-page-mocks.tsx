import { Clock } from 'lucide-react';

import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import {
  FakeButton,
  NextStepLine,
  OrderMockSwitcher,
  SnapshotPanel,
  TimelineSection,
} from '../components/order-mock-pieces.tsx';
import { ORDER_STATES, expiresAt, orderNumber, placedAt } from '../mock-data.ts';

/**
 * The two order-page directions (UC-014 O3–O5, spec D6/D10/D11; design spec:
 * `docs/design/buyer-ordering.md`), both shown in the richest state — awaiting payment — because
 * it is the only state with an expiry and an action. The four states themselves are the states
 * board's job.
 *
 * Deliberately absent in both (D6): any payment affordance. The next-step line says in words that
 * paying opens with the next release.
 */

const view = ORDER_STATES.awaiting;

const PageHeading = () => (
  <div>
    <p className="text-muted-foreground text-sm">
      Your orders <span aria-hidden="true">/</span> {orderNumber}
    </p>
    <div className="mt-2 flex flex-wrap items-center gap-3">
      <h1 className="text-3xl font-semibold tracking-tight">Your order</h1>
      <Badge variant={view.badgeVariant}>{view.statusLabel}</Badge>
    </div>
    <p className="text-muted-foreground mt-1 text-sm">Placed {placedAt}</p>
  </div>
);

const ExpiryNote = () => (
  <p className="text-foreground flex items-center gap-1.5 text-sm">
    <Clock className="size-4" aria-hidden="true" />
    Held for you until <span className="font-medium">{expiresAt}</span>
  </p>
);

/**
 * Direction one: a sibling of the listing page. Content on the left, a sticky status card on the
 * right that keeps the state, expiry, next step, and actions in view while the buyer scrolls.
 */
export const OrderPagePanelMock = () => (
  <>
    <OrderMockSwitcher current="/mocks/orders/order/panel" />
    <Container className="py-12" width="wide">
      <PageHeading />
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <SnapshotPanel />
          <TimelineSection entries={view.timeline} />
        </div>

        <aside className="h-fit lg:sticky lg:top-6">
          <div className="border-border bg-surface rounded-xl border p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Status</h2>
              <Badge variant={view.badgeVariant}>{view.statusLabel}</Badge>
            </div>
            <div className="mt-4 space-y-3">
              <ExpiryNote />
              <NextStepLine view={view} />
            </div>
            <div className="border-border mt-5 border-t pt-5">
              <FakeButton variant="danger-outline" className="w-full">
                Cancel this order
              </FakeButton>
              <p className="text-muted-foreground mt-2 text-xs">
                Cancelling is final: the unit goes straight back on sale. Nothing has been paid.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  </>
);

/**
 * Direction two: one column, read top to bottom — status, the next-step line, the timeline, then
 * the snapshot as the receipt, with the cancel action last where receipts put their small print.
 */
export const OrderPageNarrativeMock = () => (
  <>
    <OrderMockSwitcher current="/mocks/orders/order/narrative" />
    <Container className="py-12" width="narrow">
      <PageHeading />

      <div className="border-border bg-muted/40 mt-6 rounded-xl border p-5">
        <div className="space-y-2">
          <NextStepLine view={view} />
          <ExpiryNote />
        </div>
      </div>

      <div className="mt-10 space-y-10">
        <TimelineSection entries={view.timeline} />
        <SnapshotPanel />
      </div>

      <div className="border-border mt-10 border-t pt-6">
        <FakeButton variant="danger-outline">Cancel this order</FakeButton>
        <p className="text-muted-foreground mt-2 text-xs">
          Cancelling is final: the unit goes straight back on sale. Nothing has been paid.
        </p>
      </div>
    </Container>
  </>
);
