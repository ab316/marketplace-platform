# Changelog

All notable changes to this project will be documented in this file.

This project follows:

- Semantic Versioning (MAJOR.MINOR.PATCH)
- Multi-role governance workflow
- Financial correctness discipline
- Event-driven architectural integrity

---

## Versioning Strategy

### MAJOR

Breaking changes:

- API contract changes
- Event schema breaking changes
- Domain invariant changes
- Architectural boundary changes
- Database changes requiring migration strategy

### MINOR

Backward-compatible feature additions:

- New endpoints
- New domain behaviors (non-breaking)
- New events (non-breaking)
- Observability enhancements

### PATCH

Bug fixes:

- Correctness fixes
- Financial safety patches
- Performance fixes
- Internal refactors (no behavior change)

---

# [Unreleased]

## Added

-

## Changed

-

## Fixed

-

## Financial Impact

-

## Event Impact

-

## Architecture Notes

- ***

# [X.Y.Z] - YYYY-MM-DD

## Summary

Short description of this release and its scope.

---

## Added

- ***

## Changed

- ***

## Fixed

- ***

## Financial Impact

Indicate if release affects:

- Escrow
- Ledger
- Settlement
- Refunds
- Payments

Example:

- Improved escrow release idempotency
- Added invariant enforcement for partial refunds

If no impact:

- No financial behavior changed

---

## Event Impact

Document event-level changes:

- New events introduced
- Event schema changes
- Versioned events
- Consumer behavior changes

Example:

- Added `EscrowPartiallyRefunded` event (v1)
- Versioned `OrderStatusChanged` to v2 (non-breaking)

If none:

- No event model changes

---

## Architecture Notes

- New aggregate introduced?
- Cross-context change?
- New bounded context?
- Significant refactor?
- ADR reference (if applicable)

Example:

- Introduced EscrowRefundPolicy domain service
- ADR-004: Adopt optimistic locking for financial aggregates

---

## Migration Notes (If Applicable)

- Database migrations
- Backfill scripts
- Manual steps required
- Feature flags enabled/disabled

If none:

- No migration required

---

## Observability

- Logs added/updated
- Metrics added
- Tracing improvements

If none:

- No observability changes

---

## Known Limitations

- ***

# Template for New Release Entry

Copy this when creating a new release:

```
# [X.Y.Z] - YYYY-MM-DD

## Summary

-

## Added
-

## Changed
-

## Fixed
-

## Financial Impact
-

## Event Impact
-

## Architecture Notes
-

## Migration Notes
-

## Observability
-

## Known Limitations
-
```

---

# Release Discipline

## Ownership & Cadence

- Primary owner: Technical Writer (`/tech-writer`)
- Release owner: Release Manager (`/release-manager`)
- Update cadence:
  - after each merged PR → update `[Unreleased]`
  - weekly/release rollup → verify completeness against worklog/summaries

### Post-Merge Rule

- Do not wait for release day to document changes.
- Every merged PR should be reflected in `[Unreleased]` before issue closeout.

Before updating this file:

- Complete docs/RELEASE_CHECKLIST.md
- Ensure milestone issues are closed
- Verify Financial Impact section is accurate
- Verify Event Impact section is accurate
- Confirm no undocumented breaking changes

---

# Principle

The changelog is not marketing.

It is an engineering artifact that documents:

- Domain evolution
- Financial safety improvements
- Event model changes
- Architectural maturity

If a future reader cannot understand what changed and why, the entry is incomplete.
