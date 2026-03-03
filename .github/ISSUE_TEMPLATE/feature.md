---
name: Feature
about: Propose or define a new feature
title: '[Feature] '
labels: feature
assignees: ''
---

**Domain Area**
(Listings / Orders / Escrow / Ledger / Payments / Disputes / Observability / Infrastructure)

**Financial Impact**
(None / Indirect / Direct (Non-Critical) / Critical (Ledger/Settlement))

**Risk Level**
(Low / Medium / High / Critical (Financial))

**Architecture Change?**
(No / Minor Refactor / New Aggregate / New Event / Cross-Context Change)

**User Story**
As a ...
I want to ...
So that ...

**Acceptance Criteria**
Must be testable and unambiguous

- ...

**Domain Invariants Impacted**
List invariants introduced or modified

- Escrow cannot be released twice
- Ledger must remain balanced

**Event Model Impact**
New or modified domain/integration events

- EscrowPartiallyRefunded.v1
- OrderStatusChanged.v1

**Identified Risks**
Technical, financial, and operational risks

- Concurrency issues
- Duplicate event risk

**Testing Strategy**
Select required suites per `TESTING_STRATEGY.md`

PR (fast, required where applicable):

- [ ] Lint + typecheck
- [ ] Unit tests (domain/application and frontend components/hooks)
- [ ] Use-case integration tests (real DB + transactions + outbox writes; external providers mocked)
- [ ] API tests (validation/error shape + DB/outbox side effects for changed endpoints)
- [ ] Migration test (empty DB -> latest when schema changes)
- [ ] Contract tests (HTTP/events when contracts change)

Nightly / post-deploy (when applicable):

- [ ] Expanded integration/API/outbox-messaging coverage (retries, poison, dedupe/idempotency)
- [ ] E2E workflow coverage for critical cross-module flows
- [ ] Non-functional suites (performance/resilience/security) for risky changes
- [ ] Post-deploy smoke checks (health + minimal happy path)

**Definition of Ready**

- [ ] Acceptance criteria clearly defined
- [ ] Financial impact reviewed
- [ ] Risks identified
- [ ] Architecture implications considered
