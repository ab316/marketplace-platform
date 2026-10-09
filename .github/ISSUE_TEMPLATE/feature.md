---
name: Feature
about: Propose or define a new feature
title: '[Feature] '
labels: feature
assignees: ''
---

**Domain Area:** (Listings / Orders / Escrow / Ledger / Payments / Disputes / Observability / Infrastructure)

**Financial Impact:** (None / Indirect / Direct (Non-Critical) / Critical (Ledger/Settlement))

**Risk Level:** (Low / Medium / High / Critical (Financial))

**Architecture Change?:** (No / Minor Refactor / New Aggregate / New Event / Cross-Context Change)

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

Select only applicable coverage from `docs/TESTING_STRATEGY.md`. Give each behavior one primary owning test; prove critical invariants directly where a public interface cannot.

- [ ] Unit tests for domain invariants or pure logic
- [ ] API integration tests for HTTP behavior, using real wiring and Postgres; assert observable outcomes
- [ ] Backend workflow integration for multi-step or asynchronous behavior
- [ ] Direct application/infrastructure tests only for internal operations or transaction, locking, persistence, and outbox guarantees needing direct proof
- [ ] Contract/messaging tests when HTTP or event boundaries change
- [ ] Migration verification when schema changes
- [ ] Frontend behavior/accessibility checks when UI changes
- [ ] System E2E for a critical journey through the real web app, backend, and owned infrastructure

Relevant failure, retry, duplicate, replay, and concurrency checks belong in this change's verification when those guarantees are affected. Do not defer required regression evidence to a hypothetical nightly job.

**Definition of Ready**

- [ ] Acceptance criteria clearly defined
- [ ] Financial impact reviewed
- [ ] Risks identified
- [ ] Architecture implications considered
