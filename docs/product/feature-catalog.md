# Feature Catalog

> **Status: provisional.** Written before the niche/vertical decision (roadmap Phase 0). Treat as a map of plausible capabilities, not committed scope — `mvp-scope.md` and `product-backlog.md` narrow this once the first use case is settled.

This document maps the product capabilities. It is intentionally product-oriented: features are described by user value and marketplace behavior, not by implementation layer.

## 1. Accounts and identity

### User registration and sign-in

Users can create an account, sign in, and manage their profile.

MVP:

- Email/password or external identity provider
- Basic profile
- Account status
- Session management

Later:

- Multi-factor authentication
- Account verification
- Risk-based login checks

### Organization accounts

Users can create or join organizations that sell through the marketplace.

MVP:

- Create organization
- Organization profile
- Organization members
- Basic roles

Later:

- Organization verification
- Public trust profile
- Multiple storefronts
- Organization-level policies

### Roles and permissions

Organizations and operators need permission control.

MVP roles:

- Buyer
- Organization admin
- Seller member
- Operator

Example permissions:

- Create listing
- Edit listing
- View organization orders
- Update fulfillment
- Manage disputes
- Manage payout settings
- Issue refund decision
- View audit history

## 2. Marketplace discovery

### Listing browsing

Buyers can browse available listings.

MVP:

- Listing grid or list
- Listing detail page
- Basic filters
- Search by title or keyword
- Active/unavailable state

Later:

- Saved listings
- Recommendations
- Category-specific filters
- Featured listings
- Trust-based ranking

### Listing detail

Listing pages explain the offer and reduce buyer uncertainty.

MVP information:

- Title
- Description
- Price
- Seller organization
- Availability
- Fulfillment expectations
- Completion and release policy summary
- Escrow explanation
- Call to action to order

Later:

- Reviews
- Seller response time
- Listing quality score
- Fulfillment success rate
- FAQ section
- Rich media gallery

### Listing quality guidance

Sellers receive guidance to create trustworthy listings.

MVP:

- Required fields
- Draft validation
- Preview before publishing

Later:

- Listing quality score
- AI suggestions
- Missing information warnings
- Trust impact hints

## 3. Offers and negotiation

Offers allow price or terms to be proposed before an order.

MVP:

- Not required for first release

Later:

- Buyer makes offer
- Seller accepts, rejects, or counters
- Offer expiration
- Offer converted into order
- Offer timeline

## 4. Orders

### Order creation

Buyers can create an order from a listing.

MVP:

- Create order from active listing
- Review price and terms
- Confirm buyer details
- Show escrow explanation before payment
- Generate order timeline

Later:

- Multi-item orders
- Custom order terms
- Milestone orders
- Order drafts

### Order detail

Order detail is the central workspace for a transaction.

MVP sections:

- Current status
- Next action
- Buyer and seller summary
- Listing summary
- Price and payment state
- Fulfillment state
- Timeline
- Available actions

Later:

- Messages
- Evidence collection
- Internal notes for operators
- Risk indicators
- AI summary

### Order timeline

The timeline explains what happened and what happens next.

MVP timeline events:

- Order created
- Payment requested
- Payment secured in escrow
- Fulfillment started
- Fulfillment updated
- Fulfillment submitted
- Buyer confirmation requested
- Buyer confirmed completion
- Funds released
- Order completed
- Order cancelled

Timeline event requirements:

- Human-readable title
- Timestamp
- Actor where appropriate
- Short explanation
- Related amount where relevant
- Related attachments where relevant

## 5. Payment and escrow

### Escrow payment

Payment is secured before fulfillment.

MVP:

- Buyer payment intent
- Payment success/failure states
- Escrow balance per order
- Clear explanation of release conditions
- Payment status visible on order

Later:

- Multiple payment providers
- Multi-currency payment
- Payment retry rules
- Payment method management

### Money movement visibility

Users and operators should understand money state.

MVP visible states:

- Payment not started
- Payment pending
- Payment failed
- Paid into escrow
- Release pending
- Released to seller
- Settlement pending
- Settled

### Ledger and financial history

Financial records must be correct and inspectable.

MVP:

- Record payment, escrow hold, release, fee, and settlement events
- Show operator-readable transaction history

Later:

- Reconciliation dashboard
- Exportable reports
- Advanced settlement statements

## 6. Fulfillment

### Fulfillment updates

Sellers can move the order through fulfillment.

MVP:

- Start fulfillment
- Add progress update
- Mark ready for buyer confirmation
- Add proof text or attachment reference

Later:

- Milestone fulfillment
- Delivery deadlines
- Buyer approval per milestone
- Delivery integrations

### Buyer confirmation

Buyer confirms that fulfillment is acceptable.

MVP:

- Confirm completion
- See guidance if fulfillment is not acceptable
- Show confirmation consequences

Later:

- Auto-release after confirmation window
- Partial acceptance
- Revision requests

## 7. Refunds

### Refund request

Buyer can request refund where policy allows.

MVP:

- Not required for first MVP trust loop

Post-MVP recovery:

- Request refund before funds release
- Select reason
- Add explanation
- Seller/operator visibility

Later:

- Partial refund
- Refund negotiation
- Refund automation for clear cases

### Refund decision

Refund outcomes must be clear and auditable.

MVP:

- Not required for first MVP trust loop

Post-MVP recovery:

- Approve full refund
- Reject refund
- Cancel order after refund
- Timeline entry for decision

Later:

- Partial refund
- Split decision
- Policy-based recommendations

## 8. Disputes

### Dispute opening

A user can open a dispute when an order cannot be resolved normally.

MVP:

- Not required for first MVP trust loop

Post-MVP recovery:

- Open dispute from order
- Select structured reason
- Add explanation
- Add evidence reference
- Notify other party
- Freeze automatic release while under review

Later:

- Multi-step evidence collection
- Response deadlines
- Operator queue
- AI-generated dispute summary
- Decision recommendations

### Dispute resolution

Operators need enough context to resolve disputes fairly.

MVP:

- Not required for first MVP trust loop

Post-MVP recovery:

- View order timeline
- View payment state
- View dispute reason and evidence
- Record decision
- Trigger refund or release outcome

Later:

- Arbitration workflow
- Escalation levels
- Dispute analytics
- Trust score impact

## 9. Settlement and payouts

### Settlement

Funds become available to seller after release conditions are met.

MVP:

- Release escrow to seller balance
- Apply marketplace fee
- Show settlement amount and status

Later:

- Scheduled payout batches
- Seller payout statements
- Payout failure handling
- Multi-currency settlement

## 10. Dashboards

### Buyer dashboard

MVP:

- Active orders
- Orders needing action
- Completed orders

Later:

- Saved listings
- Spending history
- Recommendations

### Seller dashboard

MVP:

- Active listings
- New orders
- Orders needing fulfillment
- Orders awaiting buyer confirmation
- Settlements

Later:

- Revenue analytics
- Listing performance
- Conversion rate
- Fulfillment performance

### Operator dashboard

MVP:

- Simple order inspection by ID or list
- Stuck order visibility by status
- Payment, fulfillment, timeline, and financial history on order detail

Post-MVP recovery:

- Stuck orders
- Disputes
- Refund requests
- Failed payments
- Settlement issues
- Recent high-risk activity

Later:

- Risk scoring
- Policy analytics
- Reconciliation alerts
- Trust health metrics

## 11. Notifications

Notifications should help users act at the right time.

MVP events:

- Order created
- Payment succeeded
- Payment failed
- Seller needs to fulfill
- Buyer needs to confirm
- Funds released

Notification channels:

- In-product notification center
- Email for important events

Later:

- Notification preferences
- Webhooks for organizations
- Digest notifications

## 12. Search and filtering

MVP:

- Search listings by keyword
- Filter active listings
- Filter orders by status

Post-MVP recovery:

- Filter disputes by status

Later:

- Saved searches
- Ranking based on trust and quality
- Advanced operator filters

## 13. Support and AI assistance

AI should assist users and operators without hiding the source of truth.

MVP:

- Not required for first release

Later:

- Order timeline explanation assistant
- Dispute summarization assistant
- Listing quality suggestions
- Fraud risk signals
- Support response drafting

AI principles:

- AI should summarize, not replace, source records.
- AI output should link back to timeline, evidence, or policy.
- AI should not make final dispute decisions without human review in early phases.

## 14. Audit and activity history

MVP:

- Important order, payment, fulfillment, completion, release, and settlement actions are recorded.
- Operators can inspect history.
- Users see relevant timeline events.

Later:

- Audit search
- Exportable audit records
- Compliance reports
