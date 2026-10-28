# Product Backlog

Everything we would like the product to do that is not built yet, in product language. The backlog answers _what_ and _how important_; the [roadmap](./roadmap.md) answers _when_. What is already built is recorded in the [use-case index](./use-cases/README.md), not here.

How items enter, get scheduled, and leave is defined in [`product-operating-model.md`](./product-operating-model.md#backlog-roadmap-and-what-is-built). In short:

- **Product work only.** Engineering-only work (reliability, tooling, tests, infrastructure) is scheduled directly in the roadmap and decided in ADRs.
- **Priority is importance, not order.** A P1 item can be scheduled after a P2 one; sequencing lives in the roadmap.
- **Scheduling** sets the item's status to `Scheduled (<roadmap phase>)` and lists its ID in that roadmap phase or block.
- **Finished items are deleted** in the same PR that completes them; the use-case index records which backlog IDs each use case absorbed. IDs are never reused — check the index before taking a new number.
- Backlog items are planning candidates, not implementation authority. Level 2+ work is ready to build only through an approved use case; Level 1 improvements are ready when their acceptance criteria are testable (see the operating model).

Priority labels:

- **P0**: Required for the MVP trust loop
- **P1**: Important for an early usable product
- **P2**: Useful after MVP
- **P3**: Future expansion

Status labels:

- **Idea** — worth remembering; not yet shaped
- **Needs shaping** — wanted, but behavior, rules, or scope are not settled
- **Ready** — settled enough to build: an approved use case (Level 2+) or testable acceptance criteria (Level 1)
- **Scheduled (Phase N)** — picked into a roadmap phase or block (e.g. `Scheduled (Refinements)`); still not built

## P0: MVP trust loop

### P0-008: Start fulfillment

Status: Scheduled (Phase 5) — needs shaping into UC-005 first

As a seller, I want to start fulfillment after payment is secured so that the buyer can track progress.

Acceptance criteria:

- Seller can start fulfillment only after payment is secured.
- Order moves to in fulfillment.
- Buyer can see fulfillment has started.
- Timeline records the action.

### P0-009: Add fulfillment update

Status: Scheduled (Phase 5) — needs shaping into UC-005 first

As a seller, I want to add fulfillment updates so that the buyer knows what is happening.

Acceptance criteria:

- Seller can add text update.
- Buyer can see update on order timeline.
- Update has timestamp and actor.
- Empty update is not allowed.

### P0-010: Submit fulfillment for confirmation

Status: Scheduled (Phase 5) — needs shaping into UC-005 first

As a seller, I want to mark fulfillment ready for buyer confirmation so that the order can be completed.

Acceptance criteria:

- Seller can request confirmation.
- Order moves to awaiting buyer confirmation.
- Buyer is notified.
- Buyer sees confirm action and clear guidance for what to do if fulfillment is not acceptable.

### P0-011: Confirm completion and release funds

Status: Scheduled (Phase 5) — needs shaping into UC-005 first

As a buyer, I want to confirm completion so that the seller can receive funds.

Acceptance criteria:

- Buyer can confirm completion from order detail.
- Product explains that confirmation releases funds.
- Escrow is released to seller balance.
- Order moves to completed.
- Timeline records confirmation and fund release.
- Financial history is updated.

### P0-012: View order timeline

Status: Scheduled (Phase 5) — order creation, cancellation, expiry, and payment entries shipped with [UC-001](use-cases/UC-001-buyer-orders-refurbished-laptop.md) and [UC-004](use-cases/UC-004-buyer-pays-into-escrow.md); fulfillment, completion, and release entries come with UC-005. Idea: [001](ideas/001-trust-centered-order-timeline.md)

As a user, I want to see the order timeline so that I understand what happened and what happens next.

Acceptance criteria:

- Timeline appears on order detail.
- Timeline shows major order, payment, fulfillment, completion, release, cancellation, and settlement events.
- Each entry has title, timestamp, and explanation.
- Timeline uses user-friendly language.

### P0-013: Operator order inspection

Status: Scheduled (Phase 5) — opening any order is settled and built by [UC-003](use-cases/UC-003-seller-organization-and-member-management.md), and payment attempts and financial history by [UC-004](use-cases/UC-004-buyer-pays-into-escrow.md); search, status filters, stuck-order detection, and fulfillment state still need shaping

As an operator, I want to inspect an order so that I can understand its current state and history.

Acceptance criteria:

- Operator can search or open order.
- Operator can see status, timeline, payment state, fulfillment state, and financial history.
- Operator can find orders stuck in payment, fulfillment, or confirmation states.
- Operator-only notes or actions are permissioned.

### P0-014: Buyer order dashboard

Status: Scheduled (Phase 5) — needs shaping; a plain list of the buyer's orders already exists

As a buyer, I want to see my orders grouped by what they need so that I know where to act.

Acceptance criteria:

- Buyer sees active orders, orders needing action, and completed orders.
- Each order shows its status and next step.
- Buyer opens order detail from the list.

### P0-015: Seller dashboard

Status: Scheduled (Phase 5) — needs shaping; a list of the organization's listings already exists

As a seller, I want to see my listings and the orders that need my attention so that nothing waits on me unnoticed.

Acceptance criteria:

- Seller sees active listings.
- Seller sees orders needing fulfillment and orders awaiting buyer confirmation.
- Seller sees settlement status per order (the MVP part of P1-006).
- Only members of the organization see its dashboard.

## P1: Recovery and trust workflows

### P1-002: Request full refund before release

Status: Needs shaping

As a buyer, I want to request a refund before funds are released so that I can recover money when fulfillment fails.

Acceptance criteria:

- Buyer can request refund on eligible order.
- Buyer selects reason and adds explanation.
- Seller and operator can see request.
- Funds are not released while refund is under review.

### P1-003: Process full refund

Status: Needs shaping — also the path for a seller who cannot fulfill a paid order (PD-0004 §6); until it ships, operators resolve those out of band. The ledger is designed so a full refund is one reversing entry (ADR-009).

As an operator, I want to approve a full refund so that the buyer receives money back when policy allows.

Acceptance criteria:

- Operator can approve full refund.
- Refund moves money back to buyer.
- Order moves to refunded or cancelled according to policy.
- Timeline and financial history are updated.

### P1-004: Open dispute

Status: Needs shaping

As a buyer, I want to open a dispute when an order cannot be resolved normally.

Acceptance criteria:

- Buyer can open dispute from order.
- Buyer selects structured reason.
- Buyer adds explanation.
- Seller is notified.
- Release is paused while dispute is active.

### P1-005: Resolve dispute

Status: Needs shaping

As an operator, I want to resolve a dispute so that the order can reach a fair outcome.

Acceptance criteria:

- Operator can view dispute details and order timeline.
- Operator can decide full refund or release to seller.
- Decision requires reason.
- Decision is recorded on timeline.
- Financial outcome is applied.

### P1-006: Seller settlement view

Status: Needs shaping — the MVP subset (released amount, fee, and settlement status per order) is scheduled in Phase 5 with P0-015; payout status waits for payouts (P2-012)

As a seller, I want to see settlement status so that I understand when funds are available.

Acceptance criteria:

- Seller can see released funds.
- Seller can see marketplace fee.
- Seller can see settlement status per order.
- Seller can see payout status if payout exists.

### P1-007: Notifications for required actions

Status: Needs shaping

As a user, I want to receive notifications when I need to act.

Acceptance criteria:

- Buyer notified when confirmation is needed.
- Seller notified when order is paid.
- Seller notified when dispute is opened.
- Buyer notified when refund or release decision is made.
- Notifications link to relevant order.

### P1-008: Email verification

Status: Needs shaping — deliberately deferred out of the identity phase (PD-0003)

As the marketplace, I want new accounts to verify their email address so that accounts are reachable and harder to fake.

Acceptance criteria:

- New account receives a verification email with an expiring link.
- Unverified accounts are limited according to a policy decided during shaping (e.g. cannot publish listings).
- Verification state is visible to the user.
- Requires email-sending infrastructure (first notification-style dependency; shape together with P1-007).

### P1-009: Password reset

Status: Needs shaping — deliberately deferred out of the identity phase (PD-0003)

As a user, I want to reset a forgotten password so that I can regain access without support intervention.

Acceptance criteria:

- User can request a reset by email; the response never reveals whether the email is registered.
- Reset link is single-use and expires.
- Completing a reset revokes all existing sessions.
- Requires email-sending infrastructure (shape together with P1-008).

### P1-010: Basic browse filters and sorting

Status: Scheduled (Refinements) — needs shaping; Level 1 on top of UC-001 browsing

As a buyer, I want to narrow and order the catalogue so that I find a suitable laptop quickly.

Acceptance criteria:

- Buyer can filter active listings by brand, price range, condition grade, and RAM.
- Buyer can sort by price and by newest.
- Filters combine with keyword search.

### P1-011: Restock an active listing

Status: Scheduled (Refinements) — needs a short product decision and a UC-001 amendment first

As a seller, I want to add units to an active listing so that I can keep selling the same model without publishing a new listing.

Acceptance criteria:

- Seller with listing permission can increase the available quantity of an active listing.
- Existing orders and their snapshots are unaffected.
- The change is recorded with actor and time.

### P1-012: Save incomplete listing drafts

Status: Scheduled (Refinements) — ready; Level 1. [UC-001](use-cases/UC-001-buyer-orders-refurbished-laptop.md) S1/E1 already describes this behavior, but today creating a draft requires every disclosure

As a seller, I want to save a listing draft before I have every detail so that I can finish it later.

Acceptance criteria:

- A draft can be saved with any subset of fields.
- Publishing a draft with missing or invalid fields is rejected with field-level reasons, and the listing stays a draft.
- Drafts stay invisible to buyers.

### P1-013: Repeated cancellation

Status: Scheduled (Refinements) — needs shaping; Level 1, decide and record in UC-001

As a buyer, I want cancelling an already-cancelled order to give a clear, harmless answer so that a double click or retry never confuses me.

Acceptance criteria:

- Cancelling an order that is already cancelled has a defined, documented response.
- No duplicate timeline entry and no second stock release.

### P1-014: Active session and device management

Status: Needs shaping

As a seller, I want to see everywhere my account is signed in and end any of those sessions so that I can shut down access I do not recognize.

Acceptance criteria:

- A signed-in user can list their own active sessions with enough context to recognize each one (approximate location or IP, device/browser, when it started, when it was last used, and which one is the current session).
- A user can end any single session of theirs, and can end all sessions except the current one.
- An ended session stops working on its very next request (ADR-008 revocation), with no waiting period.
- A user never sees another user's sessions; operators do not gain session visibility through this feature.
- Session records carry no more personal data than the feature needs, and the list is not logged.

Notes: the `sessions` table currently stores no device, IP, or last-seen data, so this needs a migration adding those columns plus a backend endpoint pair. Session revocation itself already exists (ADR-008). Sessions created by federated sign-in (P2-021) must appear in this list like any other.

## P2: Product experience improvements

One line each until shaped. Add a file in [`ideas/`](./ideas/README.md) when an idea needs more thinking, and link it here.

| ID     | Idea                                   | Notes                                                                                    |
| ------ | -------------------------------------- | ---------------------------------------------------------------------------------------- |
| P2-001 | Offers                                 | Buyer and seller negotiate price or terms before an order. MVP non-goal.                 |
| P2-002 | Listing quality score and guidance     | Missing-information warnings and trust hints that guide sellers to complete listings.    |
| P2-003 | Seller analytics                       | Listing performance, order volume, revenue, fulfillment time, dispute rate.              |
| P2-004 | Buyer saved listings                   | Save listings for later.                                                                 |
| P2-005 | Organization trust profile             | Completed orders, dispute rate, response time, verification state.                       |
| P2-006 | Improved marketplace search            | Category-specific filters, trust-based ranking, saved searches.                          |
| P2-007 | Listing photos                         | Deferred by UC-001; a rich media gallery is an MVP non-goal.                             |
| P2-008 | Reviews and ratings                    | Public review system is an MVP non-goal.                                                 |
| P2-009 | Buyer–seller messages on an order      | Conversation attached to the order, visible to operators.                                |
| P2-010 | Shipment tracking and delivery dates   | Delivery confirmation and deadlines; expansion opportunity named in PD-0002.             |
| P2-011 | Automatic release window               | Release funds if the buyer does not respond in time. PD-0004 chose no automatic release. |
| P2-012 | Seller payouts                         | Payouts from seller balance: schedules, statements, failure handling.                    |
| P2-013 | Real payment provider                  | Replace the simulated provider; more providers later.                                    |
| P2-014 | Operator queues                        | Queues for refunds, disputes, settlement issues, and stuck orders beyond MVP inspection. |
| P2-015 | Dispute deadlines and evidence         | Response deadlines and multi-step evidence collection.                                   |
| P2-016 | Notification preferences and digests   | After P1-007.                                                                            |
| P2-017 | Multi-factor authentication            |                                                                                          |
| P2-018 | Organization verification              | Advanced seller verification is an MVP non-goal.                                         |
| P2-019 | Member email invitations               | Invite people who have no account yet; deferred by UC-003.                               |
| P2-020 | Leave organization, transfer ownership | Deferred by UC-003.                                                                      |
| P2-021 | Sign in with Google and Facebook       | Readiness and linking rules settled in ADR-012; needs P1-008 email verification first.   |

## P3: Advanced trust and scale

| ID     | Idea                                  | Notes                                                                                               |
| ------ | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| P3-001 | Milestone-based fulfillment           | Funds released across milestones, with buyer approval per milestone.                                |
| P3-002 | Partial refunds                       | Refund part of the order amount; refund negotiation.                                                |
| P3-003 | AI dispute summary                    | Summarize timeline, evidence, and policy for operators. Idea: [002](ideas/002-dispute-assistant.md) |
| P3-004 | AI support assistant                  | Explain timelines and next steps; draft support responses.                                          |
| P3-005 | Fraud risk signals                    | Surface suspicious patterns for operator review.                                                    |
| P3-006 | Advanced reconciliation dashboard     | Mismatches between order, payment, settlement, and financial records; reconciliation alerts.        |
| P3-007 | Multi-currency                        | Payments and settlement beyond SEK. MVP non-goal.                                                   |
| P3-008 | Webhooks and public API               | Integrations for seller organizations.                                                              |
| P3-009 | Multiple storefronts per organization | MVP non-goal.                                                                                       |
| P3-010 | Organization-level policies           | E.g. organization-specific payout or fulfillment policies.                                          |
| P3-011 | Recommendations and featured listings | MVP non-goal.                                                                                       |
| P3-012 | Multi-item cart                       | MVP non-goal.                                                                                       |
| P3-013 | Financial and audit exports           | Exportable reports, seller statements, audit search, compliance reports.                            |
| P3-014 | Dispute escalation and arbitration    | Escalation levels and an arbitration workflow.                                                      |
| P3-015 | Revision requests                     | Buyer asks for a revision or partially accepts fulfillment.                                         |
| P3-016 | Trust and policy analytics            | Trust health, dispute, and policy metrics for operators.                                            |
| P3-017 | Device lifecycle services             | Returns, inspections, warranty claims, repairs, trade-ins (PD-0002 expansion opportunities).        |

## Before moving an item to Ready

- User problem is clear.
- Main flow is clear.
- Edge cases are listed.
- Permissions are clear.
- Status changes are clear.
- Timeline or notification behavior is clear.
- Business rules are updated if needed.
- Acceptance criteria are testable.
- Out-of-scope items are listed.
- The corresponding use case exists and is approved (Level 2+, distilled from the feature spec). For Level 1 refinements, acceptance criteria are the handoff — identify and amend the affected use case when one exists.
