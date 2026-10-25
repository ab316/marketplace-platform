# Business Rules and Policies

This document captures product behavior that must remain consistent across the marketplace. These rules should be updated whenever product scope changes.

## Marketplace rules

### Account and organization access

Decided in [PD-0003](decisions/0003-identity-and-organization-access.md):

- Users sign up with email and password; one account per email. Email verification and password reset are deferred backlog features (P1-008/P1-009); SSO is out of scope for now.
- A user belongs to at most one organization. A buyer is a user with no organization membership.
- A signed-in user with no organization can create one and becomes its owner.
- Fixed organization roles: **owner** (profile, members, listings), **manager** (listings and fulfillment), **viewer** (read-only). No custom roles.
- Every organization always has at least one owner; no user can change or remove their own membership role.
- One platform role, **platform admin**: cross-organization inspection and organization lifecycle control. Admins are provisioned manually and do not act as sellers.
- Organizations are deactivated, never hard-deleted. Deactivation hides listings from buyers, blocks new orders and member write actions, and preserves all history; existing orders proceed unaffected.
- Membership, role, and lifecycle changes are recorded in an audit history and take effect on the affected user's next request.

### Organization ownership

- A listing belongs to one organization.
- Orders are placed against a listing and seller organization.
- Organization owners can manage organization settings and members.
- Seller members can manage listings and fulfillment according to assigned roles.

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
- A cancelled unpaid order cannot be paid later. If a payment for it nevertheless succeeds, the money is returned to the buyer and the order stays cancelled (PD-0004).
- Starting a payment places a short payment hold (15 minutes) on the order; automatic expiry skips an order while its hold is active, and the buyer cannot cancel it until the payment resolves or times out. The hold never extends the order's own expiry window (PD-0004).
- At most one payment attempt is in progress per order. An attempt the provider has not resolved within the hold window times out; the buyer may try again while the order is alive.

### Paid orders

- A successful payment moves funds into escrow.
- A successful payment converts the order's reserved unit to sold; sold units never return to stock through cancellation or expiry (PD-0004).
- The platform fee rate in force is recorded on the order when payment succeeds and does not change afterwards (PD-0004).
- A paid order cannot be cancelled by the buyer in the MVP; recovery actions (refund, dispute) are defined separately.
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

- The marketplace fee is 8% of the order total, borne by the seller; the buyer always pays the listed price (PD-0004).
- The fee is computed in minor units with round-half-up; there is no minimum or flat component.
- The rate is frozen on the order at payment time and applied when funds are released to the seller.
- Fee should be visible in seller settlement details.
- Fee should be recorded in financial history.

### Financial history

- Every money movement (payment captured into escrow, payment returned, funds released, fee charged) is a balanced financial record that is never edited or deleted.
- An order's financial history lists every movement touching its escrow; an operator can reconstruct where the money is from it alone.

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
