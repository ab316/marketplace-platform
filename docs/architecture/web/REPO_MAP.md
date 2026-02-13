# Web Architecture Map (Authoritative)

Frontend location: apps/web

Framework:

- Next.js (assumed App Router unless stated otherwise)

---

## 1) Boundaries

- apps/web MUST NOT import code from apps/backend.
- apps/web consumes backend via HTTP API only (OpenAPI client or fetch wrapper).
- Shared types/utilities MUST come from packages/\* if shared across apps.

---

## 2) Suggested Web Structure

apps/web/src/

- app/ # Next.js routes (App Router)
- features/ # feature modules (business UI logic)
- components/ # reusable UI components (presentational)
- api/ # API client layer (generated or hand-written)
- lib/ # utilities (formatting, hooks, helpers)
- styles/ # global styling if needed

---

## 3) Data-fetching Rules

- API calls MUST go through src/api/ (client wrapper).
- Avoid direct `fetch()` usage inside React components.
- Keep server/client boundaries explicit (`server` actions vs client components).

---

## 4) Testing Policy

- Unit tests: components and utilities
- Integration tests: feature flows
- E2E tests: Playwright (if used)

---

## 5) How to add a new feature (Checklist)

1. Create: apps/web/src/features/<feature>/
2. Add page/route in: apps/web/src/app/...
3. Add API calls in: apps/web/src/api/...
4. Add tests in the appropriate test folder
