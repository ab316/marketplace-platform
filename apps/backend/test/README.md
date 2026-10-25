# Backend Test Layout

Canonical backend test structure:

- `unit/` — domain invariants and other pure behavior
- `integration/api/` — default for HTTP-exposed behavior
- `integration/workflows/` — multi-step HTTP and messaging behavior
- `integration/application/` — selective internal operations or transaction-focused behavior
- `integration/messaging/` — outbox, broker, consumer, retry, and replay guarantees
- `integration/persistence/` — migrations, constraints, locking, and transaction guarantees
- `contract/` — HTTP and event compatibility

## Persistence in integration tests

Integration tests run against real Postgres by default. `setup/postgres-global-setup.ts` starts one `postgres:18-alpine` container per run through Testcontainers and applies the real migrations to a template database. Each test file clones that template into its own database (`helpers/test-database.ts`), so files run in parallel without sharing state, and `createTestApp()` truncates every application table before each test. Truncation, not a wrapping transaction, keeps production commit boundaries visible.

`TEST_PERSISTENCE=memory` (`pnpm test:memory`) swaps in the in-memory repositories for a Docker-free run; it is an opt-in fast loop, not the reference. CI pins `TEST_PERSISTENCE=postgres`. Unit tests never touch the container: `pnpm test:unit`.

`integration/persistence/migrations.persistence.int.spec.ts` migrates a fresh, empty database up, fully down, and up again using the same runner the `migrate:*` scripts use; it is skipped in memory mode. Shared migration helpers live in `helpers/migrations.ts`.

Complete browser-to-system E2E tests live at repository-level `test/e2e`, not in the backend tree. Naming conventions and suite-selection policy are defined in `docs/TESTING_STRATEGY.md`.
