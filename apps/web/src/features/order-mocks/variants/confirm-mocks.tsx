import { ArrowLeft, ShieldCheck } from 'lucide-react';

import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { FakeButton, OrderMockSwitcher, SnapshotPanel } from '../components/order-mock-pieces.tsx';
import { formatSek, snapshot } from '../mock-data.ts';

/**
 * The two confirmation-step directions (spec D2; design spec: `docs/design/buyer-ordering.md`).
 * Both restate the same commitment — one unit, this price, no payment yet, the unit held for
 * 24 hours — and differ only in whether confirming happens over the listing or on its own page.
 */

/** The commitment, identical in both directions so the layouts are the only argument. */
const CommitmentTerms = () => (
  <ul className="text-foreground mt-4 space-y-2 text-sm">
    <li className="flex gap-2">
      <span aria-hidden="true">·</span>
      One unit of {snapshot.title}, sold by {snapshot.sellerName}.
    </li>
    <li className="flex gap-2">
      <span aria-hidden="true">·</span>
      You pay {formatSek(snapshot.priceMinor)} — but <strong>no money is taken now</strong>. Paying
      is a separate step after the order exists.
    </li>
    <li className="flex gap-2">
      <span aria-hidden="true">·</span>
      The unit is held for you for <strong>24 hours</strong>. Unpaid orders are cancelled
      automatically, and you can cancel at any time before paying.
    </li>
  </ul>
);

const ListingBackdrop = () => (
  <Container className="py-10" width="wide">
    <p className="text-muted-foreground text-sm">← Back to results</p>
    <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{snapshot.title}</h1>
        <p className="text-muted-foreground mt-1">Lenovo · ThinkPad T14 Gen 3</p>
        <div className="border-border bg-muted/30 mt-6 h-64 rounded-xl border" aria-hidden="true" />
        <div className="border-border bg-muted/30 mt-4 h-40 rounded-xl border" aria-hidden="true" />
      </div>
      <div className="border-border bg-surface h-fit rounded-xl border p-6">
        <p className="text-2xl font-semibold">{formatSek(snapshot.priceMinor)}</p>
        <Badge variant="success" className="mt-2">
          In stock
        </Badge>
        <FakeButton className="mt-4 w-full">Order this laptop</FakeButton>
        <p className="text-muted-foreground mt-3 text-xs">
          No money moves until you pay. An order holds the unit for 24 hours.
        </p>
      </div>
    </div>
  </Container>
);

/**
 * Direction one: a dialog over the listing. The listing page stays where it was; the dialog
 * restates the commitment and the primary action places the order.
 */
export const ConfirmDialogMock = () => (
  <>
    <OrderMockSwitcher current="/mocks/orders/confirm/dialog" />
    <div className="relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none opacity-40 blur-[1.5px]">
        <ListingBackdrop />
      </div>

      <div className="absolute inset-0 grid place-items-center bg-black/30 p-4">
        <div
          role="presentation"
          className="border-border bg-surface w-full max-w-md rounded-xl border p-6 shadow-lg"
        >
          <h2 className="text-xl font-semibold">Confirm your order</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Ordering commits a unit to you. Here is exactly what that means:
          </p>
          <CommitmentTerms />
          <div className="mt-6 flex flex-col gap-2">
            <FakeButton>Place order — pay later</FakeButton>
            <FakeButton variant="secondary">Keep looking</FakeButton>
          </div>
          <p className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Money only ever moves into escrow, released after you confirm delivery.
          </p>
        </div>
      </div>
    </div>
  </>
);

/**
 * Direction two: a dedicated confirmation page the order action navigates to, shaped like the
 * review step of a checkout.
 */
export const ConfirmPageMock = () => (
  <>
    <OrderMockSwitcher current="/mocks/orders/confirm/full-page" />
    <Container className="py-12" width="narrow">
      <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to the listing
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Confirm your order</h1>
      <p className="text-muted-foreground mt-2">
        One step, and the laptop is held for you. Read what you are committing to — it is
        deliberately short.
      </p>

      <div className="border-border bg-surface mt-8 rounded-xl border p-6">
        <h2 className="font-semibold">Your commitment</h2>
        <CommitmentTerms />
      </div>

      <div className="mt-6">
        <SnapshotPanel heading="What you are ordering" />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <FakeButton className="px-6">Place order — pay later</FakeButton>
        <FakeButton variant="secondary">Keep looking</FakeButton>
      </div>
      <p className="text-muted-foreground mt-4 flex items-center gap-1.5 text-xs">
        <ShieldCheck className="size-3.5" aria-hidden="true" />
        Money only ever moves into escrow, released after you confirm delivery.
      </p>
    </Container>
  </>
);
