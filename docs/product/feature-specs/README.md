# Feature Specs

Product-side design docs for accepted features (Level 2+ in `product-operating-model.md`): problem, journey, main flow, edge cases, states, permissions, timeline entries, notifications, business rules, acceptance criteria, success metrics.

Use [`../templates/feature-spec.md`](../templates/feature-spec.md). Suggested file naming:

```text
seller-withdrawal.md
dispute-evidence-collection.md
```

A feature spec is not the same as a use case (`../use-cases/`): the spec is product design (what and why, still implementation-free); the use case is the settled, implementation-ready handoff to engineering. A feature spec is distilled into one or more use cases once behavior is stable enough to build against.

## Current specs

- [`identity-and-access-control.md`](identity-and-access-control.md) — sign-up/sign-in, organizations, fixed roles, platform admin (PD-0003; UC-002/UC-003).
- [`escrow-payment.md`](escrow-payment.md) — buyer pays an order into escrow through a simulated provider; fee, racing, and stock rules (PD-0004; UC-004).
- [`catalogue-search.md`](catalogue-search.md) — buyer narrows and orders the catalogue: keyword, filters, sorting, and the no-results state (P1-010; UC-006). Ready; slices 2–3 unscheduled.
- [`seller-listing-management.md`](seller-listing-management.md) — sellers create incomplete drafts, edit, publish, and archive listings, and review the organization's listings (P1-012, P1-017; UC-005, UC-007–UC-010). Draft, awaiting approval.
