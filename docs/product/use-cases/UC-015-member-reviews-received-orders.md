# UC-015: Member Reviews the Organization's Received Orders

Owner: product (ordering, seller side)
Status: Implemented
Surfaces: API ✓ · Web ✓ (shipped 2026-11-14; design contract [`docs/design/seller-orders.md`](../../design/seller-orders.md))
Last updated: 2026-11-14

First use case of the [seller order management spec](../feature-specs/seller-order-management.md) (decisions D1–D6, questions Q1–Q3). New: no use case has described the seller's view of an order. [UC-001](UC-001-buyer-places-an-order.md) reserves the seller's unit, [UC-004](UC-004-buyer-pays-into-escrow.md) P6 says "the seller sees the same order with Payment secured", and [UC-003](UC-003-seller-organization-and-member-management.md) grants members read access to their organization's orders — but nothing says what a member sees, or how they find an order at all.

**Approved and implemented 2026-11-14.** D1–D6 were approved by the founder and Q1–Q3 settled (see the spec's [Decisions](../feature-specs/seller-order-management.md#decisions)). Before this slice a member could read one order by id over the API (membership authorization since UC-003) but had no list, no buyer name, and no web surface; timeline entries were worded for the buyer. Now: `GET /api/seller/orders` for any member role, every order response names its buyer by display name (P1-023), timeline entries read in the neutral third person for every viewer, and `/seller/orders` plus `/seller/orders/[orderId]` render every state below.

The read-only mirror of [UC-014](UC-014-buyer-reviews-their-orders.md). Seller actions on an order are Phase 5 use cases, not here.

## Goal

A member of a seller organization finds an order the organization received and understands what was sold, to whom, where it stands, and whose move it is.

## Primary Actor

- Seller organization member, any role (owner, manager, or viewer)

## Stakeholders

- **Seller organization** — wants to know which units are committed, paid for, or free again, without asking anyone.
- **Buyer** — wants the seller to know about the order, so fulfillment can start the moment payment is secured.
- **Marketplace operator** — wants the seller's view, the buyer's view, and the operator's view to come from one record.

## Preconditions

- The member is signed in and belongs to a seller organization (active or deactivated).

## Trigger

The member opens the organization's orders from the seller navigation, or follows a link to one order.

## Main Flow

1. **R1.** The member opens the organization's received orders and sees every order placed on the organization's listings — every status — newest first, **12 per page** with paging controls, each with what was sold, the buyer's display name, the status in plain language, and the amount (D1).
2. **R2.** The member opens one order.
3. **R3.** The order page shows the status, the buyer's display name (D3), the amount, what was promised at the time of ordering (the immutable snapshot, not the listing as it is now), and — while the order is unpaid — when the reservation expires and the unit may return to stock (Q3).
4. **R4.** It shows the timeline as one section of the page: every entry so far, each saying what happened and when, worded so that it never addresses the seller as the buyer (Q1).
5. **R5.** It states whose move it is now in **one forward-looking line owned by the product, worded from the seller's side** (D4): the buyer's while unpaid, nobody's once cancelled, and — once paid — that the money is secured and fulfillment opens in a later release. No action is offered.

## Alternate / Error Flows

### A1: The organization has no orders yet

- Condition: the list is empty.
- Steps: the product says so and links to the organization's listings ([UC-010](UC-010-member-reviews-organization-listings.md)); a viewer gets the same message without a listing action.
- Outcome: a new seller gets context, not a blank page.

### A2: The order is cancelled or expired

- Condition: the order ended without payment.
- Steps: the page shows the terminal status with its reason and the complete timeline; the next-step line says the unit is back on sale and nothing is needed.
- Outcome: the seller knows the unit is free again.

### A3: The order is paid

- Condition: the order is `Paid into escrow`.
- Steps: the page shows that the buyer's money is held in escrow and that the next step is the seller's — fulfillment — which does not exist yet; the line says it opens in a later release. No fee amount or rate is shown (Q2).
- Outcome: the seller knows payment is secured and that nothing can be done in the product yet.

### A4: A payment is in progress

- Condition: the order is `Awaiting payment` with a payment attempt pending.
- Steps: the page shows the payment as in progress; the next-step line says the outcome is pending and the unit is held meanwhile.
- Outcome: the seller is not told to expect money before it is secured.

### A5: The organization is deactivated

- Condition: the member's organization is `Deactivated`.
- Steps: the deactivation banner sits above the content; the list and every order remain readable.
- Outcome: existing orders stay visible to the people who must still honour them (UC-003 scope decision 5).

### E1: Another organization's order, or an unknown order

- Condition: the member opens an order their organization did not sell, or an id that does not exist.
- Steps: not available, identically in both cases.
- Outcome: no order enumeration across organizations.

### E2: Not a seller

- Condition: a signed-in user without an organization, or a platform admin, opens the received orders.
- Steps: the user without an organization is sent to organization setup; the platform admin sees the staff notice (marketplace staff do not sell, UC-003 E7).
- Outcome: no seller order list for anyone who is not a member.

### E3: The orders cannot be loaded

- Condition: the product cannot reach the order data.
- Steps: the member can retry; the failure is never shown as "no orders".

## Postconditions

- No state changes; this use case only reads.

## Data / Validations

- Inputs: the signed-in member and their organization; an order identifier for the detail view; a page offset for the list.
- Rules: a member sees only orders where their organization is the seller; the page shows the snapshot, never the current listing; the buyer is identified by display name only; amounts are SEK and never shown in öre; the list pages at 12, newest first with a deterministic tiebreak; no fee amount or rate on the seller order before settlement status exists (Q2); nothing on the page changes an order.
- Outputs: the organization's received orders with buyer name, status, and amount; one order with its snapshot, buyer name, timeline, expiry, payment state, and seller-side next step.

## Observability

- Metrics: received orders opened by a member, and paid orders not opened by any member within a day — the signal that seller notifications (P1-007) matter.

## Security / Compliance

- Auth: signed in.
- Authorization: membership of the selling organization, any role (D2); deactivated organizations stay readable to their members. Platform admins read orders through the operator surface, not this one.
- Privacy: the buyer's display name is the only buyer attribute that leaves the identity module for this read (D3).

## Decisions

Recorded in the [spec](../feature-specs/seller-order-management.md#decisions): D1–D6 approved and Q1–Q3 settled by the founder on 2026-11-14 — neutral third-person timeline wording for every viewer (Q1 b), no fee on the seller order before settlement status exists (Q2), the expiry shown (Q3), and the order page titled with the listing and the buyer named beneath it.

## Mapping to Architecture

- Queries: `Orders.ListOrganizationOrders` (the seller counterpart of `Orders.ListBuyerOrders`), `Orders.GetOrder` (names the buyer through a directory port backed by the identity module's user directory, as sellers are named today).
- Commands, events: none.
- Persistence: `orders`, order timeline entries; an index on the seller organization already exists.
