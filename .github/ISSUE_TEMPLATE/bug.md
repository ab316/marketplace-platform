---
name: Bug
about: Report a bug with enough context to reproduce and fix safely
title: '[Bug] '
labels: bug
assignees: ''
---

**Domain Area**
(Escrow / Ledger / Orders / Payments / etc.)

**Financial Impact**
(None / Indirect / Direct (Non-Critical) / Critical (Ledger/Settlement))

**Severity**
(Low / Medium / High / Critical)

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

**Environment**
(local / dev / staging / prod)

**Testing Strategy**
Select the tests required by `TESTING_STRATEGY.md` for this bug/fix

- [ ] Unit tests (pure logic, deterministic, no network/filesystem)
- [ ] Use-case integration tests (real DB + transactions + outbox writes; external providers mocked)
- [ ] API tests (routing/validation/error shape + DB/outbox side effects)
- [ ] Contract tests (HTTP/event compatibility if contract payloads changed)
- [ ] Migration test (empty DB -> latest when schema/migration changed)
- [ ] Outbox/messaging tests (dedupe/idempotency + retry/poison handling)
- [ ] Nightly-only coverage needed (E2E workflow and/or non-functional suites)

**Investigation Checklist**

- [ ] Financial correctness verified
- [ ] Idempotency checked
- [ ] Concurrency reviewed
- [ ] Event replay considered
- [ ] Root cause identified
