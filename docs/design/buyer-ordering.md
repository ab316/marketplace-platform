# Design: Buyer ordering (confirm, the order page, the buyer's orders)

- **Status:** approved and implemented (12 November 2026) — directions chosen: the confirmation step is a
  dedicated page, and the order page keeps the sticky status panel (see Direction decisions).
  The rejected alternatives stay browsable in the gallery. In-repo mockups are the design
  input, listed in the `/mocks` gallery and browsable at `/mocks/orders`: the confirmation step
  (`/mocks/orders/confirm/dialog` vs `/mocks/orders/confirm/full-page`), the order page
  (`/mocks/orders/order/panel` vs `/mocks/orders/order/narrative`), the four order states
  (`/mocks/orders/states`), and the orders list with its empty state (`/mocks/orders/list`).
  Desktop only; see Open questions on mobile.
- **Figma:** none; the in-repo mockups are the design input (`features/order-mocks/`).
- **Related use cases:** `docs/product/use-cases/UC-001-buyer-places-an-order.md` (Implemented,
  API), `docs/product/use-cases/UC-013-buyer-cancels-unpaid-order.md` (Implemented, API),
  `docs/product/use-cases/UC-014-buyer-reviews-their-orders.md` (Approved)
- **Related specs and rules:** `docs/product/feature-specs/buyer-ordering.md` (D2, D3, D5–D12);
  `docs/product/business-rules-policies.md` (order creation — who may order, explicit
  confirmation, no replayed intent)
- **Related decisions:** ADR-011 (cookie session, the Next.js BFF boundary), ADR-013 (thin async
  pages), PD-0004 (no money before payment; the fee is seller-borne and buyer-invisible, D12)
- **Related backlog items:** P1-020 (the order names its seller — the backend half ships with this
  slice), P1-021 (sellers and staff cannot order — enforced by the API in this slice)
- **Roles affected:** buyer (signed in; signed out meets the sign-in wall at the order action).
  Seller members and platform admins appear only as viewers refused the order action.

## Why this slice

The listing page reserves the spot where ordering goes and currently states that it opens with the
next release. This slice is that release: the explicit confirmation (D2), the order page the buyer
lands on and returns to (UC-014), cancellation (UC-013), and `/orders`. It is the buyer's half of
the Phase 6 demo; payment is deliberately the slice after (D6 — the order page ships whole, with
no payment affordance).

## Direction decisions (settled by the founder, 2026-11-12)

1. **The confirmation step (D2) is a dedicated page** (`/mocks/orders/confirm/full-page`): the
   commitment moment gets a page of its own, with room to breathe and to grow into a checkout. The
   dialog direction (`/mocks/orders/confirm/dialog`) was rejected but stays browsable. The terms
   are unchanged either way: one unit, this price, no payment taken now, held for 24 hours.
2. **The order page keeps the sticky status panel** (`/mocks/orders/order/panel`): snapshot and
   timeline on the left, a status card on the right holding the state, the expiry, the next-step
   line, and the actions — the buyer's question is _what do I do now?_, so status and actions never
   scroll away. The single-column direction (`/mocks/orders/order/narrative`) was rejected but
   stays browsable.

## Routes & entry points

| Route                  | Purpose                                                           | Use case          |
| ---------------------- | ----------------------------------------------------------------- | ----------------- |
| `/listings/[id]`       | Gains the real order action (replaces "opens with next release")  | UC-001 B3         |
| `/listings/[id]/order` | The confirmation page (direction chosen 2026-11-12)               | UC-001 B3 (D2)    |
| `/orders/[orderId]`    | One order: status, snapshot, timeline, expiry, next step, actions | UC-014 O2–O5      |
| `/orders`              | The buyer's own orders, newest first, paged at 12                 | UC-014 O1 (D7/D9) |

- All order routes require a session; an anonymous visit redirects to `/sign-in?next=<route>`
  (the seller area's existing mechanism). `/orders` joins the signed-in header navigation.
- Arrived at from: the confirmation (landing on the fresh order, UC-001 B7), the header's
  "Your orders", and bookmarks/shared links — an order link a stranger opens resolves to
  not-available, never to data (UC-014 E1).
- After cancelling, the buyer stays on the order page in its cancelled state, with the listing
  offered as the way back (UC-013 C5).

## The order action on the listing page

Designed in `buyer-listing-detail.md` (the action-area states exist in code as the `OrderAction`
view-model variants); this slice fills them in:

- **Eligible signed-in buyer** → the "Order this laptop" button opens the confirmation step.
- **Signed out** → "Sign in to order", a link to `/sign-in?next=/listings/<id>`. After signing in
  the buyer is back on the listing and confirms themselves; an intent from before sign-in is never
  replayed (D5).
- **Member of the selling organization** → no action; "This is your organization's listing."
- **Platform admin** → no action; marketplace staff do not place orders.
- **Sold out / archived** → unchanged from the listing-detail design.

## User states

### Confirmation step (either direction)

- **Default:** the commitment terms — one unit, the price in SEK, "no money is taken now", the
  24-hour hold — plus the snapshot summary in the page direction. Primary action
  "Place order — pay later"; secondary "Keep looking" returns to the listing.
- **Pending:** the primary action disables on submit with a progress label ("Placing your
  order…"). This is the double-submit guard; it narrows but does not close the duplicate-order
  window (spec product risk — durable idempotency is the Backend reliability block).
- **Refused — no longer available:** the listing lost its last unit or was archived between page
  and confirm (UC-001 A3/A4). The step states "This laptop is no longer available", explains a
  unit may return if a reservation lapses, and offers the catalogue. No retry loop.
- **Refused — not eligible:** own-organization member or staff reached the API anyway (P1-021).
  The refusal is worded identically to the hidden action's explanation; nothing was reserved.
- **Recoverable error:** backend unreachable — inline error on the step, the action re-enables,
  nothing was ordered (or the buyer finds the order in `/orders` if it was — the error copy says
  to check there before retrying).

### Order page `/orders/[orderId]`

- **Loading:** skeleton of the page's real shape (`loading.tsx`), `aria-hidden`, announcing
  "Loading order".
- **Awaiting payment:** status badge, the expiry ("Held for you until <time>"), the next-step
  line, the full timeline, the snapshot, and the cancel action. **No payment affordance** (D6);
  the next-step line says in words that paying from the browser opens with the next release.
- **Cancelled (by the buyer) / expired:** the terminal status with its reason stated, the complete
  timeline, no actions, and a link back to the listing (UC-014 A2). The two differ only in the
  stated reason.
- **Paid into escrow:** the money shown as held safely, the turn handed to the seller in words,
  no actions (UC-014 A3). No fee, no fee rate (D12).
- **Not found / forbidden:** one page for an unknown id and someone else's order — "This order is
  not available" with a link to `/orders`. Never distinguishes the two (UC-014 E1);
  `not-found.tsx`.
- **Recoverable error:** inline error with Retry, worded distinctly from "not available"
  (UC-014 E2); `error.tsx`.

### Orders list `/orders`

- **Loading:** skeleton rows.
- **Success:** rows newest first — what was ordered, status badge, the note that matters for the
  state (the expiry while unpaid; the cancellation reason), the amount, and a View link. Paged at
  12 with Newer/Older controls and "Showing x–y of z" (D9).
- **Empty:** "No orders yet" with one line of reassurance and a "Browse laptops" action
  (UC-014 A1). Never a blank page.
- **Recoverable error:** inline error with Retry; never presented as "no orders" (UC-014 E2).

### Cancelling (from the order page)

- **Confirm first:** cancelling is final and the unit goes straight back on sale (UC-013 C1); use
  the existing `AlertDialog` confirmation pattern from the seller area.
- **Success:** the page re-renders in its cancelled state; the result is announced (live region).
- **Already expired:** the page states the order is already cancelled with expiry as the reason;
  nothing changed, no error tone (UC-013 A1).
- **Payment in progress:** refused with "wait for the payment to resolve" (UC-013 A2) — reachable
  once the payment slice lands; designed now so the copy slot exists.

## Key components

- **Confirmation terms block** — the four commitments, identical in both directions; the only
  place the product restates price before payment. One escrow reassurance line beneath the
  actions.
- **Status header** — "Your order" + status badge (accent for awaiting, neutral for cancelled,
  success for paid), placed date, order reference.
- **Next-step line (D11)** — one forward-looking sentence owned by the web app, derived from
  status + payment state. It is the only forward-looking statement on the page; timeline entries
  read as history. The API's per-entry `nextStep` renders _inside_ its entry, italic, as part of
  the narration.
- **Timeline section (D10)** — one section titled "What has happened": dot-and-line list, each
  entry with title, timestamp, description, optional per-entry next step. Grows through payment
  and Phase 5 without the page changing shape.
- **Snapshot panel** — "What you ordered", explicitly framed as immutable ("as promised when you
  ordered — later edits to the listing never change it"): title, grade badge with its word, spec
  pairs as a `<dl>`, known defects, seller name (P1-020), price, fulfillment expectation.
- **Cancel block** — a danger-outline button with the finality warning as its caption, behind the
  confirmation dialog. Rendered only while cancellable.
- **Order row** (`/orders`) — title, placed date + state note, status badge, amount, View link.
  The whole row's primary affordance is the link to the order.

## Interaction notes

- **Thin async pages (ADR-013):** `/orders` and `/orders/[orderId]` are async shells over
  synchronous, component-testable views; a new `src/data/server/orders.ts` is the single data
  path. Placing and cancelling are Server Actions following `seller-listings/actions.ts` —
  re-parse with shared contracts, map `ApiError` codes to typed failures, `redirect` on success.
- **Placing an order redirects to `/orders/<id>`** (UC-001 B7); the fresh order page is the
  success state. No toast is needed — the page itself is the confirmation.
- **Availability is only ever decided by the order attempt.** The confirm step does not re-check
  stock before submitting; the API's refusal is the truth and the refusal state presents it
  (UC-001 A3/A4).
- **Amounts** use the existing SEK formatter; never öre. **No fee anywhere** (D12).
- **The expiry is prominent while unpaid** — an absolute time ("Held for you until 13 Nov,
  14:12"); a countdown is a spec follow-up idea, not this slice.

## Accessibility requirements

- One H1 per page ("Confirm your order" / "Your order" / "Your orders"); sections are H2s in
  reading order. The timeline is an `<ol>` (it is ordered); snapshot specs are `<dl>` pairs.
- The status badge never relies on colour alone — the status word is always in it, and terminal
  states state their reason in text (UC-014 A2).
- The next-step line reads as page content near the top of the accessibility tree, not as an
  aside; after a cancel, the state change is announced via a live region.
- The confirm step's primary and secondary actions are real buttons with distinct names; the
  pending state keeps the button in the tree with `aria-disabled` and a progress announcement.
- `/orders` rows: one link per row whose accessible name is the listing title (the catalogue-card
  rule); the paging controls are buttons with "Newer"/"Older" names and the page position as text.
- Skeletons are `aria-hidden`; each loading state announces itself once.

## Open questions

- **Mobile**, as everywhere: part of the product-wide mobile pass (see `catalogue-search.md`).
  The states and copy above are layout-independent on purpose.
- **Where "Your orders" sits in the signed-in header** once seller navigation is also present —
  settle at implementation with the existing header.
