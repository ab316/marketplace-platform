# Product Backlog

This backlog is organized by product outcome. Items should be refined into feature specs before implementation when they affect a major user journey or business rule.

Backlog items are planning candidates, not implementation authority. An item becomes implementation-ready only after the relevant niche, user journey, business rules, and use case are settled — except Level 1 improvements, whose handoff is the item's own acceptance criteria (see `product-operating-model.md`). Until the first use case exists, P0 items should be treated as shaped enough for discussion, not ready for engineering.

Priority labels:

- **P0**: Required for MVP trust loop
- **P1**: Important for early usable product
- **P2**: Useful after MVP
- **P3**: Future expansion

Status labels:

- **Idea**
- **Needs shaping**
- **Ready**
- **In progress**
- **Done**
- **Deferred**

`Ready` means ready to turn into implementation work. For Level 2+ work that requires a corresponding use case in `use-cases/`, distilled from the feature spec — a spec alone is not enough, it is product design, not the engineering handoff. For Level 1 improvements the item's own testable acceptance criteria are the handoff. `Ready` never means just "the idea sounds plausible."

## P0: MVP trust loop

### P0-001: Create organization

Status: Needs shaping

As a seller, I want to create an organization so that I can publish listings and receive orders under that organization.

Acceptance criteria:

- User can create an organization with name and basic profile.
- Creator becomes organization administrator.
- Organization can be viewed and edited by authorized members.
- Organization appears on listing detail pages.

### P0-002: Manage organization members and roles

Status: Needs shaping

As an organization administrator, I want to invite members and assign roles so that my team can manage listings and orders safely.

Acceptance criteria:

- Administrator can invite a member.
- Administrator can assign a basic role.
- Unauthorized users cannot edit organization settings.
- Important member changes are recorded.

### P0-003: Create listing draft

Status: Needs shaping

As a seller, I want to create a listing draft so that I can prepare an asset or service before publishing it.

Acceptance criteria:

- Seller can create listing with title, description, price, and fulfillment expectations.
- Missing required fields prevent publishing.
- Draft listing is not visible to buyers.
- Seller can preview listing before publishing.

### P0-004: Publish active listing

Status: Needs shaping

As a seller, I want to publish a listing so that buyers can discover and order it.

Acceptance criteria:

- Only valid listings can be published.
- Published listings appear in marketplace discovery.
- Seller can archive listing.
- Archived listings cannot receive new orders.

### P0-005: Browse and view listings

Status: Needs shaping

As a buyer, I want to browse and view listings so that I can decide what to buy.

Acceptance criteria:

- Buyer can see active listings.
- Buyer can open listing detail.
- Listing detail shows price, seller organization, description, fulfillment expectations, and escrow explanation.
- Unavailable listings cannot be ordered.

### P0-006: Create order from listing

Status: Needs shaping

As a buyer, I want to create an order from a listing so that I can purchase the asset or service.

Acceptance criteria:

- Buyer can start order from active listing.
- Order captures listing, buyer, seller organization, price, and terms.
- Order starts in awaiting payment state.
- Order timeline records order creation.

### P0-007: Pay into escrow

Status: Needs shaping

As a buyer, I want to pay into escrow so that the seller knows payment is secured but funds are not released until completion.

Acceptance criteria:

- Buyer can start payment for an order.
- Successful payment moves order to paid into escrow.
- Failed payment keeps order recoverable.
- Buyer sees clear payment status.
- Seller can see payment is secured.
- Timeline records payment result.

### P0-008: Start fulfillment

Status: Needs shaping

As a seller, I want to start fulfillment after payment is secured so that the buyer can track progress.

Acceptance criteria:

- Seller can start fulfillment only after payment is secured.
- Order moves to in fulfillment.
- Buyer can see fulfillment has started.
- Timeline records the action.

### P0-009: Add fulfillment update

Status: Needs shaping

As a seller, I want to add fulfillment updates so that the buyer knows what is happening.

Acceptance criteria:

- Seller can add text update.
- Buyer can see update on order timeline.
- Update has timestamp and actor.
- Empty update is not allowed.

### P0-010: Submit fulfillment for confirmation

Status: Needs shaping

As a seller, I want to mark fulfillment ready for buyer confirmation so that the order can be completed.

Acceptance criteria:

- Seller can request confirmation.
- Order moves to awaiting buyer confirmation.
- Buyer is notified.
- Buyer sees confirm action and clear guidance for what to do if fulfillment is not acceptable.

### P0-011: Confirm completion and release funds

Status: Needs shaping

As a buyer, I want to confirm completion so that the seller can receive funds.

Acceptance criteria:

- Buyer can confirm completion from order detail.
- Product explains that confirmation releases funds.
- Escrow is released to seller balance.
- Order moves to completed.
- Timeline records confirmation and fund release.
- Financial history is updated.

### P0-012: View order timeline

Status: Needs shaping

As a user, I want to see the order timeline so that I understand what happened and what happens next.

Acceptance criteria:

- Timeline appears on order detail.
- Timeline shows major order, payment, fulfillment, completion, release, cancellation, and settlement events.
- Each entry has title, timestamp, and explanation.
- Timeline uses user-friendly language.

### P0-013: Operator order inspection

Status: Needs shaping

As an operator, I want to inspect an order so that I can understand its current state and history.

Acceptance criteria:

- Operator can search or open order.
- Operator can see status, timeline, payment state, fulfillment state, and financial history.
- Operator-only notes or actions are permissioned.

## P1: Recovery and trust workflows

### P1-001: Cancel unpaid order

Status: Needs shaping

As a buyer or system, I want unpaid orders to be cancellable so that abandoned orders do not remain active forever.

Acceptance criteria:

- Buyer can cancel unpaid order.
- Product can expire unpaid order after policy window.
- Cancelled order cannot be paid.
- Timeline records cancellation.

### P1-002: Request full refund before release

Status: Needs shaping

As a buyer, I want to request a refund before funds are released so that I can recover money when fulfillment fails.

Acceptance criteria:

- Buyer can request refund on eligible order.
- Buyer selects reason and adds explanation.
- Seller and operator can see request.
- Funds are not released while refund is under review.

### P1-003: Process full refund

Status: Needs shaping

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
- Automatic release is paused while dispute is active.

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

Status: Needs shaping

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

## P2: Product experience improvements

### P2-001: Offers

Status: Idea

Allow buyer and seller to negotiate price or terms before creating an order.

### P2-002: Listing quality score

Status: Idea

Guide sellers toward more complete and trustworthy listings.

### P2-003: Seller analytics

Status: Idea

Show sellers listing performance, order volume, revenue, fulfillment time, and dispute rate.

### P2-004: Buyer saved listings

Status: Idea

Allow buyers to save listings for later.

### P2-005: Organization trust profile

Status: Idea

Show trust signals such as completed orders, dispute rate, response time, and verification state.

### P2-006: Improved marketplace search

Status: Idea

Add category filters, sorting, and trust-based ranking.

## P3: Advanced trust and scale

### P3-001: Milestone-based fulfillment

Status: Idea

Support orders where funds are released across milestones.

### P3-002: Partial refunds

Status: Idea

Allow refunds for part of the order amount.

### P3-003: AI dispute summary

Status: Idea

Summarize dispute timeline, evidence, and relevant policies for operators.

### P3-004: AI support assistant

Status: Idea

Explain order timelines and next steps to buyers and sellers.

### P3-005: Fraud risk signals

Status: Idea

Surface suspicious patterns for operator review.

### P3-006: Advanced reconciliation dashboard

Status: Idea

Help operators identify mismatches between order state, payment state, settlement state, and financial records.

## Backlog refinement rules

Before moving an item to Ready:

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
