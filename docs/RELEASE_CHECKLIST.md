# Release Checklist

Complete before creating a Git tag.

## Release Metadata

- Version:
- Date:
- Release Type: [ ] Patch | [ ] Minor | [ ] Major
- Related Milestone:
- Primary Domain Area(s):

---

## 1. Scope (Product Owner)

- [ ] All milestone issues in 🎉 Done
- [ ] Acceptance criteria satisfied for each issue
- [ ] No open critical risk items
- [ ] Feature flags documented with safe defaults (if any)

## 2. Architecture Integrity

- [ ] No unresolved architecture change items
- [ ] New aggregates documented
- [ ] EVENT_CATALOG.md updated (if needed)
- [ ] MODULE_CATALOG.md updated (if needed)
- [ ] ADR created/updated for major changes
- [ ] No cross-layer violations or temporary hacks

## 3. Financial & Domain Safety

If release affects escrow, ledger, settlement, refunds, or payments:

- [ ] Ledger balanced in all flows
- [ ] No double-charge or double-release scenarios
- [ ] Refund invariants preserved
- [ ] All financial operations idempotent
- [ ] Concurrency edge cases tested
- [ ] Replay safety and duplicate event handling verified

If no financial impact:

- [ ] Confirmed no hidden financial side effects

## 4. Event & Messaging Safety

- [ ] Integration events persisted via outbox
- [ ] No breaking event schema changes (or properly versioned)
- [ ] Consumers remain idempotent
- [ ] Replay does not corrupt state

## 5. Testing

- [ ] Unit, integration, and API tests passing
- [ ] Domain invariant tests included
- [ ] Concurrency scenarios covered (if relevant)
- [ ] No skipped tests
- [ ] Clean install → tests pass
- [ ] Fresh database → migrations work

## 6. Database & Migration Safety

If schema changed:

- [ ] Migration reviewed and reversible (if required)
- [ ] No destructive operations without data strategy
- [ ] Production data impact assessed

## 7. Observability

- [ ] Structured logs for new flows
- [ ] Errors explicit and meaningful
- [ ] No silent failures introduced
- [ ] Can diagnose failure using logs alone

## 8. Security

- [ ] Role checks validated
- [ ] No privilege escalation paths
- [ ] Sensitive fields not exposed
- [ ] No secrets committed

## 9. Documentation

- [ ] README, use-case docs, diagrams, ADRs, CHANGELOG updated as needed

---

## Tagging

Human approval gate:

- [ ] Explicit human approval recorded for tag/release publish.

Execution steps:

1. Update version
2. Commit CHANGELOG
3. `git tag vX.Y.Z`
4. `git push origin vX.Y.Z`
5. Create GitHub Release with summary
