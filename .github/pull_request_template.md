# Pull Request

## Summary

What does this PR change and what problem does it solve?

Related Issue: Closes #

---

## Architecture & Boundaries

- [ ] No cross-layer violations
- [ ] No cross-module infrastructure/presentation imports
- [ ] Business logic in aggregates (not controllers)
- [ ] If new module: README + MODULE_CATALOG.md updated
- [ ] If new/changed integration event: EVENT_CATALOG.md updated, versioned
- [ ] If architecture changed: ADR added/updated

---

## Financial & Domain Safety

- [ ] No financial impact
- [ ] Financial impact reviewed (double-charge, double-release, ledger balance, refund rules, idempotency)

---

## Idempotency & Concurrency

- [ ] Safe under retries, duplicate events, and concurrent requests

---

## Events

- [ ] Integration events persisted via outbox (if applicable)
- [ ] Consumers remain idempotent
- [ ] No breaking event schema changes (or versioned)

---

## Tests

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated (if infra changed)
- [ ] API tests added/updated (if endpoints changed)

---

## Observability

- [ ] Structured logs added (if needed)
- [ ] Errors explicit and meaningful
- [ ] No silent failure paths

---

## Documentation

- [ ] Relevant docs updated (use-case, ADR, diagrams, README)

---

## Final Checklist

- [ ] Acceptance criteria satisfied
- [ ] No scope expansion beyond issue
- [ ] Invariants preserved
- [ ] Ready for QA
