# Testing Strategy

This document defines the official test taxonomy, scope boundaries, and CI execution plan for the platform.

Goals:

- Catch defects at the lowest cost level (fast feedback).
- Prove correctness for transactional + event-driven workflows (no duplicates, no missing events).
- Keep tests deterministic and reproducible (local + CI).
- Make PR checks fast, and push heavy coverage to nightly and post-deploy smoke.

---

## 1) Official Test Taxonomy (Backend)

### 1.1 Unit tests

**What it tests**

- Pure logic in isolation: domain policies, value objects, pure functions, mapping, validation helpers.

**Real vs mocked**

- Mock everything outside the unit (DB, network, time, broker).

**Tooling**

- Test runner: Mocha
- Assertions: Chai
- Mocks/spies: Sinon
- Property-based (optional): fast-check

**Where it runs**

- PR: ✅ required
- Nightly: ✅
- Post-deploy: ❌

**Fast rules**

- No network.
- No filesystem unless explicitly part of the unit.
- Deterministic time (fake timers).

---

### 1.2 Use-case integration tests (aka Handler integration tests)

**What it tests**

- A single command/query handler (use-case) wired with real infrastructure that matters:
  - real DB
  - real repositories
  - real transactions
  - real outbox writes
- External providers are mocked/faked at the boundary.

**Real vs mocked**

- Real: Postgres + migrations + repositories + transaction boundaries
- Mock: payment provider, email/SMS, external HTTP APIs
- Optional: in-memory “clock” but stable time source

**Tooling**

- Test runner: Mocha / Chai / Sinon
- DB: Postgres test container (Testcontainers) or docker-compose service
- Migrations: node-pg-migrate (run in test setup)

**Where it runs**

- PR: ✅ required (target: small but high-value set)
- Nightly: ✅ expanded set
- Post-deploy: ❌

**Design rules**

- One test = one use-case scenario.
- Assert on:
  - DB state
  - returned result
  - outbox rows written (type + payload + metadata)
  - idempotency behavior (same command twice)

---

### 1.3 API tests

**What it tests**

- Service-level HTTP behavior end-to-end inside the service:
  - routing
  - auth (as configured)
  - validation
  - serialization
  - error shapes
  - real DB writes + outbox

**Real vs mocked**

- Real: HTTP server + DB + migrations
- Mock: external providers

**Tooling**

- HTTP client: supertest or undici
- Test runner: Mocha / Chai / Sinon
- DB: Postgres test container / docker-compose

**Where it runs**

- PR: ✅ required (smaller set)
- Nightly: ✅ larger set
- Post-deploy: ❌ (smoke covers minimal endpoints)

**Contract rule**

- API tests should also verify stable error envelopes and versioning headers (if used).

---

### 1.4 Contract tests (HTTP + Events)

**What it tests**

- Compatibility between producers and consumers:
  - HTTP consumer-driven contracts (frontend/other services)
  - Event/message schema contracts (integration events)

**Real vs mocked**

- Usually no real DB required (depends on approach).
- These tests are about schema, versions, and compatibility.

**Tooling**

- HTTP CDC: Pact (or lightweight schema snapshot tests)
- Event schema: JSON Schema / TypeBox / Zod schemas + compatibility checks
- Versioning: assert `eventName@vN` semantics, or explicit version field

**Where it runs**

- PR: ✅ required for changed contracts
- Nightly: ✅
- Post-deploy: ❌

**Rule**

- Breaking changes require version bump + parallel support period.

---

### 1.5 Persistence & migration tests

**What it tests**

- Migrations apply cleanly:
  - empty DB → latest
  - last release tag → latest (optional but ideal)
- Constraints, indexes, unique keys (idempotency), FK relationships.

**Real vs mocked**

- Real DB only.

**Tooling**

- node-pg-migrate
- Testcontainers / docker-compose Postgres

**Where it runs**

- PR: ✅ required (at least “empty → latest”)
- Nightly: ✅ (include upgrade-path if you keep tagged baselines)
- Post-deploy: ❌

---

### 1.6 Outbox & messaging tests

**What it tests**

- The async boundary:
  - outbox processor reads rows and publishes
  - consumer handlers process messages correctly
  - retries/backoff and poison handling
  - deduplication / idempotency on consumers

**Real vs mocked**

- Real DB strongly recommended.
- Broker: either real (NATS/Rabbit/etc) in test container OR a very faithful test harness.
- External providers mocked.

**Tooling**

- Broker test container (preferred)
- Deterministic retry/backoff configuration in tests

**Where it runs**

- PR: ✅ minimal “happy path + dedupe”
- Nightly: ✅ expanded (retries, poison, broker down simulation)
- Post-deploy: ❌ (smoke checks health only)

---

### 1.7 End-to-end workflow tests (multi-step)

**What it tests**

- Cross-module or cross-service workflows:
  - order → payment auth → ledger postings → settlement/refund
- Validates orchestration + invariants across boundaries.

**Real vs mocked**

- Prefer real DB + real broker.
- External providers mocked.
- If multi-service: run 2–3 services in docker-compose for test.

**Tooling**

- docker-compose / test environment harness
- Minimal fixtures and deterministic clocks

**Where it runs**

- PR: ❌ (too slow)
- Nightly: ✅ required
- Post-deploy: ✅ optional (1–2 critical flows in staging)

---

### 1.8 Non-functional suites

**Includes**

- Performance (p95 latency, throughput)
- Load/soak (stability over time)
- Resilience (dependency down, timeouts, retries)
- Security (authz matrix, SAST/dep scan, secrets)
- Observability assertions (trace/log fields present)

**Where it runs**

- PR: ❌ (except quick security scans)
- Nightly: ✅
- Post-deploy: ✅ selective (staging)

---

### 1.9 Smoke tests (post-deploy)

**What it tests**

- The deployment is alive and minimally functional:
  - health checks
  - DB connectivity
  - broker connectivity
  - one “happy path” read/write endpoint (if safe)

**Where it runs**

- PR: ❌
- Nightly: ❌
- Post-deploy: ✅ required

---

## 2) Frontend Test Taxonomy (Summary)

- Unit tests: components + hooks in isolation (mock network) — **Vitest** + React Testing Library
- Integration tests: page flows with mocked API — **Vitest** + MSW
- E2E tests: real browser hitting deployed env — **Playwright**
- Visual regression (optional): snapshots via Playwright or Chromatic

Execution:

- PR: unit + integration (fast)
- Nightly: e2e (against preview/staging)
- Post-deploy: smoke e2e (1–2 flows)

---

## 3) Environments & Execution Plan

### 3.1 PR pipeline (fast feedback)

Required checks:

- Lint + typecheck
- Unit tests (backend + frontend)
- Use-case integration tests (selected high-value)
- API tests (selected)
- Migration test: empty → latest
- Contract tests (only if contracts changed)

Target principle:

- PR suite should finish quickly; keep it tight and high-signal.

### 3.2 Nightly pipeline (broad coverage)

- Full use-case integration suite
- Full API suite
- Outbox/messaging suite with retries/poison cases
- E2E workflow suite (multi-service)
- Performance baseline + regression guard
- Longer security scans

### 3.3 Post-deploy pipeline (staging/prod)

- Smoke tests
- Optional: 1 critical end-to-end workflow (staging)
- Observability checks (basic)

---

## 4) Test Data Strategy

### 4.1 Determinism rules

- No dependency on wall-clock time. Use a Clock abstraction with fixed timestamps in tests.
- No random IDs without seeding. Prefer deterministic UUIDs or seeded generators.
- Avoid test ordering dependence. Each test sets up its own state.

### 4.2 Database strategy

- Preferred: one Postgres container per test run.
- Migrations run at suite start.
- Isolation approach (choose one):
  1. Transaction-per-test + rollback (fastest), OR
  2. Truncate tables between tests (simple), OR
  3. Schema-per-test (strong isolation, slower)

Recommendation:

- Use truncate or transaction rollback for handler/API tests.
- Use schema-per-test only for tricky concurrency tests.

### 4.3 Fixtures

- Prefer factory helpers over static SQL dumps.
- Keep fixtures minimal: create only what the scenario needs.

---

## 5) Mocking Policy

### 5.1 What is OK to mock

- External systems: payment providers, bank rails, email/SMS, third-party APIs.
- Time: use a controlled clock.
- Non-deterministic infrastructure (only if unavoidable).

### 5.2 What should NOT be mocked in integration tests

- Postgres (use real)
- Transactions (use real)
- Outbox writes (use real)

---

## 6) Coverage Targets (guidance)

- Unit tests: high coverage for pure domain logic.
- Use-case integration: cover all invariants, idempotency, outbox emission, and error handling.
- API tests: cover request validation, authz boundaries, stable error shapes, key endpoints.
- E2E workflow: cover only critical business flows (small count, high value).

---

## 7) Folder & Naming Conventions (suggested)

Backend:

- `test/unit/**`
- `test/integration/use-cases/**`
- `test/integration/api/**`
- `test/contract/**`
- `test/integration/messaging/**`
- `test/e2e/**` (nightly only)

Test names:

- `*.unit.spec.ts`
- `*.usecase.int.spec.ts`
- `*.api.int.spec.ts`
- `*.contract.spec.ts`
- `*.messaging.int.spec.ts`
- `*.e2e.spec.ts`

---

## 8) What a “Good” Test Asserts

Unit:

- Behavior of the unit, not implementation details.

Use-case integration:

- Returned result + DB state + outbox rows + idempotency.

API:

- Status + response body + DB/outbox side effects + error envelope stability.

Messaging:

- Publish side (outbox→broker) + consume side effects + dedupe + retries.

E2E:

- Only user/business-visible outcomes.

---

## 9) CI Guardrails

- Flaky tests are treated as defects:
  - quarantine immediately
  - fix within 48 hours
- Concurrency tests run separately (nightly) if they require special harnessing.
- Keep PR suite lean; move heavy tests to nightly by default.

---
