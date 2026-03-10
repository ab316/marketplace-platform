# Monorepo Architecture Map

## Repository Type

PNPM monorepo.

## Workspaces

- apps/backend → Node.js backend (DDD modular monolith)
- apps/web → Next.js frontend
- packages/\* → Shared libraries used by backend and/or web

## Shared Packages

- api-contracts → Shared API request/response contracts for backend and web
- core-domain → Domain base classes (Entity, ValueObject, AggregateRoot)
- core-contracts → Cross-cutting interfaces (cache, messaging, UoW, etc.)
- core-runtime → Shared implementations
- decorators → Cross-cutting decorators
- eslint-config → Shared lint configuration package (tooling only)

## Architecture Maps

Backend architecture rules:
→ docs/architecture/backend/REPO_MAP.md

Frontend architecture rules:
→ docs/architecture/web/REPO_MAP.md

## High-Level Dependency Direction

apps/web → may consume backend API only (no direct code imports)
apps/backend → may depend on packages/_
packages/_ → must not depend on apps/\*
