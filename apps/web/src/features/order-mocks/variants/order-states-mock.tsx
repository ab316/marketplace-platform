import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import {
  FakeButton,
  NextStepLine,
  OrderMockSwitcher,
  TimelineSection,
} from '../components/order-mock-pieces.tsx';
import { ORDER_STATES, type MockOrderStateView, expiresAt } from '../mock-data.ts';

/**
 * The four order states, side by side (UC-014 O3–O5 and A2–A3; design spec:
 * `docs/design/buyer-ordering.md`). Not a layout argument: whichever direction wins, every card
 * here is a contract — the status in plain language, the product-owned next-step line (D11), the
 * timeline the state produces, and only the actions that remain. No payment affordance anywhere
 * (D6), no fee anywhere (D12).
 */

const stateNotes: Record<MockOrderStateView['state'], string> = {
  awaiting: `The only state with an expiry (${expiresAt}) and an action. Cancelling is offered behind a confirmation.`,
  cancelled:
    'Terminal. No actions remain; the page offers the listing again instead (UC-013 C5). The status never hides why.',
  expired:
    'The same terminal status as cancelling, reached by the sweep. The reason is the only difference, and it is stated (UC-014 A2).',
  paid: 'Money secured; the turn passes to the seller. Fulfillment entries and actions arrive with Phase 5 — the page already says whose move it is.',
};

const StateCard = ({ view }: { view: MockOrderStateView }) => (
  <section
    aria-label={`Order state: ${view.statusLabel}`}
    className="border-border bg-surface flex flex-col rounded-xl border p-6"
  >
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-semibold">
        {view.state === 'expired' ? 'Cancelled (expired)' : view.statusLabel}
      </h2>
      <Badge variant={view.badgeVariant}>{view.statusLabel}</Badge>
    </div>

    <div className="mt-4">
      <NextStepLine view={view} />
    </div>

    <div className="mt-6 flex-1">
      <TimelineSection entries={view.timeline} />
    </div>

    <div className="border-border mt-6 border-t pt-4">
      {view.cancellable ? (
        <FakeButton variant="danger-outline">Cancel this order</FakeButton>
      ) : (
        <p className="text-muted-foreground text-sm">
          No actions. <span className="text-primary font-medium">View the listing →</span>
        </p>
      )}
    </div>

    <p className="text-muted-foreground border-border mt-4 border-t pt-3 text-xs">
      {stateNotes[view.state]}
    </p>
  </section>
);

export const OrderStatesMock = () => (
  <>
    <OrderMockSwitcher current="/mocks/orders/states" />
    <Container className="py-12" width="wide">
      <div className="max-w-2xl">
        <Badge variant="accent">States board · static content</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">The four states of an order</h1>
        <p className="text-muted-foreground mt-3">
          Whatever layout the order page takes, these are the states it must render. Each card is
          the contract for one: status in plain words, one forward-looking line owned by the
          product, the timeline so far, and only the actions that remain. There is deliberately no
          Pay button (spec D6) and no fee anywhere (D12).
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {Object.values(ORDER_STATES).map((view) => (
          <StateCard key={view.state} view={view} />
        ))}
      </div>
    </Container>
  </>
);
