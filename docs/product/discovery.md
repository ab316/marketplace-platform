# Product Discovery

This is the living workspace for product thinking that is not stable enough for use cases, ADRs, or implementation issues.

Keep it concise. Prefer decisions, open questions, and candidate slices over long brainstorming transcripts.

## Product Direction

Build a portfolio-grade marketplace platform that demonstrates practical product engineering, not only backend architecture.

The product should eventually show:

- a clear buyer/seller workflow
- trust and safety decisions
- meaningful frontend UX
- reliable transactional backend behavior
- auditability around important state changes

## Current Product Assumptions

- The project is still pre-product; the first priority is selecting a concrete marketplace niche and first workflow.
- The marketplace domain is useful because it creates realistic complexity: identity, listings, orders, payments, disputes, and admin workflows.
- Financial correctness is important for the portfolio story, but real payment integration can wait until a simulated provider proves the domain model.
- The frontend should be treated as a first-class product surface, not a thin demo for backend APIs.

## Open Questions

- What is the marketplace niche for the first demo: services, rentals, digital goods, local assets, or something else?
- Who is the primary demo user: buyer, seller, marketplace operator, or reviewer/employer?
- What is the first end-to-end workflow that proves product value?
- Which workflows need design exploration in Figma before implementation?
- Which parts are portfolio-critical, and which are deliberately out of scope?

## Candidate First Slices

### Slice A - Listing to Offer

User value:

- A seller creates a listing.
- A buyer discovers it and submits an offer.
- The seller accepts or rejects the offer.

Why it helps:

- Establishes identity, listings, offers, frontend flows, and basic state transitions without real money movement.

### Slice B - Order Lifecycle With Simulated Payment

User value:

- An accepted offer becomes an order.
- Payment is authorized through a fake provider.
- The order moves through fulfillment and completion.

Why it helps:

- Proves state transitions, idempotency, and auditability while avoiding Stripe complexity.

### Slice C - Operator Console

User value:

- An operator can inspect users, listings, orders, and audit trail entries.

Why it helps:

- Makes backend correctness visible and creates a stronger portfolio demo.

## Decision Log

Add short entries here until a decision deserves an ADR.

| Date       | Decision                                       | Reason                                                                              | Follow-up                         |
| ---------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------- |
| 2026-06-25 | Treat frontend as first-class product surface. | The repo has shifted from backend-only to monorepo and needs visible product value. | Update roadmap and workflow docs. |

## Promotion Rules

- Move stable user behavior to `docs/product/use-cases/`.
- Move durable architecture decisions to `docs/decisions/`.
- Move implementation-ready work to GitHub Issues.
- Move visual exploration to Figma when layout, interaction, or brand judgment matters more than text.
