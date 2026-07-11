# Business Rules and Policies

This document captures product behavior that must remain consistent across the marketplace. These rules should be updated whenever product scope changes.

## Marketplace rules

### Organization ownership

- A listing belongs to one organization.
- Orders are placed against a listing and seller organization.
- Organization administrators can manage organization settings and members.
- Seller members can manage listings and fulfillment according to assigned permissions.

### Listing visibility

- Draft listings are not visible to buyers.
- Active listings are visible and orderable.
- Archived listings remain visible to sellers and operators but cannot receive new orders.
- A listing must have required fields before publishing.

Required listing fields for MVP:

- Title
- Description
- Price
- Fulfillment expectations
- Seller organization
- Clear fulfillment and completion expectations

## Order rules

### Order creation

- Orders can only be created from active listings.
- An order captures the listing snapshot needed to preserve buyer expectations.
- An order starts as awaiting payment unless a different payment policy is explicitly introduced.

### Unpaid orders

- An unpaid order may be cancelled by the buyer.
- An unpaid order may expire automatically after a configured time window.
- A cancelled unpaid order cannot be paid later.

### Paid orders

- A successful payment moves funds into escrow.
- Fulfillment should only begin after payment is secured unless a future product policy allows otherwise.
- Paid orders should show clear next action for seller and buyer.

### Fulfillment

- Seller can start fulfillment after funds are secured.
- Seller can add progress updates.
- Seller can request buyer confirmation when fulfillment is ready.
- Buyer can confirm completion while confirmation is available; recovery actions are defined separately after the MVP trust loop.

### Completion

- Buyer confirmation releases escrow to the seller according to settlement rules.
- Completion creates timeline and financial history records.
- Completed orders cannot be disputed unless a later policy introduces post-completion disputes.

## Escrow rules

### Escrow hold

- Buyer payment is held in escrow until a release or refund condition occurs.
- Escrow balance belongs to the order state until release or refund.
- Users should see escrow status in plain language.

### Release conditions

MVP release condition:

- Buyer confirms completion.

Future release conditions may include:

- Automatic release after confirmation window expires
- Operator release decision after dispute
- Milestone completion

### Payment reversal conditions

MVP payment reversal conditions:

- Payment failed or cancelled before capture where applicable.

Post-MVP recovery refund conditions may include:

- Operator approves refund before funds are released.
- Seller-approved refund
- Partial refund
- Policy-based automatic refund
- Dispute outcome refund

### Marketplace fee

- Marketplace fee is applied when funds are released to seller.
- Fee should be visible in seller settlement details.
- Fee should be recorded in financial history.

## Dispute rules

Disputes are post-MVP recovery workflows. They should not be implemented before the direct order, escrow, fulfillment, confirmation, release, timeline, and inspection loop is working end to end.

### Opening a dispute

- A dispute can be opened only for eligible order states.
- Opening a dispute pauses automatic release when automatic release exists.
- Dispute reason must be structured.
- Dispute explanation is required.

Basic recovery dispute reasons:

- Seller did not deliver
- Delivered item/service differs from listing
- Fulfillment is late
- Buyer cannot verify completion
- Other

### Dispute response

- Seller should be notified when a dispute is opened.
- Seller should be able to provide a response in a later phase.
- Operator can review dispute context and order timeline.

### Dispute decisions

Basic recovery decisions:

- Full refund to buyer
- Release funds to seller

Future decisions:

- Partial refund
- Request more evidence
- Extend fulfillment window
- Split settlement

Decision requirements:

- Operator decision requires reason.
- Decision is recorded in the order timeline.
- Decision triggers the correct financial outcome.

## Settlement rules

### Seller balance

- Seller balance increases only when escrow is released.
- Released amount should account for marketplace fees and refunds.
- Seller should see settlement status per order.

### Payout

MVP may show settlement status without automated payout.

Future payout rules:

- Payout schedule
- Minimum payout amount
- Payout failure handling
- Payout account verification

## Timeline rules

Timeline entries should be created for important user-visible events.

Timeline entries should answer:

- What happened?
- When did it happen?
- Who caused it when relevant?
- What does it mean?
- What happens next when relevant?

Timeline entries are required for:

- Order creation
- Payment result
- Escrow hold
- Fulfillment start
- Fulfillment update
- Confirmation request
- Buyer confirmation
- Fund release
- Order cancellation

Post-MVP recovery timeline entries:

- Refund request
- Refund completion
- Dispute open
- Dispute decision

## Notification rules

Notifications should be sent when a user needs to act or when an important financial/state change occurs.

Examples:

- Seller receives paid order
- Buyer needs to confirm fulfillment
- Buyer payment failed
- Funds released

Post-MVP recovery examples:

- Dispute opened
- Refund completed

Notifications should link directly to the relevant order.

## Operator rules

- Operator actions must be permissioned.
- Operator decisions affecting money must require a reason.
- Operator decisions should be visible in audit history.
- User-visible decision text should be clear and professional.

## Policy questions to resolve later

- Should buyer confirmation have an automatic release window?
- Should sellers be able to approve refunds without operator involvement?
- Should disputes be possible after completion?
- Should organizations have configurable refund policies?
- Should listing categories have different fulfillment rules?
- Should seller trust score affect escrow release timing?
- Should high-risk orders require manual review before fulfillment?
