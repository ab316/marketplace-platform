# Product Discovery

This is the living workspace for product thinking that is not stable enough for use cases, ADRs, or implementation issues.

Keep it concise. Prefer decisions, open questions, and candidate slices over long brainstorming transcripts.

## Product Direction

Build a trust-centered marketplace product: escrow-protected transactions with a transparent order timeline, fulfillment tracking, dispute/refund recovery paths, and auditable money movement. The full framing lives in [`product-brief.md`](product-brief.md) and [PD-0001](decisions/0001-product-direction.md).

## Current Product Assumptions

- The product model is defined, but the concrete niche/vertical is not; the first priority is selecting what is actually listed and sold in the first demo.
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

### Recommended Slice A - Direct Listing to Order Timeline

User value:

- A seller creates a listing.
- A buyer discovers the listing and starts a direct order.
- The product creates an order in `Awaiting payment`.
- The order page shows a clear timeline entry and next action.

Why it helps:

- Proves the visible marketplace surface without adding negotiation complexity.
- Establishes organizations, listings, buyer discovery, order creation, basic permissions, and the order timeline.
- Keeps the first frontend demo understandable: "seller published something, buyer started a transaction, everyone can see what happened."
- Creates the foundation for escrow and fulfillment without committing to payment provider details yet.

Open product questions for this slice:

- What is the concrete listing vertical?
- What listing fields are necessary for that vertical?
- Does the buyer order immediately, request availability, or reserve inventory?
- What is the minimum order detail page that still communicates trust?

### Slice B - Order Lifecycle With Simulated Escrow

User value:

- A buyer pays into simulated escrow.
- A seller starts fulfillment and submits it for confirmation.
- A buyer confirms completion.
- Funds are released and the order timeline explains each state change.

Why it helps:

- Proves the trust-centered transaction loop without external payment complexity.
- Forces the product to define user-facing money language: paid into escrow, awaiting confirmation, released, settled.
- Gives engineering a realistic place to prove idempotency, financial history, and auditability.

### Slice C - Operator Order Inspection

User value:

- An operator can inspect an order, timeline, payment state, fulfillment state, and financial history.
- The operator can identify orders stuck in payment, fulfillment, or confirmation.

Why it helps:

- Makes backend correctness visible through a product surface.
- Supports the trust promise without requiring full dispute/refund workflows yet.
- Creates a natural place to add recovery workflows later.

### Deferred Slice - Offers and Negotiation

Offers are useful, but they should not be the first slice by default.

Product value:

- Buyers can propose a different price or terms before committing to an order.
- Sellers can accept, reject, counter, or let offers expire.
- Accepted offers can become orders with negotiated terms.

Why offers are deferred:

- They add a second state machine before the order lifecycle is proven.
- They delay the core trust loop: escrow, fulfillment, confirmation, release, and timeline.
- They can hide the product's main differentiator behind negotiation mechanics.
- They depend heavily on the chosen vertical. Some marketplaces need offers; others need instant order, reservation, quote request, or availability check.

When to revisit offers:

- The chosen niche has high-value, custom, or variable-scope transactions.
- Sellers need to approve buyer terms before fulfillment can start.
- Price, schedule, quantity, or delivery terms are commonly negotiated.
- A direct order flow would feel unrealistic for the first demo vertical.

If offers become necessary for the chosen niche, record a product decision before changing the roadmap. The decision should explain why direct ordering is not enough, what offer states are required, and how accepted offers convert into orders.

## Decision Log

Add short entries here until a decision deserves an ADR.

| Date       | Decision                                                                                           | Reason                                                                              | Follow-up                                   |
| ---------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------- |
| 2026-07-09 | Adopt trust-centered marketplace product direction; consolidate product docs into `docs/product/`. | Product framing was implementation-led; the product brain now lives in the repo.    | PD-0001; keep niche question open below.    |
| 2026-06-27 | Use a route-driven, feature-oriented frontend architecture.                                        | Frontend quality should match backend rigor without copying backend layering to UI. | Follow `docs/architecture/web/REPO_MAP.md`. |
| 2026-06-25 | Treat frontend as first-class product surface.                                                     | The repo has shifted from backend-only to monorepo and needs visible product value. | Update roadmap and workflow docs.           |

## Promotion Rules

- Move an idea worth keeping to `docs/product/ideas/` (one file per idea, using the template).
- Move stable user behavior to `docs/product/use-cases/`.
- Move durable product decisions to `docs/product/decisions/`.
- Move durable architecture decisions to `docs/decisions/`.
- Move implementation-ready work to GitHub Issues.
- Move visual exploration to Figma when layout, interaction, or brand judgment matters more than text.
