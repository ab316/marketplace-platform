# Non-Functional Requirements (NFR)

System-level qualities that must be maintained regardless of feature evolution.

---

## 1. Availability & Reliability

- Target uptime: 99.9% (development goal).
- Graceful degradation if external payment provider or messaging layer fails.
- Command handlers must be transactional.
- Integration events must use outbox pattern — no event lost on crash.

---

## 2. Performance

- API requests: < 300ms (p95 under normal load).
- Payment orchestration: < 2 seconds (excluding external provider delays).
- Horizontally scalable, stateless application nodes.
- No N+1 queries in hot paths.

---

## 3. Consistency Model

- Internal state changes: strongly consistent.
- Cross-module communication: eventually consistent via integration events.
- Financial state transitions: transactional.

---

## 4. Security

- Token-based authentication (JWT).
- Role-based access control (RBAC) with module-level enforcement.
- Sensitive data encrypted in transit (HTTPS). Secrets managed outside code.
- No sensitive data in logs.
- All financial operations and order lifecycle changes traceable.

---

## 5. Observability

- Structured logs (JSON) with correlation ID per request including module + command name.
- Metrics: API latency, error rate, command execution time, outbox queue depth, payment success/failure rate.
- Trace ID propagated across HTTP, application, and messaging layers.

---

## 6. Testability

- Domain logic: unit-testable without infrastructure.
- Application logic: testable with mocked ports.
- Infrastructure: integration tests.
- API layer: API integration tests.
- End-to-end workflow tests: separate suite for critical multi-step flows.
- Test pyramid respected.

---

## 7. Maintainability & Extensibility

- Strict layer boundaries, no circular dependencies.
- New modules addable without modifying existing ones.
- Infrastructure adapters replaceable without changing domain logic.
- Modules extractable into services in the future.
- ADRs recorded for major decisions.

---

## 8. Deployment & Operations

- Containerized deployment.
- CI pipeline: lint → type check → unit tests → integration tests.
- Database migrations versioned. Rollback strategy documented.

---

## 9. Compliance & Audit (Future)

- Event history retrievable.
- Order/payment lifecycle reconstructible.
- Immutable audit trail for financial events.
