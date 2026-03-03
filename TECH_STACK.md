# Tech Stack

## Overview

This repository is a **pnpm workspace monorepo** designed for:

- Modular monolith architecture
- Clean Architecture (DDD + CQRS)
- Strict type safety
- TDD-first development
- Long-term scalability
- Excellent IDE performance (VS Code optimized)

The stack prioritizes correctness, maintainability, and production-readiness without unnecessary complexity.

---

# Monorepo & Package Management

## pnpm (Workspaces)

The repository uses **pnpm workspaces**.

### Why pnpm?

- Strict dependency isolation
- Fast installs
- Efficient disk usage
- Clean workspace boundaries
- Prevents accidental cross-imports

Workspace structure:

```
apps/*
packages/*
```

This enables:

- Backend and frontend separation
- Shared contracts without duplication
- Clear dependency boundaries
- Scalable architecture evolution

---

# TypeScript Architecture

## TypeScript (Strict Mode)

Configured with:

- `strict: true`
- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `forceConsistentCasingInFileNames`
- Composite builds

### Why?

- Safer refactoring
- Reduced runtime errors
- Strong compile-time guarantees
- Clean cross-package type sharing

---

## TypeScript Project References

The root `tsconfig.json` is **references-only**.

### Why?

- Prevents VS Code from loading the entire monorepo as one giant project
- Improves:
  - Find All References
  - Rename Symbol
  - Incremental builds
  - Editor responsiveness

Each workspace is a composite project.

---

# Backend Stack

## Runtime

- **Node.js (Latest LTS)**
- Native ESM modules

### Why?

- Stability
- Long-term support
- Modern ECMAScript features

---

## HTTP Layer

- **Fastify**

### Why Fastify?

- High performance
- Strong TypeScript support
- Clean lifecycle hooks
- Built-in request injection for API testing
- Minimal overhead

---

## Validation & Contracts

- **Zod**

### Why Zod?

- Runtime validation
- Static type inference via `z.infer`
- Shared contracts between backend and frontend
- Clear schema-driven development

Zod schemas act as the single source of truth for:

- Request validation
- Response validation
- API contracts
- Shared frontend types

---

## Database

- **PostgreSQL**
- **Kysely** (typed SQL builder)
- **node-pg-migrate** (migrations)

### Why SQL-first instead of heavy ORM?

- Explicit queries
- Clear transactional boundaries
- Better control over:
  - Row-level locking
  - CQRS read models
  - Financial consistency
  - Transactional Outbox pattern

---

## Messaging & Background Processing

- **NATS (JetStream capable)**
- **BullMQ**
- **ioredis**

### Why messaging?

The system is workflow-heavy:

- Order lifecycle
- Payment orchestration
- Dispute resolution
- Event projections

We use:

- Transactional Outbox pattern
- Idempotent consumers
- Background workers for async processing

---

## Logging

- **Pino**

### Why?

- Extremely fast
- Structured JSON logs
- Production-ready
- Minimal runtime overhead

---

## Observability

- **OpenTelemetry**
  - Traces
  - Metrics
  - OTLP exporter

### Why?

- Vendor-neutral
- Production-grade observability
- Future-proof for distributed systems

---

# Frontend Stack

- **Next.js**
- TypeScript
- Shared contracts from `packages/api-contracts`

The frontend consumes shared Zod contracts to:

- Infer request/response types
- Prevent API drift
- Ensure end-to-end type safety

---

# Testing Strategy

The project follows a modern test pyramid:

## Unit Tests

- Domain logic
- Value objects
- Policies
- Pure functions

## Handler Integration Tests

- CQRS handlers
- Real database via Testcontainers
- Transaction behavior verification

## API Tests

- Fastify injection
- Full request/response validation
- Middleware and auth behavior

## Workflow Tests

- Event-driven flows
- Outbox publishing
- Async background processing

### Tooling

- Mocha
- Chai
- Sinon
- c8 (coverage)
- Testcontainers

TDD is strongly encouraged.

> **Note:** For detailed taxonomy, naming conventions, and CI execution plan, see `TESTING_STRATEGY.md`.

---

# Architecture Patterns

## Modular Monolith

Chosen over microservices initially for:

- Lower operational complexity
- Easier refactoring
- Strong internal boundaries
- Simpler deployment

Modules communicate via:

- Explicit application services
- Integration events (even in-process)

---

## Clean Architecture

Layers:

- Domain
- Application
- Infrastructure
- Presentation (API)

Dependencies point inward.

---

## CQRS

- Commands mutate state
- Queries read optimized projections
- Clear separation of concerns

---

## Transactional Outbox

Ensures:

- No event loss
- No double publish
- Database and message bus consistency

---

# Code Quality & Tooling

- ESLint (no typed linting for performance)
- Prettier
- Strict TypeScript settings
- Git hooks (planned)

---

# Design Principles

- Explicit dependencies over magic DI containers
- Constructor injection
- Composition root pattern
- Small shared kernel
- Strong module boundaries
- Avoid premature distribution

---

# Philosophy

This stack balances:

- Enterprise-grade correctness
- Performance
- Developer experience
- Long-term maintainability
- Future microservice evolution

It avoids:

- Heavy ORMs
- Hidden magic
- Over-engineering
- Tooling that degrades IDE performance
