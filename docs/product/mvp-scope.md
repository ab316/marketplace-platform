# MVP Scope

Phasing and current focus live in [`roadmap.md`](./roadmap.md); this document defines what the MVP is and is not.

## Scope principle

The MVP should prove the core trusted marketplace transaction. It should not attempt to build every possible marketplace feature.

The product is successful at MVP stage if a buyer and seller can complete one safe transaction with escrow, visible fulfillment progress, confirmation, fund release, and clear transaction history.

## MVP product loop

```text
Organization setup
→ listing published
→ buyer discovers listing
→ buyer places order
→ buyer pays into escrow
→ seller fulfills
→ buyer confirms
→ funds release
→ order completes
→ users and operators can inspect the timeline
```

## MVP goals

1. Prove that escrow improves transaction trust.
2. Prove that an order timeline reduces confusion.
3. Prove that sellers can manage fulfillment clearly.
4. Prove that buyers understand when money is protected and when it is released.
5. Prove that operators can inspect order progress and money state.
6. Establish financial correctness for payment, escrow hold, release, fee, and settlement.

## MVP personas

MVP should support:

- Buyer
- Seller organization member
- Organization administrator
- Marketplace operator

## MVP features

### 1. Account and organization setup

Included:

- User sign-in
- Create organization
- Organization profile
- Invite/manage members
- Basic roles and permissions

Excluded from MVP:

- Complex verification
- Multiple storefronts per organization
- Advanced role customization

### 2. Listing management

Included:

- Create listing draft
- Edit listing
- Publish listing
- Archive listing
- Basic listing detail page
- Required listing fields

Excluded from MVP:

- Reviews
- Rich media gallery
- Listing quality score
- Recommendations
- Advanced category-specific listing forms

### 3. Marketplace discovery

Included:

- Browse active listings
- Search by keyword
- View listing detail
- Start order from listing

Excluded from MVP:

- Personalized recommendations
- Saved listings
- Trust-based ranking
- Public SEO optimization

### 4. Order lifecycle

Included statuses:

- Created
- Awaiting payment
- Paid into escrow
- In fulfillment
- Awaiting buyer confirmation
- Completed
- Cancelled

Included actions:

- Create order
- Pay order
- Start fulfillment
- Add fulfillment update
- Submit fulfillment for confirmation
- Confirm completion
- Cancel unpaid order

Excluded from MVP:

- Multi-item cart
- Milestone orders
- Order negotiation
- Revision loops

### 5. Escrow payment

Included:

- Buyer payment
- Payment success and failure states
- Escrow hold per order
- Release funds after buyer confirmation
- Basic marketplace fee
- Financial transaction history

Excluded from MVP:

- Multi-currency
- Multiple payment providers
- Split payments
- Partial release
- User-initiated refund requests
- Advanced payout scheduling

### 6. Fulfillment

Included:

- Seller starts fulfillment
- Seller posts progress update
- Seller marks fulfillment ready for confirmation
- Buyer confirms completion
- Timeline entries for fulfillment activity

Excluded from MVP:

- Milestone fulfillment
- Shipping integrations
- Automatic SLA penalties
- Buyer revision requests

### 7. Timeline

Included:

- Order created
- Payment secured
- Fulfillment started
- Fulfillment updated
- Confirmation requested
- Completion confirmed
- Funds released
- Order cancelled

Excluded from MVP:

- Refund/dispute timeline workflows
- AI-generated timeline explanations
- Advanced filtering inside timeline

### 8. Basic dashboards and inspection

Included:

Buyer dashboard:

- Active orders
- Orders needing action
- Completed orders

Seller dashboard:

- Active listings
- Orders needing fulfillment
- Orders awaiting buyer confirmation
- Settlement status

Operator inspection:

- Open an order by ID or from a simple list
- Inspect status, timeline, payment state, fulfillment state, and financial history
- Identify orders stuck in payment, fulfillment, or confirmation states

Excluded from MVP:

- Full operator dashboard queues
- Dispute queues
- Refund review queues
- Settlement issue queues
- Advanced analytics
- Conversion funnels
- Cohort analysis
- Forecasting

## Post-MVP recovery workflows

Refunds and disputes are important to the trust-centered product, but they are not part of the first MVP trust loop. They should be built after the direct order, escrow, fulfillment, confirmation, release, timeline, and inspection path is working end to end.

### Refunds

Post-MVP recovery scope:

- Buyer requests a full refund before funds are released
- Refund reason and explanation
- Seller/operator visibility
- Operator approves or rejects the refund
- Refund outcome updates timeline and financial history

Deferred beyond basic recovery:

- Partial refunds
- Refund negotiation
- Automated policy decisions

### Basic disputes

Post-MVP recovery scope:

- Buyer opens dispute
- Dispute reason and explanation
- Seller/operator can view dispute
- Operator records decision
- Decision triggers release or refund
- Timeline captures dispute activity

Deferred beyond basic recovery:

- Multi-step evidence workflow
- Dispute SLA automation
- AI dispute summary
- Escalation levels

## MVP non-goals

The following should be deliberately postponed:

- Native mobile apps
- Multi-currency payment and settlement
- Advanced seller verification
- Public review system
- Recommendation engine
- User-initiated refunds
- Disputes
- AI-driven dispute decisions
- Full accounting exports
- Complex tax workflows
- Subscription listings
- Auctions
- Multi-vendor cart

## Release slicing guidance

When slicing a feature, prefer releasing a smaller complete user journey instead of a large incomplete capability.

Good slice:

```text
Buyer can start an order from an active listing, see `Awaiting payment`, and understand the next step from the order timeline.
```

Poor slice:

```text
Build an order table and status enum without a user-visible order page or timeline entry.
```

A product slice should include:

- User action
- State change
- User feedback
- Timeline or activity record where relevant
- Operator visibility if the action can create risk
- Measurement signal
