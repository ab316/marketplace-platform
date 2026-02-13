# Non-Functional Requirements (NFR)

This document defines system-level qualities that must be maintained regardless of feature evolution.

These requirements guide architecture, infrastructure, testing, and operational decisions.

---

# 1. Availability & Reliability

## 1.1 Availability Target

- Target uptime: 99.9% (development goal)
- System should degrade gracefully if:
  - External payment provider fails
  - Messaging layer is temporarily unavailable

## 1.2 Failure Handling

- Financial operations MUST be idempotent (where applicable)
- Integration events MUST use outbox pattern
- No event should be lost on crash
- Command handlers MUST be transactional

## 1.3 Data Integrity

- No double-charging
- No inconsistent order states
- No cross-module data corruption
- Invariants enforced at domain layer

---

# 2. Performance

## 2.1 Latency Targets

- API requests: < 300ms (p95 under normal load)
- Payment orchestration: < 2 seconds (excluding external provider delays)

## 2.2 Scalability

- Backend must be horizontally scalable
- Stateless application nodes
- Database optimized for write consistency
- Clear module boundaries to enable future extraction

---

# 3. Consistency Model

- Internal state changes must be strongly consistent
- Cross-module communication may be eventually consistent via integration events
- Financial state transitions must be transactional

---

# 4. Security

## 4.1 Authentication

- Token-based authentication (JWT or equivalent)

## 4.2 Authorization

- Role-based access control (RBAC)
- Module-level authorization enforcement

## 4.3 Data Protection

- Sensitive data encrypted in transit (HTTPS)
- Secrets managed outside code
- No sensitive data in logs

## 4.4 Auditability

- All financial operations must be traceable
- Order lifecycle changes must be logged

---

# 5. Observability

## 5.1 Logging

- Structured logs (JSON)
- Correlation ID per request
- Include module + command name in logs

## 5.2 Metrics

- API latency
- Error rate
- Command execution time
- Outbox queue depth
- Payment success/failure rate

## 5.3 Tracing

- Trace ID propagated across:
  - HTTP request
  - Application layer
  - Messaging layer

---

# 6. Testability

- Domain logic must be unit-testable without infrastructure
- Application logic must be testable with mocked ports
- Infrastructure must have integration tests
- API layer must have end-to-end tests
- Test pyramid must be respected

---

# 7. Maintainability

- Strict layer boundaries
- No circular dependencies
- Clear module ownership
- Architecture documented and enforced
- ADRs recorded for major decisions

---

# 8. Extensibility

The system must support:

- Adding new modules without modifying existing ones
- Adding new integration events safely
- Replacing infrastructure adapters without changing domain logic
- Extracting modules into services in the future

---

# 9. Deployment & Operations

- Containerized deployment
- CI pipeline must run:
  - Lint
  - Type check
  - Unit tests
  - Integration tests
- Database migrations must be versioned
- Rollback strategy documented

---

# 10. Financial Safety Requirements

Because this system handles financial flows:

- Payment operations must be idempotent
- Order state must never enter invalid state
- Duplicate external callbacks must not cause duplicate side effects
- External provider failures must not corrupt internal state
- Outbox must ensure exactly-once event publish semantics (or at-least-once + idempotency)

---

# 11. Compliance & Audit (Future-Oriented)

- Event history retrievable
- Order/payment lifecycle reconstructible
- Immutable audit trail for financial events

---

# 12. Architectural Constraints

- Must remain a modular monolith initially
- Must avoid premature microservices
- Must not introduce cross-layer violations
- Must not introduce cross-module infrastructure coupling
