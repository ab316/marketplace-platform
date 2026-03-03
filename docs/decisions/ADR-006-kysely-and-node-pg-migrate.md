# ADR-006: Kysely + node-pg-migrate for Database Access and Migrations

Date: 2026-03-03  
Status: Accepted  
Owners: Platform Team

## Context

The platform requires a typed database access layer and a migration tool for PostgreSQL. Our architecture combines DDD + CQRS + Clean Architecture with financial safety requirements including transactional outbox, row-level locking, append-only event history, and an append-only financial ledger (ADR-003).

Key constraints influencing this decision:

- Explicit SQL control is required for transactional outbox (`INSERT ... SELECT ... FOR UPDATE SKIP LOCKED`), row-level locking, and CQRS read model projections.
- Migrations for financial tables must be hand-written and deliberately reviewed — auto-generated migrations carry unacceptable risk.
- The query builder must live cleanly in the infrastructure layer without leaking into domain or application layers.
- The system philosophy is "no heavy ORMs, no hidden magic" (TECH_STACK.md).

## Decision

We will use **Kysely** as the typed SQL query builder and **node-pg-migrate** for database migrations.

Concretely:

1. **Kysely** provides typed query construction in the infrastructure layer. It is a pure SQL builder — no schema-driven code generation, no relational abstraction, no runtime magic.

2. **node-pg-migrate** provides hand-written, reviewable migration files with explicit `up` and `down` functions. Migrations are a deployment concern, decoupled from the query builder.

3. **Database interface types** (`Database`, table types) are maintained manually in TypeScript. A CI check may be introduced later to validate these types against `pg_catalog`.

4. **Raw SQL** is used via Kysely's `sql` template tag wherever the typed API is insufficient for complex patterns.

## Consequences

### Positive

- Full SQL control for transactional outbox, row-level locking, CTEs, and complex financial queries.
- Hand-written migrations ensure every schema change is deliberate and auditable — critical for financial tables and append-only ledgers.
- Clean separation: query builder (infrastructure) and migrations (deployment) are independent tools with no coupling.
- Aligns with "Clarity > Cleverness" and "No hidden magic" principles.
- Kysely's API is stable with minimal breaking changes, reducing upgrade risk.

### Negative / Trade-offs

- Database interface types are maintained manually and can drift from the actual schema. Requires discipline or tooling to keep in sync.
- Two separate tools to configure and learn (Kysely for queries, node-pg-migrate for migrations).
- Smaller community than Drizzle, fewer tutorials and integrations.

## Alternatives considered

1. Drizzle + drizzle-kit
   - Pros: Schema-as-code eliminates type drift. Single ecosystem for queries and migrations. Excellent DX with schema-derived autocomplete. Rapidly growing community.
   - Cons: Auto-generated migrations are risky for financial/ledger tables. Schema-as-code couples the query builder to the migration tool, blurring Clean Architecture layers. More abstraction than needed — relational query API adds magic. API has seen more frequent breaking changes. Complex SQL patterns (outbox polling, skip-locked) are less ergonomic.

2. Raw pg driver + node-pg-migrate
   - Pros: Maximum control, zero abstraction.
   - Cons: No type safety for queries. High boilerplate. Error-prone string-based SQL.

3. Prisma
   - Pros: Mature ecosystem, excellent DX for CRUD.
   - Cons: Heavy ORM with significant runtime overhead. Hides SQL behind an abstraction. Poor support for raw SQL patterns, row-level locking, and transactional outbox. Directly contradicts "no heavy ORMs" principle.

## Notes / Links

- Related ADRs: ADR-001 (Modular Monolith), ADR-002 (Persistence & Event Strategy), ADR-003 (Append-Only Financial Ledger)
- Related diagrams: N/A
- Related PRs/issues: N/A
