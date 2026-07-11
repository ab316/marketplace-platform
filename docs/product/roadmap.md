# Roadmap

The roadmap: what we're building, what's next, and why. This is the durable baseline agents read when shaping work.

**Current focus:** Phase 0 — close out product direction: pick the concrete niche/vertical and write the first use case. The product model itself is now defined (see [PD-0001](decisions/0001-product-direction.md) and [`mvp-scope.md`](mvp-scope.md)).

Outcome-driven. Keep dates out until there is real delivery cadence. When a phase is ready to build, turn it into a use case in `docs/product/use-cases/` and (optionally) a plain GitHub issue for tracking.

## Now

- [x] Repository bootstrap
  - Deliverables:
    - Monorepo scaffold
    - Initial backend architecture docs
    - AI role/workflow docs
  - Success metric:
    - Repository is usable as a starting point

- [ ] Phase 0 - Product Direction
  - Goal:
    - Choose the marketplace niche and first demo workflow
  - Done so far:
    - [x] Product model defined: trust-centered marketplace with escrow, order timeline, fulfillment, disputes, refunds, settlement (PD-0001; `product-brief.md`, `vision-problem-strategy.md`)
    - [x] MVP scope and non-goals defined (`mvp-scope.md`) — offers/negotiation deferred post-MVP
    - [x] Feature catalog, backlog, business rules, success metrics drafted (`feature-catalog.md`, `product-backlog.md`, `business-rules-policies.md`, `success-metrics.md`)
  - Remaining deliverables:
    - concrete niche/vertical decision recorded in `discovery.md` (what is actually listed and sold in the first demo)
    - first stable use case in `docs/product/use-cases/`
    - rough UX direction, with Figma used if visual exploration is needed
  - Success metric:
    - A new AI session can explain what the first product slice is and why it matters

- [ ] Phase 1 - Thin Marketplace Slice
  - Goal:
    - Build one visible end-to-end workflow across web and backend
  - Candidate workflow (aligned with MVP scope; offers are deferred):
    - seller organization publishes a listing
    - buyer discovers the listing and creates an order
    - order timeline shows what happened and what's next
  - Deliverables:
    - Next.js frontend initialized in `apps/web`
    - backend API for the chosen slice
    - shared API contract package used by both apps
    - focused unit/API tests
  - Success metric:
    - The product can be demoed locally through the web UI

## Next

- [ ] Phase 2 - Order Lifecycle
  - Goal:
    - Turn orders into auditable state machines
  - Deliverables:
    - order aggregate and state transitions
    - order history/audit trail (feeds the user-facing timeline)
    - operator-visible order inspection
    - idempotency rules for command handling
  - Success metric:
    - Order state changes are explicit, tested, and visible

- [ ] Phase 3 - Simulated Escrow Payment and Ledger
  - Goal:
    - Prove financial correctness without external payment-provider complexity
  - Deliverables:
    - fake payment provider boundary
    - escrow hold / release / refund simulation
    - double-entry ledger model
    - transactional outbox for integration events
    - destructive tests for retries, duplicates, and concurrency
  - Success metric:
    - Financial flows remain correct under failure simulation

Phases 1–3 together deliver the product-level MVP trust loop defined in `mvp-scope.md`.

## Later

Product-level phasing (details in `feature-catalog.md` and `product-backlog.md`):

- [ ] Recovery and trust workflows — refund requests, basic disputes, operator dashboard, settlement visibility, notifications
- [ ] Experience improvements — offers/negotiation, listing quality guidance, search/filters, seller analytics, saved listings
- [ ] Advanced trust and intelligence — AI timeline/dispute assistants, listing quality scoring, fraud risk signals
- [ ] Scale — real payment provider, multi-currency, payouts, webhooks/public API, reconciliation dashboards
- [ ] Platform hardening — deployment pipeline, staging, observability, security hardening

## Risks

- Over-documenting before product direction is clear.
- Building backend architecture without a visible product demo.
- Adding payment complexity before simulated flows prove the model.
- Letting AI generate process artifacts that are not actively used.

## Notes

- Product hub: `docs/product/README.md`
- Product discovery: `docs/product/discovery.md`
- MVP definition: `docs/product/mvp-scope.md`
- How we work: `AGENTS.md`
- Product decisions: `docs/product/decisions/` · Architecture decisions: `docs/decisions/`
