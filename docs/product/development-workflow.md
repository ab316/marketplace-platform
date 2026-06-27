# Development Workflow

This workflow is optimized for a solo founder using AI as a high-leverage collaborator.

Default to a lightweight loop. Escalate only when risk justifies it.

## Default Loop

Use this for most work:

`discover -> decide -> design -> build -> review -> record`

| Step     | Purpose                                                              | Typical Output                                               |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Discover | Clarify the customer/user problem and smallest useful slice.         | Notes in `docs/product/discovery.md` or a GitHub issue.      |
| Decide   | Record durable choices before they are forgotten.                    | Decision log entry, use case, or ADR.                        |
| Design   | Sketch boundaries, UI/API shape, data, and tests at the right depth. | Short plan, use-case update, or architecture note.           |
| Build    | Implement one vertical slice.                                        | Code and focused tests.                                      |
| Review   | Check correctness, UX, boundaries, and docs impact.                  | Self-review or `/review` output.                             |
| Record   | Preserve only useful project memory.                                 | `CHANGELOG.md`, `docs/PROJECT_STATE.md`, or concise worklog. |

## Risk-Based Process

### Tier 0 - Discovery and Docs

Examples:

- product brainstorming
- roadmap edits
- README or agent-doc cleanup
- Figma/design planning

Process:

- Update `docs/product/discovery.md`, roadmap, use cases, or ADRs as appropriate.
- Keep assumptions and open questions visible.
- Do not require GitHub Projects or role gates.

### Tier 1 - Low-Risk Code

Examples:

- UI prototype
- local dev tooling
- simple validation
- non-financial CRUD

Process:

- Brief implementation plan.
- Code plus focused tests.
- Update docs only when future AI or humans need the context.

### Tier 2 - Product Feature

Examples:

- user-facing workflow
- persistence-backed behavior
- authz-sensitive behavior
- frontend/backend contract changes

Process:

- Use `/product-owner` if the user story is unclear.
- Write or update a use case once behavior is stable enough.
- Define acceptance criteria and test coverage.
- Use `/architect` if module boundaries or data ownership are unclear.
- Use `/review` before merge.

### Tier 3 - High-Risk Domain Work

Examples:

- payments
- ledger
- escrow, settlement, refunds
- outbox/messaging
- idempotency and replay handling
- concurrency-sensitive order state transitions

Process:

Use the strict role sequence:

`/product-owner -> /risk-review -> /architect -> /implement -> /qa -> /review`

Required outputs:

- acceptance criteria
- invariants
- transaction boundaries
- event strategy
- idempotency/concurrency plan
- destructive test matrix
- docs/catalog updates when events or modules change

## GitHub Projects

GitHub Issues and Projects are useful once work is implementation-ready. They are optional during product discovery.

Use them for:

- scoped features
- bugs
- PR traceability
- release coordination

Avoid using them as the only durable home for product decisions. Product decisions belong in repo docs.

## Checklists

### Before Coding

- [ ] Problem and user outcome are clear enough.
- [ ] Scope fits one vertical slice.
- [ ] Risk tier is identified.
- [ ] Acceptance criteria are known or explicitly deferred for discovery.
- [ ] Architecture boundaries are clear enough to avoid guessing.

### Before Merge

- [ ] Tests match the risk and blast radius.
- [ ] Frontend/backend contract impact is reviewed.
- [ ] Financial/event/concurrency risks are handled or marked not applicable.
- [ ] Relevant docs are updated.
- [ ] `CHANGELOG.md` is updated for user-visible or architecture-relevant changes.

### After Merge

- [ ] `docs/PROJECT_STATE.md` updated if current focus, risks, or milestone changed.
- [ ] Worklog added only for significant changes, complex debugging, or decisions worth preserving.
- [ ] GitHub issue/project closed or updated if one exists.
