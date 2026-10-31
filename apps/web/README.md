# @acme/web

The marketplace web application: Next.js 16 App Router, React Server Components by default.

Scaffolded, with no marketplace features yet. The stack is fixed by
[ADR-010](../../docs/decisions/ADR-010-frontend-stack.md); authentication by
[ADR-011](../../docs/decisions/ADR-011-web-session-transport-and-bff.md). The authoritative rules
for adding a feature live in [`docs/architecture/web/REPO_MAP.md`](../../docs/architecture/web/REPO_MAP.md)
— read that before writing a page.

## Running it

```bash
cp .env.example .env                           # once: port configuration for the stack
cp apps/web/.env.example apps/web/.env.local   # once
pnpm run dev                                   # backend + web together
pnpm run dev:web                               # or just this app
```

The web app runs on `http://localhost:4001` and the backend on `http://localhost:4000`; both ports
come from `WEB_PORT` / `BACKEND_PORT` in the repo-root `.env`. When started via `pnpm run dev`,
`BACKEND_API_URL` is derived from `BACKEND_PORT` unless you set it explicitly in `.env.local`.
Fonts are bundled through the `geist` package, so builds do not need access to Google Fonts.

The app renders without the backend running; anything that fetches will surface an error state.

## Commands

```bash
pnpm run dev:web         # dev server
pnpm run test:web        # Vitest unit + integration
pnpm --filter @acme/web build
pnpm run test:e2e        # Playwright, from the repository root
```

Formatting, linting, and typechecking run repo-wide: `pnpm run check`.

## Layout

```text
src/
  app/              routes, layouts, loading/error/not-found boundaries
    design-system/  sample page: every UI primitive in one place
  components/
    ui/             design-system primitives, no business knowledge
    layout/         shell, navigation, page chrome
    feedback/       empty states, errors, loading affordances
  data/             the only place that talks to the backend
    server/         server-only data access
  features/         workflow modules (empty — see its README)
  lib/
    auth/           session cookie handling (server-only)
    env.ts          validated server configuration
  styles/           design tokens and global CSS
  proxy.ts          cookie-presence redirects (UX only, never authorization)
test/
  unit/             pure helpers              *.unit.spec.ts
  component/        UI primitives and islands *.component.spec.tsx
  integration/      backend simulated with MSW *.feature.int.spec.tsx
  msw/              shared handlers and fixtures
  stubs/            test-only module substitutes
```

Locations and suffixes follow `docs/TESTING_STRATEGY.md` §10; the Vitest projects enforce them.

System E2E tests are **not** here — they live in the repository-level `test/e2e`.

## Things that will bite you

- **`src/data/` is the only path to the backend.** Components never call `fetch`.
- **Server-only modules** (`data/`, `lib/env.ts`, `lib/auth/`) import `server-only`. If you see a
  build error about it, a Client Component is importing server code — fix the import, not the guard.
- **`proxy.ts` is user experience, not security.** The backend authorizes every request.
- **Tailwind classes are not auto-sorted.** Oxfmt does not sort them and we do not run Prettier
  (ADR-010). Unsorted is fine.
- **Async Server Components are not component-testable yet**; cover those paths with Playwright.
