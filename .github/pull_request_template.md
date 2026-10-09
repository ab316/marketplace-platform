## Summary

What problem does this change solve, and what behavior results?

Related issue/use case (if applicable):

## Verification

List commands actually executed and their results. Identify unrun checks, failures, and any manual smoke evidence. Select tests using `docs/TESTING_STRATEGY.md`; each behavior should have one primary owning test.

- [ ] `pnpm run check` passed (or explain failures/unavailable checks)
- [ ] Relevant behavior verified through API/workflow/frontend interfaces; critical domain/infrastructure guarantees tested directly where needed
- [ ] System E2E used only for complete product journeys where applicable

## Applicable review checks

Remove inapplicable items; explain material gaps.

- [ ] Acceptance criteria satisfied; scope remains bounded
- [ ] Module/layer and web/backend boundaries respected
- [ ] Authorization and tenant isolation verified
- [ ] UI states and keyboard/label/focus accessibility handled
- [ ] Money invariants and retry/duplicate/replay/concurrency behavior verified when affected
- [ ] Integration events use the outbox, versioned schemas, and idempotent consumers
- [ ] Migration and contract compatibility assessed
- [ ] Relevant error handling and observability present; no sensitive data logged
- [ ] Affected use cases, event catalog, producer/consumer READMEs, module catalog, and ADRs updated in this PR as applicable
- [ ] Relevant changelog entry included; project state updated only for changed focus, decisions, or risks

## Remaining risks or follow-ups

Include unresolved questions and verification limits. Merge and release publication remain human actions.
