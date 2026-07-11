# Feature Idea: Trust-Centered Order Timeline

## Status

Convert to MVP feature

## Product question

How can the product make buyers and sellers understand exactly what happened, what is happening now, and what happens next during an order?

## User problem

Marketplace users often lose trust after checkout because they cannot tell whether payment is protected, whether the seller has started fulfillment, whether the buyer needs to act, or why a status changed.

## Affected users

- Buyer
- Seller
- Marketplace operator

## Affected journey

- Order creation
- Payment
- Fulfillment
- Buyer confirmation
- Refund
- Dispute
- Settlement

## Rough idea

Every order should have a timeline that explains important events in plain language. The timeline should not be a technical event log. It should be a user-facing transaction story.

Example entries:

- Order created
- Payment secured in escrow
- Seller started fulfillment
- Seller submitted fulfillment for confirmation
- Buyer confirmed completion
- Funds released to seller
- Buyer opened dispute
- Operator approved refund

## Why it might matter

Trust impact: high

Transaction impact: high

Operational impact: high

A clear timeline can reduce support questions, reduce user anxiety, and help operators resolve disputes faster.

## Smallest useful version

For MVP, show timeline entries for:

- Order created
- Payment result
- Fulfillment started
- Fulfillment update
- Confirmation requested
- Buyer confirmed
- Funds released
- Refund/dispute/cancellation events

Each entry should include:

- Title
- Timestamp
- User-friendly explanation
- Actor where useful

## Risks and trade-offs

- Too much detail can overwhelm users.
- Too little detail can reduce trust.
- Internal-only events should not leak confusing implementation details.
- Financial timeline entries must be accurate.

## Open questions

- Should the timeline show different detail levels for buyers, sellers, and operators?
- Should financial entries show exact amounts to all users?
- Should timeline entries be editable for copy changes, or immutable once created?
- Should operator notes appear in the same timeline or a separate activity history?

## Decision

Convert to MVP feature.

## Notes

This idea should be reflected in the feature catalog, MVP scope, backlog, and business rules.
