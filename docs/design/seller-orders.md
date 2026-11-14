# Design: Seller received orders (the organization's orders, one received order)

- **Status:** approved and implemented (14 November 2026). No mockup round: both pages reuse
  approved layouts (decision 1 below). Settled at approval: the order page is titled with the
  listing and names the buyer beneath it; the seller home gains an "Orders" card.
- **Figma:** none; the approved buyer order pages and the seller listings list are the design
  input (`/orders`, `/orders/[orderId]`, `/seller/listings`).
- **Related use case:** `docs/product/use-cases/UC-015-member-reviews-received-orders.md`
  (Implemented)
- **Related spec:** `docs/product/feature-specs/seller-order-management.md`
- **Related decisions:** PD-0003 (roles: viewers read), PD-0004 (fee is seller-borne; not shown
  before settlement, Q2), ADR-011 (cookie session), ADR-013 (thin async pages)
- **Related backlog item:** P1-023 (organization order list and the buyer's name on order
  responses — the backend exception for this slice)
- **Roles affected:** seller (owner, manager, viewer). Buyers and platform admins appear only in
  what they must not see.

## Why this slice

Orders are readable by sellers on the API and invisible to them in the product. Payment is the
next slice and produces a "Payment secured" moment for the seller; this slice gives that moment a
place to land, and gives Phase 5's fulfillment actions the page they will live on.

## Direction decisions (settled 2026-11-14)

1. **Reuse, don't redesign.** `/seller/orders` is the seller listings table's shape with order
   rows; `/seller/orders/[orderId]` is the buyer's order page (sticky status panel direction,
   chosen 2026-11-12) with the seller's framing. One order page component tree, two perspectives.
2. **No actions, and an honest placeholder.** The status panel's action slot says "Fulfillment
   opens in a later release" rather than hiding the slot, so the page already reads as the place
   where the seller will act.

## Routes & entry points

Every route lives inside the existing `app/(seller)/` group under the protected `/seller` prefix.

| Route                      | Purpose                                                                   | Use case     |
| -------------------------- | ------------------------------------------------------------------------- | ------------ |
| `/seller/orders`           | The organization's received orders, every status, newest first, `?page=N` | UC-015 R1    |
| `/seller/orders/[orderId]` | One received order: status, buyer, snapshot, timeline, next step          | UC-015 R2–R5 |

- **Seller sub-navigation** gains "Orders": "Overview · Listings · Orders" (the members slice will
  add "Team").
- **Seller home** (`/seller`) gains a "Your orders" card linking to `/seller/orders`, beside
  "Your listings".
- **Arrived at from:** the sub-navigation, the home card, and links. A link to another
  organization's order or an unknown id renders the route's `not-found` (UC-015 E1).

## User states

### Shared by both routes

- **Anonymous:** `proxy.ts` sends them to sign-in with `next` preserved (as today).
- **Signed in, no organization:** redirected to `/seller/setup` (UC-015 E2).
- **Platform admin:** the existing `StaffNotice`; no list, no order (UC-015 E2).
- **Organization deactivated:** the existing deactivation banner above the content; everything
  remains readable (UC-015 A5).
- **Any role:** identical content for owner, manager, viewer (D2). There is nothing to hide
  because there is nothing to do.

### `/seller/orders` (UC-015 R1)

- **Loading:** `loading.tsx` with a skeleton table of 5 rows; the heading renders.
- **Empty:** "No orders yet" with one line ("When a buyer orders one of your listings it shows up
  here.") and a link to `/seller/listings` (UC-015 A1). Never a blank page.
- **Success:** heading "Orders" with the total ("7 orders"), the table, pagination at 12 with
  Newer/Older and "Showing x–y of z" (D1).
- **Past the last page** (stale link): empty table body with "There's nothing on this page" and a
  link to the first page (the listings list's rule).
- **Recoverable error:** inline error with Retry; never presented as "no orders" (UC-015 E3).

### `/seller/orders/[orderId]` (UC-015 R2–R5)

- **Loading:** skeleton of the page's real shape, `aria-hidden`, announcing "Loading order".
- **Awaiting payment, no payment in progress:** status badge "Awaiting payment", the expiry
  ("Unit held for the buyer until <time>", Q3), the seller-side next-step line ("Waiting for the
  buyer to pay…", D4), the timeline, the snapshot with the buyer's name.
- **Awaiting payment, payment in progress:** badge unchanged, payment state "Payment in progress"
  in the panel, next-step line "The buyer's payment is being processed — the unit stays held
  meanwhile" (UC-015 A4).
- **Paid into escrow:** success badge, "Payment secured — the buyer's money is held in escrow",
  next-step line "Your move next: fulfillment opens in a later release" (UC-015 A3). No fee
  amount, no fee rate (Q2).
- **Cancelled / expired:** neutral badge with the reason stated, next-step line "Nothing to do —
  the unit is back on sale" (UC-015 A2). The two differ only in the stated reason.
- **Not found / forbidden:** "This order is not available" with a link to `/seller/orders`, never
  distinguishing the two (UC-015 E1); `not-found.tsx`.
- **Recoverable error:** inline error with Retry, worded distinctly from "not available"; `error.tsx`.

## Key components

- **Order row** (`/seller/orders`) — listing title (the row's link), buyer display name, placed
  date, status badge, the note that matters for the state (expiry while unpaid; reason when
  cancelled; "paid" date when paid), amount. Mirrors the buyer's `/orders` row with the buyer
  column added.
- **Status header** — the listing title as the H1 + status badge, with "Ordered by <display
  name> · Placed <date>" beneath (founder's choice over "Order from <name>"), order reference in
  the breadcrumb.
- **Next-step line (D4)** — one forward-looking sentence owned by the web app, from the seller's
  side; the only forward-looking statement on the page.
- **Timeline section** — the buyer page's "What has happened" list, same component. Its entry
  texts depend on Q1: with the recommended neutral wording the component is unchanged; with
  viewer-aware wording the API supplies seller text and the component is still unchanged.
- **Snapshot panel** — "What was sold", framed as immutable, the buyer page's `<dl>`; the seller
  line is replaced by the buyer line ("Ordered by <display name>").
- **Action slot** — the panel region that holds the buyer's cancel/pay actions renders the
  placeholder text from decision 2. No buttons.

## Interaction notes

- **Thin async pages (ADR-013):** both routes are async shells over synchronous, component-tested
  views; `src/data/server/orders.ts` gains the organization list and reuses the order read.
- **One view-model, two perspectives.** The order view-model gains a `perspective: 'buyer' |
  'seller'` input that selects the next-step line, the counterpart name shown, and whether
  actions exist. Status words and badges are shared so the two pages never disagree about state.
- **Amounts** use the existing SEK formatter; never öre.
- **Nothing is written.** No Server Actions in this slice.

## Accessibility requirements

- One H1 per page ("Orders" / the listing title); sections are H2s. The timeline is an `<ol>`;
  snapshot specs are `<dl>` pairs.
- The status badge carries its word; terminal states state their reason in text.
- `/seller/orders` rows: one link per row named by the listing title; the buyer name is a plain
  cell, not a link (there is no buyer page to go to). Paging controls are buttons with
  Newer/Older names and the page position as text.
- Skeletons are `aria-hidden`; each loading state announces itself once.

## Open questions

- Q1 settled as neutral wording from the API; the shared timeline component is unchanged.
- **Mobile**, as everywhere: part of the product-wide mobile pass.
