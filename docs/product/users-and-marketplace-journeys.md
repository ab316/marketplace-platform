# Users and Marketplace Journeys

## User groups

### Buyer

A buyer uses the marketplace to find and purchase an asset or service. The buyer cares about trust, clarity, price, delivery expectations, refund rules, and support if something goes wrong.

Buyer goals:

- Find relevant listings
- Understand what is included
- Compare trust signals
- Pay safely
- Track order progress
- Receive delivery or fulfillment
- Confirm completion
- Raise an issue when needed
- Get a refund when the order fails according to policy

Buyer anxieties:

- Is the seller legitimate?
- What happens after I pay?
- Can I get my money back if the seller does not deliver?
- How long will fulfillment take?
- What evidence do I need in a dispute?

### Seller / organization member

A seller manages listings and orders for an organization. The seller cares about serious buyers, clear fulfillment requirements, payment protection, and predictable settlement.

Seller goals:

- Create high-quality listings
- Receive paid orders
- Understand buyer expectations
- Update fulfillment progress
- Provide proof of delivery
- Respond to buyer issues
- Receive funds after completion
- Track performance and revenue

Seller anxieties:

- Will the buyer pay before I start work?
- Can the buyer abuse disputes?
- When will funds be released?
- What happens if fulfillment is delayed?
- How do I prove delivery?

### Organization administrator

An organization administrator manages the seller organization.

Administrator goals:

- Manage organization profile
- Invite and remove members
- Assign permissions
- Manage payout settings
- Review listings and order activity
- Monitor disputes and revenue
- Maintain trust score and performance

### Marketplace operator

An operator manages marketplace health, trust, disputes, and financial oversight.

Operator goals:

- See stuck orders
- Review disputes
- Approve refunds when required
- Monitor risky activity
- Investigate user complaints
- Reconcile transaction states
- Review audit trails
- Improve marketplace policies

## Journey 1: Buyer discovers and orders

```text
Buyer opens marketplace
→ searches or filters listings
→ views listing details
→ reviews seller trust signals and fulfillment terms
→ starts order
→ reviews price and escrow explanation
→ pays
→ sees order timeline with next step
```

### Product requirements

- Listing details must explain what is being sold.
- Price and fees must be visible before payment.
- Escrow must be explained in plain language.
- Buyer must know when funds may be released.
- Buyer must see what happens after payment.

### Important states

- Listing unavailable
- Seller not accepting orders
- Payment failed
- Order created but unpaid
- Payment secured in escrow

## Journey 2: Seller fulfills an order

```text
Seller receives paid order
→ reviews order details
→ starts fulfillment
→ updates progress
→ provides proof or delivery note
→ requests buyer confirmation
→ waits for confirmation or auto-release window
```

### Product requirements

- Seller should not start fulfillment before payment is secured unless explicitly allowed by policy.
- Seller must see fulfillment expectations.
- Seller can add progress updates.
- Buyer sees meaningful updates, not internal noise.
- Proof of fulfillment should be attached to the order timeline.

### Important states

- Paid into escrow
- Fulfillment started
- Fulfillment delayed
- Proof submitted
- Awaiting buyer confirmation

## Journey 3: Buyer confirms completion

```text
Buyer receives fulfillment
→ reviews proof or delivery
→ confirms completion
→ sees funds released to seller
→ order becomes completed
```

### Product requirements

- Buyer must understand that confirmation releases funds.
- Product should support a confirmation window.
- Product should explain what happens if the buyer does nothing.
- Product should allow the buyer to raise an issue before release when policy allows.

### Important states

- Awaiting confirmation
- Confirmed by buyer
- Auto-release pending
- Completed
- Settled

## Journey 4: Buyer raises a dispute

```text
Buyer sees a problem
→ opens issue from order page
→ selects reason
→ explains issue
→ attaches evidence
→ seller is notified
→ seller responds
→ operator reviews if unresolved
→ decision results in refund, release, partial refund, or another action
```

### Product requirements

- Dispute entry point must be easy to find but not encourage abuse.
- Dispute reasons should be structured.
- Evidence should be attached to the timeline.
- Seller response should be time-bound.
- Operator decision should be visible and explainable.

### Important states

- Issue raised
- Awaiting seller response
- Under review
- Refund approved
- Release approved
- Partial refund approved
- Dispute closed

## Journey 5: Seller receives settlement

```text
Order reaches release condition
→ funds move from escrow to seller balance
→ marketplace fee is applied
→ seller sees settlement status
→ payout is created according to payout rules
```

### Product requirements

- Seller should see why funds became available.
- Settlement amount should show gross, fee, refund, adjustment, and net where relevant.
- Settlement timing should be clear.
- Failed payout should be visible and recoverable.

### Important states

- Funds releasable
- Settlement pending
- Settlement completed
- Payout pending
- Payout failed

## Journey 6: Operator reviews marketplace health

```text
Operator opens dashboard
→ sees stuck orders, disputes, failed payments, refund requests, settlement issues
→ filters by severity
→ opens order detail
→ reviews timeline, payment state, evidence, and history
→ takes action or leaves note
```

### Product requirements

- Operator dashboard should prioritize action needed.
- Order detail should provide complete context.
- Operator actions should be permissioned and audited.
- Notes and decisions should be visible where appropriate.

## Cross-journey experience requirements

These requirements apply across all journeys:

- Every major status should have user-friendly copy.
- Every major action should produce a visible timeline entry when useful.
- Users should know what happens next.
- Users should know who needs to act.
- Financial states should be understandable.
- Permissions should prevent accidental or unauthorized actions.
- Empty states should educate users.
- Error states should explain recovery steps.
