# Engineering Handbook

This document defines how we build, change, and evolve this system.

It is authoritative for:

- Architecture
- Boundaries
- Frontend quality
- Feature workflow
- Documentation standards
- Testing expectations
- Event discipline
- Financial safety rules

All contributors (human or AI) must follow this handbook.

---

# 1. System Overview

This repository is a PNPM monorepo containing:

- apps/backend → Modular monolith (DDD + Clean Architecture + CQRS)
- apps/web → intended Next.js frontend; currently placeholder package
- packages/\* → Shared libraries

Architecture is documented in:

- docs/architecture/REPO_MAP.md
- docs/architecture/backend/REPO_MAP.md
- docs/architecture/web/REPO_MAP.md

Product intent is documented in:

- docs/AI_OPERATING_MODEL.md
- docs/product/discovery.md
- docs/product/vision.md
- docs/product/non-functional-requirements.md

---

# 2. Core Architectural Principles

## 2.1 Domain First

Business rules are the primary concern.

Infrastructure exists to serve the domain — never the opposite.

---

## 2.2 Modular Monolith

The backend is structured as bounded contexts:

apps/backend/src/modules/<module>/

Each module contains:

- domain/
- application/
- infrastructure/
- presentation/

Modules must not import each other’s infrastructure or presentation layers.

---

## 2.3 Clean Architecture

Dependency direction:

- domain → nothing
- application → domain + core-contracts
- infrastructure → application + domain + core-runtime
- presentation → application

Violations are not allowed.

---

## 2.4 CQRS

- Commands change state.
- Queries read state.
- They must remain separate.

---

## 2.5 Event Discipline

### Domain Events

- Internal only.
- Raised inside aggregates.
- Handled synchronously within the same database transaction.

### Integration Events

- Cross-module or external.
- Must use outbox pattern.
- Must be versioned.
- Must be registered in EVENT_CATALOG.md.

---

## 2.6 Frontend Architecture

The frontend is a first-class product surface, not a thin backend demo.

Authoritative frontend rules live in:

docs/architecture/web/REPO_MAP.md

Principles:

- Build route-driven product workflows for buyer, seller, and operator use cases.
- Use Next.js App Router once `apps/web` is initialized.
- Use Server Components by default and Client Components only for interactivity.
- Keep backend communication behind the web data/API layer.
- Use `packages/api-contracts` for shared request/response schemas and types.
- Keep reusable UI primitives free of business logic.
- Treat loading, empty, error, unauthorized, and success states as part of every meaningful feature.
- Treat accessibility as required engineering quality.
- Do not duplicate backend business rules in the frontend; frontend validation improves UX, backend validation remains authoritative.

---

# 3. Feature Development Process

Use the risk-based workflow in:

docs/product/development-workflow.md

Minimum expectations for implementation-ready product work:

- Problem and user outcome clear
- Risk tier identified
- Use-case written when behavior is stable enough
- Backend module and frontend feature ownership defined when applicable
- Invariants defined
- Command/query defined
- Route, user states, and API contract defined for frontend work
- Event strategy defined
- Tests written
- Docs updated where future work needs the context

No significant product code begins before the use case is clear enough to avoid guessing. Throwaway prototypes should be labeled as such.

---

# 4. Financial Safety Rules

Because this system handles financial flows:

- No double charging.
- No inconsistent order states.
- No unversioned integration events.
- No publishing events outside outbox.
- No domain logic inside infrastructure.

Idempotency must be considered for all external callbacks.

---

# 5. Documentation Standards

Documentation lives in:

docs/

Categories:

- product/
- architecture/
- decisions/
- diagrams/
- ops/ (AI memory and automation governance)

Rules:

- No undocumented architectural changes.
- ADR required for major decisions.
- Keep project memory bounded and current:
  - `docs/PROJECT_STATE.md` as top-level summary
  - `docs/product/discovery.md` for product thinking before use cases
  - `docs/ops/worklog/*` for significant changes or hard-to-reconstruct context
  - `docs/ops/summaries/*` only when compression is useful
- Module README must describe:
  - Responsibilities
  - Commands
  - Events
  - Invariants

Documentation is part of the feature.

---

# 6. Testing Philosophy

We follow a strict test pyramid.

## Unit Tests

- Domain invariants and behavior.
- Value objects and policies.
- Application handlers with mocked ports.

## Handler Integration Tests

- CQRS handlers against a real database (Testcontainers).
- Transaction behavior verification.

## API Tests

- Fastify request injection.
- Full request/response validation.
- Middleware and auth behavior.

## Workflow Tests

- Event-driven flows.
- Outbox publishing.
- Async background processing.

## Frontend Tests

- Component tests for reusable UI and feature states.
- Integration tests for page/feature flows with network mocked at the API boundary.
- E2E tests for critical buyer/seller/operator workflows once the app is runnable.
- Accessibility checks for forms, dialogs, navigation, and error states.

Tests are mandatory for behavior changes.

> **Note:** For detailed taxonomy, naming conventions (`*.unit.spec.ts`, etc.), mocking policy, and CI execution plan, see `TESTING_STRATEGY.md`.

---

# 7. Observability Standards

All critical flows must include:

- Structured logging
- Correlation ID
- Meaningful error messages

Financial operations require extra logging discipline.

Sensitive data must never be logged.

---

# 8. Cross-Cutting Packages

## core-domain

- Domain primitives only.
- No IO.

## core-contracts

- Interfaces only.
- No implementations.

## core-runtime

- Shared infrastructure helpers.
- Must remain generic.

## decorators

- Thin wrappers only.
- Never contain business logic.
- Never used in domain layer.

## Dependency Injection

- Constructor injection only.
- Composition root wires all dependencies.
- No magic DI containers.

---

# 9. Architectural Change Policy

Requires ADR:

- New architectural pattern
- Changing event strategy
- Changing transaction strategy
- Introducing new cross-cutting mechanism
- Breaking contract changes

Small refactors do not require ADR.

---

# 10. AI Usage Policy

AI tools are allowed but must:

- Respect architecture maps
- Follow layer boundaries
- Avoid introducing cross-module coupling
- Prefer minimal diffs
- Never guess module placement if unclear

If uncertain → ask.

---

# 11. Anti-Patterns (Forbidden)

- Domain importing infrastructure
- Cross-module infrastructure imports
- Business logic inside decorators
- Publishing integration events directly
- Starting implementation from controllers
- Skipping use-case documentation
- Adding shared code prematurely

---

# 12. Definition of Engineering Excellence

The system must be:

- Correct
- Predictable
- Evolvable
- Testable
- Observable
- Well-documented

We prioritize:

Clarity > Cleverness  
Correctness > Speed  
Boundaries > Convenience  
Evolution > Premature Distribution

---

# 13. When in Doubt

If unsure:

- Review REPO_MAP
- Review module README
- Review EVENT_CATALOG
- Review this handbook

If still unclear:

Stop and ask.
