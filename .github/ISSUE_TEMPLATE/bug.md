---
name: Bug
about: Report a bug with enough context to reproduce and fix safely
title: '[Bug] '
labels: bug
assignees: ''
---

**Domain Area:** (Escrow / Ledger / Orders / Payments / etc.)

**Financial Impact:** (None / Indirect / Direct (Non-Critical) / Critical (Ledger/Settlement))

**Severity:** (Low / Medium / High / Critical)

**Description**
What is happening?

**Expected Behavior**

**Steps to Reproduce**

1. ...
2. ...
3. ...

**Invariants Potentially Violated**
Identify any domain rule that may be broken

- Ledger must remain balanced
- Escrow cannot be released twice

**Event Impact**
Did duplicate, missing, or out-of-order events contribute?

**Logs / Evidence**
Relevant logs, traces, or screenshots (remove sensitive data)

**Environment:** (local / dev / staging / prod)

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

**Investigation Checklist (where applicable)**

- [ ] Financial correctness verified
- [ ] Idempotency checked
- [ ] Concurrency reviewed
- [ ] Event replay considered
- [ ] Root cause identified
