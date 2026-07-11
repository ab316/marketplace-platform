# Success Metrics

> **Status: provisional.** Written before the niche/vertical decision (roadmap Phase 0) and before any usage exists to measure. Revisit once the first use case ships — some metrics here may not apply to the chosen vertical.

The product should be measured by whether it creates safer, clearer, and more successful marketplace transactions.

## North star metric

### Successfully completed trusted orders

A successfully completed trusted order is an order where:

- Buyer paid into escrow.
- Seller fulfilled the order.
- Buyer confirmed or release condition was met.
- Funds were released correctly.
- Order reached completed state.
- No unresolved dispute or financial inconsistency remains.

This metric reflects the core product promise.

## Product funnel metrics

### Discovery to order

- Listing views
- Listing-to-order conversion rate
- Search with result rate
- Search with no result rate
- Listing detail exit rate

### Order to payment

- Orders created
- Payment started rate
- Payment success rate
- Payment failure rate
- Unpaid order cancellation rate
- Unpaid order expiration rate

### Payment to fulfillment

- Paid orders
- Fulfillment started rate
- Time from payment to fulfillment start
- Orders stuck after payment

### Fulfillment to completion

- Fulfillment submitted rate
- Buyer confirmation rate
- Time to confirmation
- Orders awaiting confirmation too long
- Completion rate

### Recovery flows

- Refund request rate
- Refund approval rate
- Dispute open rate
- Dispute resolution time
- Dispute outcome distribution
- Orders recovered from stuck state

## Trust metrics

Trust metrics indicate whether users believe the marketplace is safe and understandable.

Buyer trust signals:

- Buyer confirmation rate
- Repeat buyer rate
- Buyer dispute rate by seller/listing
- Buyer support contact rate after payment
- Buyer cancellation rate before payment

Seller trust signals:

- Seller fulfillment start rate
- Seller fulfillment completion rate
- Seller dispute rate
- Seller settlement issue rate
- Seller repeat listing activity

Marketplace trust signals:

- Completed orders without dispute
- Orders with clear timeline coverage
- Refunds completed within target time
- Disputes resolved within target time
- Financial mismatch count

## Operational metrics

Operators need to know whether the marketplace is becoming hard to run.

Metrics:

- Open disputes
- Disputes older than target age
- Refund requests pending review
- Failed payments needing attention
- Orders stuck by status
- Settlement failures
- Operator actions per 100 orders
- Support tickets per 100 orders
- Average time to resolve issue

## Financial correctness metrics

Financial correctness is critical because the product handles escrow, refunds, release, fees, and settlement.

Metrics:

- Orders with inconsistent money state
- Payment success without escrow record
- Escrow release without completion/release decision
- Refund without matching financial history
- Settlement mismatch count
- Manual reconciliation count
- Failed payout count

Target direction:

- Financial mismatch count should be zero.
- Any mismatch should create an operational alert.

## Listing quality metrics

High-quality listings should reduce confusion and disputes.

Metrics:

- Listings published
- Draft-to-published conversion
- Listings rejected by validation
- Listing views
- Listing-to-order conversion
- Dispute rate by listing quality
- Refund rate by listing quality
- Missing information warnings

## Timeline clarity metrics

The order timeline is a core trust feature.

Metrics:

- Orders with complete timeline coverage
- Timeline views per active order
- Support contacts after timeline view
- User feedback on timeline helpfulness
- Number of status changes without visible explanation

## AI feature metrics

AI features should be measured by usefulness and safety.

Dispute summary assistant:

- Operator time saved
- Summary correction rate
- Decision confidence rating
- User appeal rate after AI-assisted review

Support assistant:

- Questions answered without support escalation
- Incorrect answer reports
- Timeline explanation helpfulness

Listing quality scoring:

- Listing completion improvement
- Conversion improvement
- Dispute reduction
- Refund reduction

Fraud risk signals:

- True positive rate
- False positive rate
- Manual review load
- Risky order prevention rate

## MVP success criteria

The MVP should be considered successful if it demonstrates:

1. Buyers can complete payment into escrow.
2. Sellers can fulfill paid orders.
3. Buyers can confirm completion.
4. Funds release correctly.
5. Users can understand order progress from the timeline.
6. Operators can inspect problematic orders.
7. Refund and dispute basics exist for failed transactions.
8. Financial records remain consistent.

Suggested MVP target examples:

| Metric                     | Target direction                   |
| -------------------------- | ---------------------------------- |
| Payment success rate       | High and improving                 |
| Paid order completion rate | High and improving                 |
| Orders stuck after payment | Low and decreasing                 |
| Dispute resolution time    | Predictable and decreasing         |
| Financial mismatch count   | Zero                               |
| Timeline coverage          | Near complete for important events |

## Metrics to avoid over-optimizing early

Early product development should not over-focus on vanity metrics.

Avoid treating these as primary success measures in MVP:

- Total registered users
- Total listing count
- Page views without order activity
- AI feature usage without quality signal
- Dashboard visits without action completion

The product should first prove transaction trust and completion.
