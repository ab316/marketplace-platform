# decorators

Role: Cross-cutting decorators used across the monorepo.

This package provides lightweight decorators that support:

- Transaction boundaries
- Tracing
- Logging
- Validation hooks
- Execution wrappers

Decorators are syntactic conveniences over cross-cutting concerns.
They must remain thin, predictable, and safe.

---

# Goals

- Provide clean, declarative syntax for cross-cutting behavior.
- Reduce boilerplate in application and presentation layers.
- Keep business logic readable.
- Avoid leaking infrastructure concerns into domain code.

---

# Non-Goals

- No business logic.
- No domain invariants.
- No heavy infrastructure wiring.
- No framework bootstrapping.
- No hidden side effects.

Decorators must never contain complex behavior.

---

# Hard Rules (Authoritative)

## 1) Domain Layer Restriction

Decorators MUST NOT be used in:

- domain layer
- entities
- aggregates
- value objects

Domain must remain pure and explicit.

---

## 2) Thin Wrapper Principle

Decorators must:

- Call existing services (UnitOfWork, Logger, Tracer, etc.)
- Avoid implementing complex logic directly
- Avoid stateful behavior

If a decorator requires substantial logic, move the logic to a reusable helper in core-runtime and keep the decorator thin.

---

## 3) No Hidden Magic

Decorators must not:

- Mutate unrelated state
- Swallow errors silently
- Change control flow unexpectedly
- Introduce implicit dependencies

All side effects must be predictable.

---

## 4) Infrastructure Awareness

Decorators MAY depend on:

- core-contracts (interfaces)
- core-runtime (shared helpers)

Decorators MAY use framework features (e.g., metadata reflection), but must not hardwire app-specific details.

---

# Typical Decorators

## @Transactional()

Purpose:
Wrap a method inside a UnitOfWork transaction.

Usage:

- Application layer only (command handlers, use-cases)

Responsibilities:

- Start transaction
- Execute method
- Commit or rollback
- Ensure outbox behavior if applicable

Must NOT:

- Contain domain logic
- Define transaction strategy itself (delegate to UoW)

---

## @Trace()

Purpose:
Wrap execution in tracing span.

Responsibilities:

- Start span
- Attach metadata (module, command name)
- End span
- Propagate correlation ID

Must NOT:

- Implement tracing SDK directly (use adapter)

---

## @LogExecution()

Purpose:
Structured logging of method entry/exit.

Responsibilities:

- Log start
- Log duration
- Log error if thrown

Must NOT:

- Log sensitive data
- Swallow exceptions

---

## @Validate()

Purpose:
Validate input DTO/schema before execution.

Responsibilities:

- Call validation logic
- Throw predictable validation error

Must NOT:

- Contain schema definitions itself

---

# Where Decorators May Be Used

Allowed:

- Application layer (use-cases, command handlers)
- Presentation layer (controllers)

Not allowed:

- Domain layer
- Infrastructure persistence layer
- Inside value objects or aggregates

---

# Design Principles

## Explicit > Implicit

Decorators should improve readability, not obscure behavior.

## Replaceable

Removing a decorator should not break core logic.
The logic should remain correct even if decorator is removed.

## Deterministic

Execution order must be predictable.
Avoid complex decorator stacking interactions.

---

# Error Handling

Decorators must:

- Re-throw errors unless explicitly transforming them.
- Never swallow domain errors.
- Preserve stack traces.

---

# Testing

Decorators should be:

- Unit tested independently.
- Tested in integration via decorated handlers.

Do not rely solely on integration tests to validate decorator correctness.

---

# Versioning & Stability

Decorators affect many parts of the system.

- Changes must be backward compatible when possible.
- Any behavioral change must be clearly documented.
- Architectural-impacting changes may require ADR.

---

# Anti-Patterns (Strictly Forbidden)

- Business logic inside decorators
- Direct database access inside decorators
- Creating global singletons
- Reading environment variables directly
- Silent error handling
- Deep coupling to a specific module

---

# Decision Rule

If the behavior:

- Is cross-cutting
- Is reusable
- Does not contain business logic
- Does not depend on domain concepts

Then a decorator MAY be appropriate.

Otherwise:
Do not use a decorator.
