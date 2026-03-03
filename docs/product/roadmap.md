# Roadmap

This roadmap is outcome-driven. Dates are estimates and may change.

## Now

- [x] Pilot
  - Deliverables:
    - Setup repository
  - Success metrics:
    - Repository is created and available on GitHub

- [ ] Phase 1A - Foundation
  - Goal
    - Solid architecture base
  - Deliverables:
    - modular monolith with clean architecture
    - bounded contexts & aggregates
    - domain events & integration events
    - Postgres persistence
    - message bus
    - transactional outbox
    - inbox deduplication
    - idempotent consumers
  - Success metrics:
    - Foundational code is available to be used

## Next

- [ ] Phase 1B - Core Domain
  - Goal
    - Solid architecture base
  - Deliverables:
    - Users & Organizations
    - Listings
    - Offers
    - Orders lifecycle
  - Success metrics:
    - Foundational code is available to be used

- [ ] Phase 2 - Payment & Ledger Correctness
  - Goal
    - Financial integrity & trust
  - Deliverables:
    - payment abstraction (simulate first)
    - Stripe integration later
    - double-entry ledger
    - escrow accounts
    - platform fee calculations
    - refund & reversal entries
  - Success metrics:
    - Payment & ledger code is available to be used

## Later

## Technical Debt / Hardening (ongoing)

- [ ] Testing improvements
- [ ] Observability improvements
- [ ] Performance improvements
- [ ] Security improvements

## Risks

- Project stalled: Keep up the motivation to work on the project

## Notes

- Links to ADRs:
- Links to use-cases:
