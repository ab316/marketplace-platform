# AGENTS.md

This file is the multi-tool bootstrap guide for repository-aware agents.

Precedence rule:

- If guidance conflicts, `docs/AGENT_GUIDELINES.md` wins.
- Use this file as an entrypoint and index, not as a duplicate policy source.

## Repository Map

- `apps/backend` -> Node.js backend (Modular Monolith, DDD, Clean Architecture)
- `apps/web` -> Next.js frontend
- `packages/*` -> shared libraries

Authoritative architecture maps:

- `docs/architecture/REPO_MAP.md`
- `docs/architecture/backend/REPO_MAP.md`
- `docs/architecture/web/REPO_MAP.md`

## Agent System

Role definitions:

- `agent/README.md` (system overview)
- `agent/shared.md` (base rules)
- `agent/*.md` (role definitions)

Slash command workflows:

- `.agents/workflows/*.md`

Active roles and commands:

- Scrum Master -> `agent/scrum-master.md` -> `/scrum-master`
- Product Owner -> `agent/po.md` -> `/product-owner`
- CTO / Risk Reviewer -> `agent/cto.md` -> `/risk-review`
- Architect -> `agent/architect.md` -> `/architect`
- Implementer -> `agent/implementer.md` -> `/implement`
- QA -> `agent/qa.md` -> `/qa`
- Reviewer -> `agent/reviewer.md` -> `/review`
- Technical Writer -> `agent/tech-writer.md` -> `/tech-writer`
- Chronicler -> `agent/chronicler.md` -> `/chronicler`
- Release Manager -> `agent/release-manager.md` -> `/release-manager`

## Delivery Flow (Strict Gates)

Use the canonical stage flow from `docs/product/development-workflow.md`:

`/scrum-master (intake) -> /product-owner -> /risk-review -> /architect -> /scrum-master (ready gate) -> /implement -> /qa -> /review -> merge -> /tech-writer -> /chronicler -> /scrum-master (closeout)`

## Critical Conventions (Aligned with Canonical Docs)

Integration events:

- Must be persisted through transactional outbox.
- Must use versioned names/schemas (example: `OrderPlaced.v1`).
- When adding/changing integration events, update:
  - `docs/architecture/backend/EVENT_CATALOG.md`
  - producer/consumer module README `Publishes/Consumes` sections

Backend test locations:

- Unit: `apps/backend/test/unit`
- Use-case integration: `apps/backend/test/integration/use-cases`
- API integration: `apps/backend/test/integration/api`
- Messaging integration: `apps/backend/test/integration/messaging`
- Contract: `apps/backend/test/contract`
- E2E workflow: `apps/backend/test/e2e`
