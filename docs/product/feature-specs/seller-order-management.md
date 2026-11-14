# Feature Spec: Seller Order Management

## Status

**Approved 2026-11-14; UC-015 shipped the same day.** Shaped for the Phase 6 slice "Seller sees the orders their organization received", scheduled ahead of buyer payment ([roadmap](../roadmap.md)). D1–D6 were approved and Q1–Q3 settled by the founder on 2026-11-14 (see [Decisions](#decisions)). Fulfillment, the dashboard, and settlement remain to be shaped here for Phase 5.

This spec opens the seller's side of the order lifecycle. Its first use case is read-only:

- [UC-015](../use-cases/UC-015-member-reviews-received-orders.md) — a member reviews the organization's received orders. **Implemented** on API and web, 2026-11-14.
- Fulfillment (P0-008–P0-010), the seller dashboard (P0-015), and settlement status per order (P1-006) belong here too and are written as their own use cases when Phase 5 is shaped. They are listed so this spec is the place they land, not so they are built now.

## Summary

A seller organization sells a laptop the moment a buyer orders it, yet no member of the organization can see that an order exists. This feature gives every member a list of the orders their organization has received and one page per order showing what was sold, to whom, where it stands, and whose move it is. It changes nothing: no seller action exists before Phase 5. It completes order visibility — buyer ([UC-014](../use-cases/UC-014-buyer-reviews-their-orders.md)), seller (this), operator (a later Phase 6 slice) — before the payment slice lights up "Payment secured" for a seller who, today, has nowhere to see it.

The backend already lets a seller member read a single order by its id (`GET /api/orders/:orderId`, authorized by membership since UC-003). It has no list of an organization's orders and does not say who the buyer is. Both are the recorded backend exception for this slice (D5, P1-023).

## Problem

The Phase 6 goal is that every behavior the backend implements is usable in the browser by the role it belongs to. Orders are visible to sellers on the API and invisible to them in the product. A seller who publishes a listing today cannot tell whether anyone has ordered it, whether that order was paid, or whether it lapsed and the unit went back on sale. The seller's "payment secured, your turn" moment that [UC-004](../use-cases/UC-004-buyer-pays-into-escrow.md) P6 promises has no surface. Building payment first would deliver that signal to nobody.

## Target users

- **Seller organization member** (owner, manager, viewer) — wants to know which units are committed, which are paid for, and which came free again, without asking the operator.
- **Buyer** — indirectly: a seller who can see the order is a seller who can prepare to fulfill it.
- **Marketplace operator** — not a user of this feature; the operator order view is its own slice. The same order read serves both.

## Goals

- Every member of a seller organization can find every order the organization has received and open any of them.
- A received order explains itself from the seller's side: what was sold, to whom, for how much, what state it is in, and whose move it is now.
- The seller's view and the buyer's view of one order come from the same record and never disagree.

## Non-goals

- **Any seller action on an order.** Starting fulfillment, posting updates, marking ready for confirmation are Phase 5 (P0-008–P0-010). The page shows no actions and says so where the next step would go.
- **Grouping, counts, filters, and "needs my attention".** The list is plain (D1). Attention grouping is the seller dashboard, P0-015, where fulfilled and completed orders exist to group.
- **Settlement, fee, released amounts.** P1-006 (Phase 5). The fee is charged at release; before that there is nothing to show (Q2).
- **Buyer contact details or messaging.** The seller sees who ordered by display name only (D3); messaging on an order is P2-009.
- **Notifications** ("you received an order", "an order was paid") — P1-007.
- **Operator views of an order** — the operator slice later in Phase 6.
- **Mobile layout** — the product-wide mobile pass.

## User journey

```text
A member opens the seller area
→ opens "Orders" in the seller navigation
→ sees the organization's received orders, newest first, each with its state
→ opens one order
→ reads what was sold, to whom, the amount, where it stands, and whose move it is
→ (Phase 5) acts on it
```

## Main flow

1. A member opens `/seller/orders` and sees every order placed on the organization's listings, every status, newest first, 12 per page.
2. The member opens one order.
3. The page shows the status, the buyer's display name, the amount, what was promised at the time of ordering (the immutable snapshot), the expiry while unpaid, and the timeline.
4. It states, in one line owned by the product, whose move it is now — the buyer's (pay), nobody's (cancelled or expired), or the seller's once fulfillment exists (D4).
5. No action is offered. Where Phase 5's actions will go, the page says that fulfillment opens in a later release.

## Edge cases

- **The organization has no orders yet.** The list says so and links to the organization's listings.
- **The organization is deactivated.** Its members still read orders; orders placed before deactivation proceed untouched (UC-003 scope decision 5).
- **The order's buyer account changes its display name.** The seller sees the current name; the order record is unchanged.
- **An order of another organization** (by pasted URL) renders as not available, the same way an unknown id does (UC-014 E1).
- **A platform admin opens `/seller/orders`.** The existing staff notice: marketplace staff do not sell. Staff read orders through the operator surface.
- **A buyer who is also a member of a different organization** sees their purchases under `/orders` and their organization's sales under `/seller/orders`; the two never mix.

## States and status changes

None. This feature only reads. The states it renders are the order's existing ones: `Awaiting payment`, `Paid into escrow`, `Cancelled` (buyer-cancelled or expired), with payment state `none`, `in progress`, `paid`, `failed`, `returned` ([UC-004](../use-cases/UC-004-buyer-pays-into-escrow.md)).

## Permissions

| Action                                             | Allowed users                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| List the organization's received orders            | Any member of that organization: owner, manager, viewer (D2)     |
| Open one received order                            | Any member of the selling organization (already so since UC-003) |
| See the buyer's display name on an order           | Members of the selling organization, platform admins (D3)        |
| See the buyer's email, address, or account details | Nobody on the seller side                                        |

## Timeline entries

No new entries. The seller page renders the entries that already exist: `order_created`, `order_cancelled`, and the payment entries from UC-004. Their wording was addressed to the buyer ("Your payment is held safely in escrow… until you confirm delivery"); since Q1 every entry reads in the neutral third person ("The buyer's payment is held safely in escrow… until the buyer confirms delivery"), so one wording serves buyer, seller, and staff.

## Notifications

None in this slice. "You received an order" and "an order was paid" are P1-007.

## Business rules

- A member sees the orders of their own organization only; one person belongs to at most one organization (PD-0003), so there is exactly one list.
- The order page shows the snapshot captured at ordering, never the listing as it is now (UC-001).
- The seller-facing order shows the buyer by display name only; no email or other account detail (D3).
- The seller-facing order shows no fee amount and no fee rate until settlement status exists (Q2).
- Nothing on the seller side changes an order before Phase 5.

## Acceptance criteria

Refined with the slice; the shape to hit:

- [x] Any member (owner, manager, viewer) of an organization lists its received orders at `/seller/orders`, newest first, 12 per page with paging controls, each with what was sold, the buyer's display name, the status in plain language, and the amount.
- [x] A member opens a received order and sees status, the snapshot, the buyer's display name, the amount, the expiry while unpaid, the full timeline, and one next-step line from the seller's point of view.
- [x] No seller action is offered; the page says fulfillment opens in a later release.
- [x] A member of a deactivated organization can still read its orders.
- [x] An order of another organization, or an unknown id, renders as not available.
- [x] A platform admin, and a signed-in user without an organization, never see a seller order list.
- [x] The API lists an organization's orders for its members and names the buyer on order responses (P1-023); a buyer's own view of their order is unchanged in meaning.
- [x] Timeline entries never address the seller as if they were the buyer (Q1).

## Success metrics

- **Demo completeness:** a seller sees a buyer's order appear in `/seller/orders` and open, through the web UI against the real backend.
- **Orders opened by a seller member before payment**, as a share of orders placed — whether sellers watch incoming demand at all before notifications exist.

## Product risks

- **Neutral timeline wording reads a shade colder to the buyer** than the second person it replaced (Q1). Each surface's own next-step line carries the warmth; revisit if buyers report the timeline as impersonal.
- **Scope creep into the dashboard.** "Which orders need me" is one filter away. The fence is D1: no grouping, no counts, no filters in this slice.
- **Exposing buyer identity.** The display name is a self-chosen, already-public-to-the-platform value; nothing else leaves the identity module. If display names turn out to carry real names unexpectedly, the question becomes one for the identity area, not this feature.
- **One more Phase 6 exception.** This is the fourth backend change inside a "no new backend behavior" phase. Each has been read-only or an authorization gap; this one is a read. The phase rule holds as long as the exceptions stay listed.

## Decisions

Approved by the founder on 2026-11-14. Numbered from D1 because this is a new spec.

- **D1 — The received-orders list is plain.** Every order of the organization, every status, newest first, 12 per page (one paging idiom with the catalogue and `/orders`). No grouping, no counts, no filters: the seller dashboard (P0-015) does that when fulfilled and completed orders exist to group.
- **D2 — Every member role reads orders, including viewers.** Mirrors UC-010 for listings: reading the organization's business is what a viewer is for. Members of a deactivated organization keep reading.
- **D3 — The seller sees the buyer by display name only.** Enough to recognize repeat buyers and to address a parcel label later; never the email, never account details. The name is resolved when the order is read, so it follows the buyer's account like the seller's organization name does for the buyer (P1-020).
- **D4 — The product owns the seller page's next-step line, worded from the seller's side.** The same rule as the buyer's D11, with the seller's perspective: while unpaid, "Waiting for the buyer to pay — the unit is held until <expiry>"; when paid, "Payment secured — the buyer's money is in escrow. Fulfillment opens in a later release"; when cancelled or expired, "Nothing to do — the unit is back on sale". The line is the only forward-looking statement on the page; the timeline reads as history (Q1).
- **D5 — Backend exception, recorded as P1-023.** Two reads the use case needs and the API lacks: a list of an organization's orders for its members, and the buyer's display name on order responses (through the identity-backed directory port that already names sellers). No new commands, no new state, no new events.
- **D6 — One order page shape for buyer and seller.** The seller's order page is the buyer's layout — snapshot and timeline, sticky status panel — with the buyer named where the seller is named for the buyer, no actions, and the seller-side next-step line. Building the page once means Phase 5's seller actions slot into an existing panel. Settled at approval: the seller's page is titled with the listing, with the buyer named beneath it; the seller home gains an "Orders" card beside "Your listings", because the home's cards are what a seller does next and an order to watch is exactly that.

## Settled questions

Settled by the founder on 2026-11-14, following the recommendations.

- **Q1 — Whose words are the timeline entries?** The API's per-entry description and `nextStep` are written to the buyer ("Your payment…", "Pay to secure…"). Options: (a) the API words entries for the viewer — buyer, seller, staff — since it already knows who is asking; (b) the API returns neutral third-person wording for everyone ("The buyer's payment is held in escrow until they confirm delivery") and the product keeps perspective in its own next-step line; (c) the seller page shows titles and timestamps only. **Settled: (b).** It keeps one wording per event, removes the drift D11 warned about, and only touches presentation; it does change the buyer's already-shipped entry texts, which is acceptable before any release. (a) is the fallback if the founder wants the buyer's second-person voice kept.
- **Q2 — Does the seller see the fee rate on a paid order?** The fee is seller-borne and frozen at payment (PD-0004), so showing "8% fee will be taken at release" is honest and arguably expected. **Settled: not in this slice.** Nothing is charged before release, and P1-006 (settlement status per order) is where the amount, rate, and released sum appear together; one partial money line now invites questions the product cannot yet answer.
- **Q3 — Does the seller see the expiry time of an unpaid order?** It is the moment the unit may return to stock. **Settled: yes**, as the plain fact it is; it is on the buyer's page already and not sensitive.

## Follow-up ideas

- A "needs you" count on the seller navigation once fulfillment exists (P0-015).
- Search and status filters on the received-orders list, alongside the listings list's (P2-022).
- Orders per listing: a link from the seller's listing page to its orders.
