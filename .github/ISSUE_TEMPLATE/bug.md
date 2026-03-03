---
name: Bug
about: Report a bug with enough context to reproduce and fix safely
title: "[Bug] "
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

**Investigation Checklist**

- [ ] Financial correctness verified
- [ ] Idempotency checked
- [ ] Concurrency reviewed
- [ ] Event replay considered
- [ ] Root cause identified
