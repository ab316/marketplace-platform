# Backend Test Layout

Canonical backend test structure:

- `unit/` — domain invariants and other pure behavior
- `integration/api/` — default for HTTP-exposed behavior
- `integration/workflows/` — multi-step HTTP and messaging behavior
- `integration/application/` — selective internal operations or transaction-focused behavior
- `integration/messaging/` — outbox, broker, consumer, retry, and replay guarantees
- `integration/persistence/` — migrations, constraints, locking, and transaction guarantees
- `contract/` — HTTP and event compatibility

Complete browser-to-system E2E tests live at repository-level `test/e2e`, not in the backend tree. Naming conventions and suite-selection policy are defined in `docs/TESTING_STRATEGY.md`.
