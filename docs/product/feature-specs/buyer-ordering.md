# Feature Spec: Buyer Listing Detail and Ordering

## Status

**Approved — 2026-11-07.** Shaped for the Phase 6 deliverable "Buyer listing detail and order placement" ([roadmap](../roadmap.md)). Decisions D1–D8 were settled by the founder on 2026-11-07 (see [Decisions](#decisions)); no questions block the first slice.

The feature is delivered in two slices, and only the first is refined to build depth:

1. **Listing detail (this slice).** The buyer opens a listing and reads everything they need to decide. Settled as [UC-012](../use-cases/UC-012-buyer-views-listing-details.md) (Approved) with the design contract [`buyer-listing-detail.md`](../../design/buyer-listing-detail.md). Closes [#15](https://github.com/ab316/marketplace-platform/issues/15).
2. **Ordering, cancellation, and the buyer's orders (next).** Settled in outline only: [UC-001](../use-cases/UC-001-buyer-orders-refurbished-laptop.md) (place the order, already built on the API), [UC-013](../use-cases/UC-013-buyer-cancels-unpaid-order.md) (cancel an unpaid order, already built on the API), and [UC-014](../use-cases/UC-014-buyer-reviews-their-orders.md) (Draft — the order page and the order list). These are refined before their slice is built, not now.

## Summary

The catalogue is where a buyer finds a laptop; this feature is everything between finding it and owing money for it. The buyer opens a listing, reads every disclosure the seller had to publish, sees who is selling it, and places an order that holds one unit for 24 hours. They can cancel that order while it is unpaid, and they can come back to it later to see where it stands.

The backend already does all of it — `GET /api/listings/:listingId`, `POST /api/orders`, `POST /api/orders/:orderId/cancel`, `GET /api/orders/:orderId`, `GET /api/buyer/orders` have been live since Phases 1–4. Nothing in the web app reaches any of it, and catalogue cards are not even links. This feature is the buyer's half of the Phase 6 demo.

## Problem

A buyer can search the catalogue (UC-006) and then stops. The result cards are non-interactive list items, there is no `/listings/[id]` route, and there is no way to order anything in a browser ([#15](https://github.com/ab316/marketplace-platform/issues/15)). The seller's half of the demo now works end to end, so the product can publish listings nobody can buy.

Two gaps in settled behavior surfaced while shaping this:

- **The buyer cannot see who is selling.** [UC-001](../use-cases/UC-001-buyer-orders-refurbished-laptop.md) B2 requires the seller organization on the listing detail, and the [catalogue design](../../design/catalogue-search.md) puts its name on every card. Neither the listing nor the order carries anything but an organization id, and the organization profile is readable only by its own members and operators. A buyer is asked to send money to an anonymous counterparty.
- **Anyone signed in can order anything,** including a member ordering their own organization's listing and a platform admin ordering as if they were a buyer. No rule covered this; [UC-003](../use-cases/UC-003-seller-organization-and-member-management.md) E7 only stops staff from selling.

Current workaround: none in the browser. The API can be called directly, which is not a product.

## Target users

- **Buyer, anonymous** — reads a listing, decides, and is asked to sign in only when they order.
- **Buyer, signed in** — orders one unit, cancels it while unpaid, and follows it afterwards.
- **Seller organization member** — indirectly: their published disclosures and their organization's name are what the buyer judges.
- **Marketplace operator** — not a user of this feature. Operator inspection is a later Phase 6 slice.

## Goals

- A buyer can go from a catalogue result to a placed order in the browser, without surprises about what they are buying or from whom.
- Every disclosure the publish bar demands is shown, in buyer language, on one page.
- A listing that can no longer be ordered says so plainly instead of disappearing or failing.
- Placing an order is deliberate: the buyer confirms what they are committing to, and knows no money moves yet.

## Non-goals

- **Payment.** The Pay action and the escrow flow are the next Phase 6 slice ([UC-004](../use-cases/UC-004-buyer-pays-into-escrow.md)). The order page shows what to do next in words, with no payment affordance.
- **A buyer order dashboard.** `/orders` is a plain list; grouping by what needs action is P0-014 (Phase 5), together with the seller dashboard.
- **A public seller profile page.** Buyers see the seller's name where it matters, not a page about the organization. Trust statistics are P2-005; seller contact details, ratings, and reviews (P2-008) stay out.
- **Quantities above one, carts, offers, saved listings, and photos** — MVP non-goals, unchanged ([UC-001](../use-cases/UC-001-buyer-orders-refurbished-laptop.md) scope decision 4; P2-001, P2-004, P2-007, P3-012).
- **Changing or re-ordering a cancelled order.** The buyer places a new one.
- **Notifications** of any kind (P1-007), including "your order is about to expire".
- **Operator and seller views of an order.** Both are later slices.

## User journey

```text
Buyer searches the catalogue
→ opens a result and reads the full disclosures and who is selling
→ chooses to order; signs in if they have not
→ confirms what they are committing to — one unit, this price, no payment yet
→ lands on the order page: awaiting payment, held for 24 hours, what happens next
→ cancels it, or leaves it and comes back to it from their orders
```

## Main flow

1. A buyer opens a listing from the catalogue, a shared link, or a bookmark. No sign-in is needed to read it ([UC-012](../use-cases/UC-012-buyer-views-listing-details.md)).
2. The page shows the listing's disclosures, its price, the selling organization's name, and whether it can be ordered. It links back to the catalogue the buyer came from, with their refinements intact.
3. The buyer chooses to order. A signed-out buyer signs in first and returns to the same listing (D5).
4. The buyer confirms the order: one unit, this price, no payment taken yet, the unit held for 24 hours (D2).
5. The order is created in `Awaiting payment`, one unit is reserved, and the listing snapshot is captured ([UC-001](../use-cases/UC-001-buyer-orders-refurbished-laptop.md)).
6. The buyer lands on the order page: status, what they ordered, who from, the expiry time, the timeline, and the next step. Paying is described but not yet possible ([UC-014](../use-cases/UC-014-buyer-reviews-their-orders.md), D6).
7. The buyer cancels the unpaid order, and the unit returns to the listing's stock ([UC-013](../use-cases/UC-013-buyer-cancels-unpaid-order.md)) — or leaves it, and finds it again in their orders.

## Edge cases

- **The last unit goes while the buyer reads the page.** Ordering is refused with "no longer available", and the page offers the catalogue. No reservation leaks (UC-001 A3).
- **The listing is archived while the buyer reads the page.** Same refusal (UC-001 A4). The page itself keeps working, marked "no longer sold" (D4).
- **The buyer opens a sold-out or archived listing from a stale search result.** The page renders in full, with availability stated plainly and no order action (D4).
- **The buyer opens a draft, a listing of a deactivated seller, or an unknown id.** Not found — to a buyer these do not exist (D4), matching the behavior the API has today.
- **A member of the selling organization, or a platform admin, opens the listing.** The page explains why they cannot order it instead of offering a dead button (D3).
- **A buyer who is a member of a _different_ organization orders.** Allowed. Sellers buy from each other like anyone else (D3).
- **The buyer double-submits the order.** A second order must not be created by one intent. The web guards the action, but this is a mitigation, not a guarantee: `Idempotency-Key` handling is deferred to the "Backend reliability" block (see [Product risks](#product-risks)).
- **The buyer orders the same listing twice deliberately.** Allowed today; each order holds its own unit (D8).
- **The buyer signs in to order and the listing has gone by the time they return.** They land on the listing page in its unavailable state, not on an error.
- **The buyer cancels an order that already expired.** The product states the order is already cancelled; nothing changes and no unit is released twice (P1-013, unchanged).

## States and status changes

No new status is introduced. This feature is the buyer-facing surface of transitions that already exist.

| Current state                     | Action                  | New state          | Notes                                                                            |
| --------------------------------- | ----------------------- | ------------------ | -------------------------------------------------------------------------------- |
| Listing `Active`, units available | Buyer confirms an order | `Awaiting payment` | One unit moves from available to reserved; snapshot captured; expiry set to 24 h |
| Listing `Active`, no units free   | Buyer attempts to order | —                  | Refused; the page states the listing is currently unavailable                    |
| Listing `Archived`                | Buyer attempts to order | —                  | Refused; the page states the listing is no longer sold                           |
| Order `Awaiting payment`          | Buyer cancels           | `Cancelled`        | Reservation released; reason `buyer_cancelled` (UC-013)                          |
| Order `Awaiting payment`          | 24 hours pass unpaid    | `Cancelled`        | Reason `expired`; unchanged behavior (UC-001 A2)                                 |
| Order `Awaiting payment`          | Buyer pays              | `Paid into escrow` | The next slice (UC-004); this feature only describes it                          |
| Order `Cancelled`                 | Any buyer action        | —                  | Terminal. The buyer may place a new order                                        |

## Permissions

| Action                                   | Allowed users                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| View a published listing's detail        | Anyone, including anonymous visitors                                                                     |
| View a draft listing                     | Members of the owning organization and operators (unchanged, UC-005)                                     |
| View a listing of a deactivated seller   | Members of that organization and operators only (unchanged, UC-003 E6)                                   |
| Place an order                           | Any signed-in user who is **not** a member of the selling organization and **not** a platform admin (D3) |
| Cancel an unpaid order                   | The buyer who placed it                                                                                  |
| View an order                            | Its buyer, members of the selling organization, and operators (unchanged)                                |
| View the list of the caller's own orders | The signed-in user, their own orders only                                                                |

## Timeline entries

No new entries. The buyer-facing surface renders the entries that already exist: `order_created`, `order_cancelled`, and the payment entries from UC-004. Each must read as plain language with its "what next" (P0-012, [idea 001](../ideas/001-trust-centered-order-timeline.md)).

## Notifications

None. Notification infrastructure is P1-007; an unpaid order expires silently, which is why the expiry time is prominent on the order page.

## Business rules

Recorded in [`business-rules-policies.md`](../business-rules-policies.md): the new rules are **who may place an order** (order creation) and **seller identity visible to buyers** (listing lifecycle). In short:

- A buyer sees the selling organization's name wherever they judge or commit to a purchase: the catalogue card, the listing detail, and the order.
- A member of the selling organization cannot order that organization's listing. A platform admin cannot place orders at all.
- Everything else is unchanged: orders only from active listings with available stock, one unit per order, SEK only, 24-hour unpaid expiry, and an immutable snapshot of what was promised.

## Acceptance criteria

Slice 1 — listing detail (built against [UC-012](../use-cases/UC-012-buyer-views-listing-details.md)):

- [ ] Every catalogue result is one keyboard-accessible link whose accessible name is the listing title; it opens `/listings/<id>`.
- [ ] The detail page shows every required disclosure, the condition grade spelled out in words, the price in SEK, the fulfillment expectations, and the selling organization's name.
- [ ] The page works signed out and signed in, and renders loading, not-found, recoverable-error, sold-out, and archived states.
- [ ] A sold-out or archived listing is readable, says so prominently, and offers no order action.
- [ ] A draft, a deactivated seller's listing, and an unknown id are all "not found" to a buyer.
- [ ] The buyer can return to the catalogue with their refinements intact.
- [ ] Opening a listing never reserves stock and never changes any state.
- [ ] The seller's name reaches the catalogue card and the listing detail through the shared API contracts (P1-020).

Slice 2 — ordering and orders (refined with that slice):

- [ ] An eligible signed-in buyer orders one unit after an explicit confirmation step that states the price and that no payment is taken yet.
- [ ] A signed-out buyer is sent to sign in and returned to the listing; no order is ever placed on their behalf.
- [ ] A member of the selling organization and a platform admin are told why they cannot order, and the API refuses them (P1-021).
- [ ] Racing buyers never oversell: the loser is told the listing is unavailable and no reservation leaks.
- [ ] The order page shows status, what was ordered, the seller, the expiry, the full timeline, and the next step — with no payment affordance until UC-004's slice.
- [ ] The buyer can cancel an unpaid order after confirming, and the unit returns to stock.
- [ ] `/orders` lists the buyer's own orders, newest first, each with its status and a link to the order.

## Success metrics

- **Demo completeness:** the Phase 6 buyer journey — search → listing → order — runs in the browser against the real backend.
- **Detail-to-order rate:** share of listing-detail views that result in an order. No baseline exists; this is the first time the funnel can be measured at all.
- **Failed order attempts:** orders refused as unavailable, as a share of attempts. A rising number means the catalogue is showing stale stock.

## Product risks

- **No `Idempotency-Key` on order creation.** A retried or double-submitted request can create a second order that holds a second unit, which the buyer then has to cancel. Durable idempotency is in the "Backend reliability" block and gates release; the web-side guard (disable on submit, redirect on success) narrows the window but does not close it.
- **Reservation and order creation are still not atomic** (ADR-007, open). The failure is compensated, not prevented; putting a real buyer in front of it makes the gap visible sooner, which argues for the reliability block landing before any release.
- **A buyer can hold several units of one listing** with unpaid orders and starve other buyers for 24 hours (D8, P1-022). Acceptable while the marketplace has no real traffic.
- **The seller's name becomes buyer-visible content** that the seller can change at any time through the organization profile (UC-003). An order shows the current name, not the name at the time of the order, so a renamed organization changes what old orders read. Accepted: the snapshot protects the offer, not the counterparty's identity, and operators keep the audit trail.
- **An anonymous buyer builds the whole intent and only then meets a sign-in wall.** Measured by sign-ins that arrive with a `next` pointing at a listing; if the drop-off is bad, move the prompt earlier.

## Decisions

Settled by the founder on 2026-11-07.

- **D1 — The buyer sees who is selling.** Listing responses carry a small seller summary (organization id and name), which puts the name on the catalogue card and the listing detail; the order response carries the same, so the order page can show it. The detail page's seller section is built to grow: contact details, response time, completed orders, and other trust signals are expected there later ([P2-005](../product-backlog.md), [idea 001](../ideas/001-trust-centered-order-timeline.md)), and a public seller profile page may follow. Only the name is exposed now — nothing a seller has not already agreed is public. This is a **backend change**, recorded as a Phase 6 exception and tracked as **P1-020**.
- **D2 — Ordering has an explicit confirmation step.** The buyer reviews what they are committing to — the listing, one unit, the price, that no payment is taken yet, and that the unit is held for 24 hours — and confirms. One order is a 24-hour commitment of someone else's stock; a single stray click should not create it.
- **D3 — Sellers do not order from themselves, and staff do not order at all.** A member of the selling organization (any role) cannot order that organization's listing: there is no real purchase, and it would corrupt the marketplace's own order and fee data. A platform admin cannot place orders at all, mirroring UC-003 E7 ("staff never sell") — staff are not participants. A member of a _different_ organization orders like any other buyer. The web hides the action and explains why; the API enforces it. This is a **backend change**, recorded as a Phase 6 exception and tracked as **P1-021**.
- **D4 — A listing that cannot be ordered still opens, and says why.** Sold out → the page renders in full, marked "Currently unavailable", with the reason that units may return if a reservation lapses. Archived → the page renders in full, marked "No longer sold", so links from old orders and shared links keep working. Draft, deactivated seller, or unknown id → not found, which is what the API already does. [UC-006](../use-cases/UC-006-buyer-searches-the-catalogue.md) A3 is amended to match: it previously promised a page for a deactivated seller's listing.
- **D5 — Sign-in returns the buyer to the listing, and never orders for them.** The order action on a signed-out page goes to `/sign-in?next=/listings/<id>`, the mechanism the seller area already uses. After signing in the buyer is back on the listing with the same content and confirms the order themselves. An intent captured before sign-in is not a commitment, and replaying it would place an order the buyer never confirmed while signed in.
- **D6 — The order page is built in full now, without payment.** It renders status, the snapshot, the seller, the expiry, every timeline entry the API returns (including the paid and cancelled shapes), and the next step in words. No Pay button until UC-004's slice adds one. Building the page once avoids a throwaway version.
- **D7 — `/orders` is a plain list.** The buyer's orders, newest first, each with status, what it was, and a link. Grouping by what needs action stays with the buyer dashboard (P0-014, Phase 5) where completed and fulfilled orders exist to group.
- **D8 — Several unpaid orders by one buyer on one listing stay allowed.** Each order holds its own unit, so nothing oversells. A per-buyer limit is captured as **P1-022** and left unscheduled; the risk is recorded above.

## Open questions

- **Mobile.** Unresolved for the product as a whole, not for this surface in particular — see the open question in [`catalogue-search.md`](../../design/catalogue-search.md). The listing detail page uses the implementer's breakpoints until the product-wide mobile pass happens.
- **Does the buyer need the exact number of units left?** UC-001 B2 says "in stock" is enough and exact counts are optional. The first version shows availability, not a count. Revisit if buyers ask, or if scarcity turns out to matter for conversion.

## Follow-up ideas

- **A public seller profile page** (`/sellers/<id>`): name, what they sell, and over time the trust signals from P2-005. The listing detail's seller section becomes a link to it.
- **"Notify me when it is back"** for a sold-out listing — needs notifications (P1-007) and restocking (P1-011).
- **Show the buyer the time left on the hold as a countdown** rather than an absolute expiry time, once orders have real traffic.
