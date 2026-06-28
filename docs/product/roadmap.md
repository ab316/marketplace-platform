# Roadmap

The roadmap: what we're building, what's next, and why. This is the durable baseline agents read when shaping work.

**Current focus:** Phase 0 — choose the marketplace niche and first demo workflow.

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
  - Deliverables:
    - `docs/product/discovery.md` updated with target user, niche, and first slice decision
    - first stable use case in `docs/product/use-cases/`
    - rough UX direction, with Figma used if visual exploration is needed
  - Success metric:
    - A new AI session can explain what the first product slice is and why it matters

- [ ] Phase 1 - Thin Marketplace Slice
  - Goal:
    - Build one visible end-to-end workflow across web and backend
  - Candidate workflow:
    - seller creates listing
    - buyer submits offer
    - seller accepts or rejects offer
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
    - Turn accepted offers into auditable orders
  - Deliverables:
    - order aggregate and state transitions
    - order history/audit trail
    - operator-visible order inspection
    - idempotency rules for command handling
  - Success metric:
    - Order state changes are explicit, tested, and visible

- [ ] Phase 3 - Simulated Payment and Ledger
  - Goal:
    - Prove financial correctness without external payment-provider complexity
  - Deliverables:
    - fake payment provider boundary
    - authorization/capture/refund simulation
    - double-entry ledger model
    - transactional outbox for integration events
    - destructive tests for retries, duplicates, and concurrency
  - Success metric:
    - Financial flows remain correct under failure simulation

## Later

- [ ] Real payment provider integration
- [ ] Disputes and refunds
- [ ] Admin/operator console hardening
- [ ] Observability dashboards
- [ ] Deployment pipeline and staging environment
- [ ] Security hardening

## Risks

- Over-documenting before product direction is clear.
- Building backend architecture without a visible product demo.
- Adding payment complexity before simulated flows prove the model.
- Letting AI generate process artifacts that are not actively used.

## Notes

- Product discovery: `docs/product/discovery.md`
- How we work: `AGENTS.md`
- Architecture decisions: `docs/decisions/`
