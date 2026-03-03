---
name: Feature test
about: Propose or define a new feature
title: "[Feature] "
labels: ''
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

- Unit tests for aggregate invariants
- Integration tests for event publishing

**Definition of Ready**

- [ ] Acceptance criteria clearly defined
- [ ] Financial impact reviewed
- [ ] Risks identified
- [ ] Architecture implications considered
