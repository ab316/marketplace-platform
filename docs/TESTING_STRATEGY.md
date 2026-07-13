# Testing Strategy

This document defines the official test-selection policy, taxonomy, scope boundaries, mocking rules, and CI execution plan for the platform.

## 1) Principles

The platform follows an **interface-first test portfolio**:

> Test behavior through the broadest stable interface that provides clear, deterministic evidence. Test critical invariants directly when a broader interface cannot prove them adequately.

Goals:

- Prove behavior through stable, externally meaningful interfaces.
- Prefer confidence and refactor resistance over raw test speed.
- Exercise real repository-owned code and infrastructure where practical.
- Use focused direct tests for domain invariants and infrastructure guarantees.
- Avoid proving the same behavior redundantly at every layer.
- Keep tests deterministic, isolated, and reproducible locally and in CI.

Execution speed is a constraint, not the primary test-selection rule. A slower API test is preferable to a fast, brittle test coupled to handler orchestration. A narrow domain or infrastructure test is preferable when it proves an invariant more clearly than a broad test can.

### 1.1 Test-selection order

Choose the primary test for a behavior in this order:

1. For backend behavior exposed over HTTP, default to an API integration test through the public HTTP contract.
2. For asynchronous behavior, test through public message contracts and observable workflow outcomes.
3. For a critical product journey, use a small number of system end-to-end tests.
4. Test domain behavior directly when covering invariants, state machines, policies, or a large input space.
5. Test infrastructure directly for migrations, constraints, transactions, locking, concurrency, and outbox mechanics.
6. Test the application layer directly only when an operation has no suitable public interface or that boundary gives uniquely clearer evidence.

Each acceptance criterion should have one primary owning test. Do not automatically repeat the same happy path in domain, application-layer, API, workflow, and system E2E suites.

### 1.2 What “end-to-end” means

An end-to-end (E2E) test enters through a public product boundary and exercises the complete runnable system to an observable business outcome.

- Browser + real web app + real backend + owned infrastructure = **system E2E**.
- Frontend + simulated HTTP backend = **frontend feature integration**, not E2E.
- In-process backend + database/broker = **backend workflow integration**, not E2E.
- A deployed public API may have qualified **API E2E** tests if the API becomes an independent product surface.

Use bare `E2E` only for system-level tests.

---

## 2) Backend Test Taxonomy

### 2.1 Domain tests

**What they prove**

- Aggregate behavior and invariants.
- Value objects and domain policies.
- Explicit state transitions.
- Pure transformations and calculations.
- Financial rules across representative or generated input spaces.

**Rules**

- Test through the domain object's public behavior, not private methods or incidental call order.
- Prefer real deterministic collaborators over mocks.
- Use table-driven or property-based tests when they provide stronger invariant coverage.
- Keep domain tests free of network, filesystem, database, and framework dependencies.
- Control time and identifiers through injected deterministic sources when relevant.

**Tooling**

- Mocha, Chai
- fast-check where property-based testing is valuable

**Execution**

- PR: required when domain behavior changes
- Nightly: full suite
- Post-deploy: not applicable

### 2.2 API integration tests

API integration tests are the default backend behavior tests for HTTP-exposed capabilities.

**What they prove**

- Routing and request/response contracts.
- Authentication, authorization, and tenant isolation.
- Validation, serialization, headers, and stable error envelopes.
- Real application wiring through handlers, repositories, transactions, migrations, and Postgres.
- Idempotency and observable business outcomes.

**Real vs substituted**

- Real: Fastify application composition, middleware, schemas, application layer, repositories, transactions, migrations, and Postgres.
- Substitute only external systems such as payment providers, bank rails, email/SMS, and third-party APIs.
- Prefer deterministic fakes or simulators over interaction-heavy mocks.

**Assertions**

- Assert status, headers, response contract, authorization outcome, and stable error shape.
- Prefer observing side effects through a subsequent read endpoint or a public event.
- Inspect database or outbox representation only when proving a specific infrastructure guarantee that has no stable public observation point.
- Do not assert repository calls, handler call order, or internal entity shape.

**Expected scenario coverage**

- Success.
- Invalid input.
- Unauthenticated, unauthorized, and cross-tenant access.
- Missing resources and invalid state transitions.
- Conflicts, repeated requests, and idempotency where applicable.
- Stable response and error contracts.

**Tooling**

- Fastify request injection
- Mocha, Chai
- Postgres through Testcontainers or the repository test service
- Migrations applied in test setup

**Execution**

- PR: required for affected HTTP behavior; this is not merely a small smoke subset
- Nightly: full suite
- Post-deploy: covered by smoke/system E2E rather than in-process API tests

### 2.3 Backend workflow integration tests

**What they prove**

- Multi-step workflows across backend modules or asynchronous boundaries.
- HTTP command → outbox → broker → consumer → observable result.
- Retries, duplicate delivery, replay, and recovery behavior.
- Cross-module money flows such as order → payment authorization → ledger posting → settlement/refund.

**Real vs substituted**

- Prefer real application composition, Postgres, migrations, and broker.
- External providers use deterministic fakes, simulators, or sandboxes.
- A faithful broker harness is acceptable for focused PR feedback when the real-broker suite also exists.

**Rules**

- Enter through public HTTP or message interfaces when possible.
- Assert observable business outcomes across steps.
- Keep the suite focused on workflows whose risk or coordination cannot be proven by one API scenario.
- These tests are not called E2E because they stop at the backend boundary.

**Execution**

- PR: focused high-risk workflows
- Nightly: full suite, including slower retry/replay cases
- Post-deploy: system E2E or smoke owns deployed verification

### 2.4 Application-layer integration tests

Application-layer integration tests invoke a backend command, query, handler, or application service directly with real infrastructure. They are an exception layer, not mandatory parallel coverage for every API scenario.

This term is deliberately distinct from a **product use case** under `docs/product/use-cases/`. A product use case specifies user and business behavior and may span the UI, multiple application operations, persistence, and events. An application-layer test covers one executable backend operation.

**Use one when**

- The application operation is internal, scheduled, or otherwise not exposed over HTTP.
- API setup would obscure the behavior under test.
- Transaction rollback needs direct proof.
- Atomic state-plus-outbox persistence needs direct proof.
- Precise failure injection is impractical through the API.

**Real vs substituted**

- Real: Postgres, migrations, repositories, transactions, and outbox persistence.
- Substitute external providers only.

**Rules**

- Assert the returned result and the guarantee that justified the direct test.
- Direct database or outbox assertions are appropriate when atomic persistence is the subject.
- Do not duplicate an API-covered scenario without a specific reason.

**Execution**

- PR/nightly: when selected by the behavior and risk; not required as a blanket suite per handler
- Post-deploy: not applicable

### 2.5 Contract tests (HTTP and events)

**What they prove**

- Compatibility between HTTP producers and consumers.
- Integration-event schemas, names, versions, and compatibility.
- Shared contracts remain usable by the web app and other consumers.

**Tooling**

- Shared schemas from `packages/api-contracts`
- Lightweight schema compatibility tests; adopt Pact only if consumer-driven contracts justify it
- JSON Schema, TypeBox, or Zod for event schemas as selected by the implementation

**Rules**

- Breaking HTTP or event changes require the applicable versioning and migration policy.
- Integration-event names remain versioned, for example `OrderPlaced.v1`.

**Execution**

- PR: required when a contract changes
- Nightly: full suite
- Post-deploy: not applicable

### 2.6 Persistence and migration tests

**What they prove**

- Empty database → latest migrations.
- Last supported release → latest migrations when a baseline exists.
- Constraints, indexes, foreign keys, and unique keys.
- Transaction atomicity, locking, and concurrency guarantees.

**Rules**

- Use real Postgres only.
- Test a persistence detail directly when that detail is the safety mechanism.
- Money and idempotency constraints require destructive tests appropriate to their risk.

**Execution**

- PR: empty → latest and affected focused guarantees
- Nightly: upgrade paths and slower concurrency cases
- Post-deploy: migration verification belongs to deployment checks

### 2.7 Messaging integration tests

**What they prove**

- The outbox processor publishes persisted messages.
- Consumers produce the expected observable outcome.
- Duplicate delivery, retry/backoff, poison handling, and replay are safe.
- Message contracts and correlation metadata are preserved.

**Rules**

- Use real Postgres.
- Prefer a real broker for broker semantics and failure behavior.
- Assert public messages and consumer-visible outcomes; inspect outbox rows when proving atomic persistence or publisher mechanics.

**Execution**

- PR: minimal publish/consume/deduplication guarantees
- Nightly: real-broker failure, retry, poison, and replay suite
- Post-deploy: health/synthetic checks only

### 2.8 Non-functional suites

Includes:

- Performance and latency baselines.
- Load and soak testing.
- Resilience under dependency failure, timeout, and retry.
- Security testing, including the authorization matrix and dependency scanning.
- Observability assertions for required trace, metric, and log fields.

Execution:

- PR: quick security and focused performance checks where useful
- Nightly: broader performance, resilience, and security suites
- Post-deploy: selective checks against staging

---

## 3) Frontend Test Taxonomy

Frontend tests prove user-visible behavior and feature states, not component internals.

### 3.1 Frontend unit tests

Use for:

- Pure formatting and mapping helpers.
- Form-schema behavior.
- Deterministic view-model transformations.
- Complex pure logic that is clearer outside a rendered feature test.

Rules:

- No real network or backend imports.
- Use real schemas from `packages/api-contracts`.
- Do not isolate simple hooks or helpers merely to increase coverage.

### 3.2 Component tests

Use for:

- Reusable UI primitives.
- Feature components with meaningful loading, empty, validation-error, recoverable-error, unauthorized/forbidden, and success states.
- Accessibility behavior for forms, dialogs, navigation, and interaction.

Rules:

- Query by accessible name and test user interactions.
- Avoid snapshot-only assertions.
- Avoid mocking child components owned by the repository.

Tooling:

- Vitest
- React Testing Library and `user-event`
- `jest-axe` or equivalent where useful

### 3.3 Frontend feature/page integration tests

**What they prove**

- A complete frontend feature flow with the backend simulated at the HTTP boundary.
- Route composition, forms, navigation, validation feedback, and API error handling.

**Rules**

- Simulate HTTP with MSW or equivalent; do not mock shared contracts.
- Assert meaningful request shapes for mutations and user-visible outcomes after responses.
- These tests are not E2E because the real backend is not running.

**Execution**

- PR: required for affected feature behavior
- Nightly: full suite
- Post-deploy: not applicable

### 3.4 Visual and accessibility regression

Use for:

- Layout regressions on core pages.
- Keyboard and screen-reader basics for important workflows.
- Responsive behavior at primary breakpoints.

Tooling may include Playwright screenshots or a hosted visual-regression service if adopted. Automated checks supplement, but do not replace, targeted manual keyboard and assistive-technology review for complex interactions. A new mandatory hosted visual-regression mechanism requires the normal architecture decision process.

---

## 4) System Tests

### 4.1 System E2E tests

**What they prove**

- Critical buyer, seller, and operator journeys through the complete runnable product.
- Browser routing, authentication, web/backend integration, persistence, and major cross-system regressions.

**Real vs substituted**

- Real: browser, web app, backend, Postgres, and owned infrastructure required by the workflow.
- External providers may use controlled simulators or sandboxes.

**Rules**

- Enter through the browser unless a deployed public API is itself the product boundary.
- Assert user-visible business outcomes, not internal database state.
- Keep the suite small and focused on critical journeys.

**Tooling and execution**

- Playwright
- PR: optional small smoke set once stable enough
- Nightly: critical workflows against a representative environment
- Post-deploy: one or two safe critical workflows

### 4.2 Post-deploy smoke tests

Smoke tests prove that a deployment is alive and minimally functional:

- Health endpoints.
- Database and broker connectivity.
- One safe read/write path where appropriate.
- Basic observability signal presence.

Post-deploy smoke is required. It is deliberately narrower than system E2E.

---

## 5) Mocking and Substitution Policy

Classify dependencies by ownership and purpose:

- **Repository-owned code:** real by default. Do not mock handlers, repositories, child components, or schemas merely to isolate a class.
- **Postgres, migrations, and transactions:** real in integration tests.
- **Broker:** real when broker semantics or failure behavior matters; a faithful harness may support focused feedback.
- **External systems:** deterministic fake, simulator, sandbox, or protocol-level stub.
- **Time and IDs:** controlled injected implementations.
- **Frontend network:** MSW or equivalent in feature integration tests.
- **Mocks and spies:** use only when the interaction itself is contractual or for otherwise impractical failure injection.

Avoid assertions about incidental call order, private methods, repository method selection, or internal object shape. Prefer state-based fakes over behavior-heavy mocks.

---

## 6) Assertion Boundaries

- **Domain:** returned behavior, state transitions, domain errors, and invariants.
- **API:** status, headers, response/error contract, authorization, and externally observable outcomes.
- **Backend workflow:** observable state across steps, public messages, idempotency, and recovery.
- **Application layer:** returned result plus the transaction/outbox guarantee that justified the direct test.
- **Messaging:** published contract and consumer-visible outcome; internal rows only for outbox mechanics.
- **Persistence:** constraints, atomicity, locking, migrations, and concurrency results.
- **Frontend:** accessible content, interaction, navigation, and visible outcomes.
- **System E2E:** user-visible business outcome only.

A direct database assertion is appropriate when database behavior is the subject. It is usually an implementation detail when a general API behavior can be observed through a public read interface.

---

## 7) Test Data and Determinism

### 7.1 Determinism

- Do not depend on wall-clock time; inject a clock and use fixed timestamps.
- Do not use unseeded randomness; prefer deterministic IDs or seeded generators.
- Do not depend on test ordering.
- Each test owns the state it creates.

### 7.2 Database isolation

- Prefer one Postgres container or repository test service per test run.
- Apply migrations at suite start.
- Use transaction rollback or truncate-between-test where compatible with the behavior.
- Use schema/database-per-worker when parallelism or concurrency cases require stronger isolation.
- Do not wrap a test in a transaction when doing so would hide the production transaction boundary under examination.

### 7.3 Fixtures

- Prefer small scenario factories over static SQL dumps.
- Create only the data the scenario needs.
- Express fixtures in domain language and avoid leaking persistence representation into general behavior tests.

---

## 8) Behavioral Coverage Policy

- Every acceptance criterion has a primary owning test.
- Every critical domain invariant has direct coverage.
- Every public endpoint has risk-appropriate validation, authorization, tenant-isolation, and error coverage.
- Money and event workflows cover retries, duplicates, replay, rollback, and concurrency.
- Critical user journeys have a small number of system E2E tests.
- Code coverage is diagnostic; it is not a completion target and must not drive low-value tests.
- Refactoring without behavior changes should rarely require changes to interface-level tests.

Examples:

- Prefer creating an order through HTTP, retrieving it through HTTP, and asserting its visible state.
- Avoid invoking a handler and verifying that a repository received a particular internal entity.
- Test directly in the domain that unbalanced ledger postings are always rejected.
- Test directly in persistence that concurrent operations cannot bypass the selected locking or uniqueness guarantee.
- Test a backend workflow by repeating a payment request and observing one authorization and one resulting state transition.
- A page rendered against MSW is a frontend integration test; publishing and purchasing a listing through the real browser-to-database system is E2E.

---

## 9) Environments and CI

### 9.1 Pull requests

Run the relevant high-signal portfolio:

- Lint and typecheck.
- Affected domain tests.
- Affected API integration tests.
- Focused backend workflow tests.
- Migration checks and affected persistence guarantees.
- Changed HTTP/event contract tests.
- Minimal messaging publish/consume/deduplication guarantees.
- Frontend unit, component, and feature integration tests.
- An optional very small system E2E smoke set once stable.

Do not relegate API tests to nightly solely because they are slower than unit tests. Improve shared setup, isolation, and parallel execution first.

### 9.2 Nightly

- Full API integration suite.
- Full backend workflow suite.
- Real-broker messaging failure and replay scenarios.
- Concurrency and destructive money tests.
- Full system E2E suite.
- Performance, resilience, security, and longer migration checks.

### 9.3 Post-deploy

- Required smoke tests.
- One or two safe critical system workflows.
- Basic observability verification.

Place a test based on measured duration, flakiness, value, and risk—not taxonomy alone. Flaky tests are defects: quarantine immediately when necessary, preserve visibility, and prioritize repair.

---

## 10) Folder and Naming Conventions

Backend:

- `apps/backend/test/unit/**` — `*.unit.spec.ts` for domain and other pure behavior
- `apps/backend/test/integration/api/**` — `*.api.int.spec.ts`
- `apps/backend/test/integration/workflows/**` — `*.workflow.int.spec.ts`
- `apps/backend/test/integration/application/**` — `*.application.int.spec.ts`
- `apps/backend/test/integration/messaging/**` — `*.messaging.int.spec.ts`
- `apps/backend/test/integration/persistence/**` — `*.persistence.int.spec.ts`
- `apps/backend/test/contract/**` — `*.contract.spec.ts`

Frontend:

- `apps/web/test/unit/**` — `*.unit.spec.ts`
- `apps/web/test/component/**` — `*.component.spec.tsx`
- `apps/web/test/integration/**` — `*.feature.int.spec.tsx`

System:

- `test/e2e/**` — `*.e2e.spec.ts`

The existing backend `test/unit` name is retained to avoid churn. Its primary purpose is stable domain and pure behavior, not implementation isolation.

---

## 11) Test Review Checklist

For each proposed test, ask:

- What stable interface does it exercise?
- Does it describe behavior or internal orchestration?
- Would a safe internal refactor break it?
- Are repository-owned components being substituted unnecessarily?
- Is the behavior already proven at another layer?
- Can the outcome be observed through a public interface?
- If it inspects the database or outbox, what guarantee requires that?
- Can this layer prove the relevant money, concurrency, or messaging invariant?
- Is the test deterministic and isolated?
- Is its CI placement proportional to measured cost and risk?
