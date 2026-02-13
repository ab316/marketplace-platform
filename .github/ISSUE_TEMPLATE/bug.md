---
name: Bug
about: Report a bug with enough context to reproduce, diagnose, and fix safely
title: 'Bug: <Short description>'
labels: bug
assignees: ''
---

# Bug Overview

## Summary

Describe the bug in 1–3 sentences.

## Severity

- [ ] Critical (financial correctness / data loss / security)
- [ ] High (core flow broken, no workaround)
- [ ] Medium (partial impairment, workaround exists)
- [ ] Low (minor issue, cosmetic)

## Affected Area

- [ ] apps/backend
- [ ] apps/web
- [ ] packages/\*
- [ ] CI/CD
- [ ] Infrastructure/Deployment

---

# Impact & Risk

## User Impact

Who is affected and how?

## Financial / Data Risk

- [ ] Risk of double-charge
- [ ] Risk of lost events
- [ ] Risk of inconsistent state
- [ ] Risk of data loss/corruption
- [ ] No financial/data risk

Explain briefly.

## Security Risk

- [ ] Auth/AuthZ bypass
- [ ] Sensitive data exposure
- [ ] Other security concern
- [ ] No security risk

Explain briefly.

---

# Reproduction

## Preconditions

What must be true before reproducing?

## Steps to Reproduce

1.
2.
3.

## Expected Behavior

What should happen?

## Actual Behavior

What actually happens?

---

# Evidence

## Logs / Screenshots

Paste relevant logs or screenshots (remove sensitive data).

## Correlation / Trace IDs

If available, include:

- Correlation ID:
- Trace ID:
- Request ID:

## Environment

- Environment: local / dev / staging / prod
- OS:
- Node version:
- Browser (if web):
- Commit/branch:

---

# Scope (Backend)

## Owning Module

If backend, which module likely owns this behavior?
apps/backend/src/modules/<module>

## Cross-Module?

- [ ] Yes
- [ ] No

If yes, list modules involved.

## Events Involved (if any)

- Domain events:
- Integration events:

---

# Suspected Cause (Optional)

## Hypothesis

What do you think is happening?

## Recent Changes

Link related PRs/issues if known.

---

# Safety & Constraints

## Architecture Constraints (Must Respect)

- No cross-layer violations
- No cross-module infrastructure imports
- Maintain outbox correctness for integration events
- Preserve invariants and transaction boundaries

## Hotfix Allowed?

- [ ] Yes (minimal safe fix)
- [ ] No (requires full workflow + ADR)

---

# Fix Plan (to be filled during triage)

## Proposed Fix

What change is needed?

## Tests to Add/Update

- [ ] Unit tests
- [ ] Integration tests
- [ ] API/E2E tests

List what will be added/updated.

## Observability Updates

- [ ] Improve logs
- [ ] Add metrics
- [ ] Add traces/spans

---

# Definition of Done

- [ ] Reproduction confirmed
- [ ] Root cause identified
- [ ] Fix implemented with minimal scope
- [ ] Tests added/updated
- [ ] Observability improved (if needed)
- [ ] No architecture violations introduced
- [ ] Verified in target environment
