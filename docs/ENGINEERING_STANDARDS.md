# Engineering Standards

The authoritative rules for how this system is built, changed, and kept safe. Applies to every contributor, human or AI.

- For **how to work** (the loop, when to slow down, roles, memory), see `AGENTS.md`.
- If any guidance anywhere conflicts with this file, **this file wins** on architecture and safety.
- Machine-readable structural rules: `docs/architecture/manifest.json`.

---

## 1. System Invariants (Non-Negotiable)

These override feature speed. No exceptions.

1. **No double charging** — payment operations must be idempotent.
2. **No ledger corruption** — double-entry accounting must always balance; no silent money creation or deletion.
3. **No lost integration events** — all integration events persisted via the transactional outbox.
4. **No inconsistent order states** — state transitions must be explicit.
5. **Invariants enforced inside aggregates** — domain logic never in controllers or infrastructure.
6. **Integration event consumers must be idempotent** — duplicate delivery must be tolerated.
7. **Event replays must not corrupt state.**
8. **Concurrency-safe aggregates** — protect invariants under concurrent access (optimistic locking or transactional boundaries).

When uncertain about financial safety, ledger correctness, distributed event behavior, or idempotency: **choose the conservative option and flag it.**

---

## 2. Architecture

The product is a pnpm monorepo: an `apps/` layer (backend service + web app) over shared `packages/*`. Authoritative maps:

- `docs/architecture/REPO_MAP.md`
- `docs/architecture/backend/REPO_MAP.md`
- `docs/architecture/web/REPO_MAP.md`

### 2.1 Domain first

Business rules are the primary concern. Infrastructure serves the domain, never the reverse.

### 2.2 Modular monolith

The backend is organized into bounded contexts: `apps/backend/src/modules/<module>/`, each with `domain/`, `application/`, `infrastructure/`, `presentation/`. Modules must not import each other's `infrastructure` or `presentation`.

### 2.3 Clean Architecture — layers & dependency direction

- **Domain** — business logic, invariants, aggregates. No IO, no framework imports.
- **Application** — use-case orchestration. No IO, no infrastructure imports.
- **Infrastructure** — implements ports (repos, cache, messaging). May perform IO.
- **Presentation** — HTTP routes/controllers. Calls the application layer only.

```
domain         → (nothing)
application    → domain + core-contracts (+ core-domain where needed)
infrastructure → application + domain + core-contracts + core-runtime
presentation   → application (+ shared/presentation helpers)
```

Forbidden: domain→infrastructure/presentation; application→infrastructure/presentation; presentation→infrastructure; module A→module B's infrastructure/presentation.

### 2.4 CQRS

Commands change state; queries read state. Keep them separate.

### 2.5 Event discipline

- **Domain events** — internal only, raised inside aggregates, handled synchronously within the same transaction.
- **Integration events** — cross-module or external. Must use the outbox, must be versioned (e.g. `OrderPlaced.v1`), and must be registered in `docs/architecture/backend/EVENT_CATALOG.md`.

### 2.6 Frontend rules

The web app is a first-class product surface, not a thin backend demo. Authoritative rules: `docs/architecture/web/REPO_MAP.md`.

- `apps/web` must not import from `apps/backend`; backend communication goes through the web data/API layer.
- Shared request/response contracts come from `packages/api-contracts`.
- Use Server Components by default once Next.js is initialized; Client Components only for interaction, browser APIs, optimistic UI, or local UI state.
- Every meaningful feature handles loading, empty, validation-error, recoverable-error, unauthorized/forbidden, and success states where applicable.
- Accessibility is required: semantic HTML, labels, keyboard access, focus states, meaningful errors.
- Don't duplicate backend business rules in the frontend; frontend validation improves UX, backend validation stays authoritative.
- Build against the design reference in `docs/design/` when one exists (see the "Design" section of `AGENTS.md`).

### 2.7 Cross-cutting packages

- **core-domain** — domain primitives only, no IO.
- **core-contracts** — interfaces only, no implementations.
- **core-runtime** — shared infrastructure helpers, must stay generic.
- **decorators** — thin wrappers only; never business logic; never used in the domain layer.

**Dependency injection:** constructor injection only; a composition root wires dependencies; no magic DI containers.

---

## 3. Change control

- Do not redesign architecture, introduce new patterns, or refactor unrelated modules unless explicitly asked.
- Do not expand scope beyond the requested feature; keep MVP scope tight.
- Default to the lightweight loop in `AGENTS.md`; escalate to the full role sequence only for high-risk domain work or when asked.

**When an architecture change is needed:** stop, flag it with rationale, await explicit approval, then record it as an ADR (`docs/decisions/ADR-XXX-<Title>.md`).

An ADR is required for: a new architectural pattern, a change to the event or transaction strategy, a new cross-cutting mechanism, or a breaking contract change. Small refactors do not require an ADR.

---

## 4. Code quality & anti-patterns

- Follow existing naming conventions (domain language) and respect module boundaries.
- Prefer minimal diffs. Never guess module placement — if unclear, ask.
- Mark unknowns explicitly rather than inventing modules, APIs, tables, events, or files.

**Forbidden:**

- Domain importing infrastructure; cross-module infrastructure imports.
- Business logic inside decorators.
- Publishing integration events directly (bypassing the outbox).
- Starting implementation from controllers.
- Skipping use-case documentation for product work (exception: Level 1 improvements, gated by backlog acceptance criteria — see `docs/product/product-operating-model.md`).
- Adding shared code prematurely.

---

## 5. Testing expectations

Follow the test pyramid. Tests are mandatory for behavior changes.

- **Unit** — domain invariants/behavior, value objects, policies, application handlers with mocked ports.
- **Handler integration** — CQRS handlers against a real database (Testcontainers); verify transaction behavior; assert outbox rows when events are involved.
- **API** — Fastify request injection, full request/response validation, middleware/auth behavior.
- **Workflow** — event-driven flows, outbox publishing, async processing.
- **Frontend** — component tests for reusable UI and feature states; integration tests for page/feature flows (network mocked at the API boundary); E2E for critical buyer/seller/operator workflows once runnable; accessibility checks for forms, dialogs, navigation, and error states.

Detailed taxonomy, naming conventions (`*.unit.spec.ts`, `*.usecase.int.spec.ts`, …), mocking policy, and CI plan: `TESTING_STRATEGY.md`.

---

## 6. Observability

All critical flows include structured logging, a correlation ID, and meaningful error messages. Financial operations require extra logging discipline. Sensitive data must never be logged. No silent failure paths.

---

## 7. Documentation standards

Documentation is part of the feature.

- No undocumented architectural changes; ADR for major decisions.
- When adding/changing integration events → update `EVENT_CATALOG.md` and the producer/consumer module README `Publishes`/`Consumes` sections.
- When adding a module → update `MODULE_CATALOG.md`.
- Module READMEs describe responsibilities, commands, events, and invariants.
- Keep project memory bounded — see the memory model in `AGENTS.md`.

---

## 8. Context discipline

Use bounded context reads, in the order defined in `AGENTS.md`: `product/roadmap.md` → `AGENTS.md` → this file (for code) → task-relevant canonical docs only.

---

## 9. GitHub

Agents work with plain issues. A GitHub Project board exists for human/stakeholder tracking but is **not** agent-managed. Use issues when tracking or stakeholder visibility is genuinely useful; durable decisions live in repo docs, not issue comments.

**Allowed:** create/update issues; update labels/assignees/milestones; comment on issues/PRs; post review findings; close duplicates with a canonical link; close completed issues once merge and relevant memory updates are done; prepare release drafts.

**Disallowed:** merge PRs; delete branches; publish tags/releases without explicit human approval; change repository settings or security policies.

For issue/backlog work, normalize against `.github/ISSUE_TEMPLATE/` before stage progression, dedupe semantically similar issues to one canonical issue, and require a concise summary plus context links before marking work implementation-ready.

---

## 10. When in doubt

Review the relevant REPO_MAP, the module README, `EVENT_CATALOG.md`, and this file. If still unclear, **stop and ask.**

Priorities: Clarity > Cleverness · Correctness > Speed · Boundaries > Convenience · Evolution > Premature distribution.
