# Changelog

Nothing has been released. This repository is in initial development; the entries below summarize the current baseline. Setup changes and internal tooling history live in git.

## [Unreleased]

### Fixed

- Hitting a rate limit now answers **429** with the shared error envelope (code `RATE_LIMITED`)
  instead of being misreported as a 500 internal error: `@fastify/rate-limit` rejections are not
  domain errors, so the shared error handler used to fall through to its 500 branch. Found by
  browser-testing the sign-in flow; covered by a new API integration test (the test harness can
  now opt into real throttling via `createTestApp({ rateLimit: true })`).

### Changed

- Local ports moved off 3000, which collides with most other Node tooling: the backend now
  defaults to **4000** and the web app to **4001**. Both are configured in a new repo-root `.env`
  (`BACKEND_PORT`, `WEB_PORT`; see `.env.example`), and `pnpm dev` derives the web app's
  `BACKEND_API_URL` from `BACKEND_PORT` so the two cannot drift. `pnpm dev` now starts both apps;
  what previously ran only the backend is `pnpm dev:backend`.
- Split product tracking into three homes: the backlog holds everything not yet built (finished items are removed), the roadmap schedules backlog items by ID and shrinks finished phases into a Done list, and a new use-case index (`docs/product/use-cases/README.md`) records what is built. Retired the provisional feature catalog; its remaining ideas moved into the backlog.
- Every listing and order endpoint now requires a real session instead of the `x-actor-id` header, and enforces organization membership and role. Anonymous catalogue browsing is unchanged.
- Deactivating a seller organization hides its listings from buyers and stops new orders, without deleting any listing, order, or history.
- Reorganized the roadmap around the new Identity and Access Control phase (now Phase 2; later phases renumbered), with scope set by PD-0003 and the session strategy by ADR-008. Email verification and password reset are deferred to backlog P1-008/P1-009.
- Focused the marketplace on refurbished computers, with UC-001 defining the first purchase use case (PD-0002).
- The backend now serves a real HTTP API; `src/index.ts` boots Fastify through the composition root instead of logging and exiting.

### Added

- Signing up, signing in, and signing out now work in the web app at `/sign-up` and `/sign-in`
  (UC-002 over the web, ADR-011): Server Actions post the credentials to the backend and hold the
  opaque session token in an httpOnly cookie, sign-up signs the new account straight in, sign-out
  revokes the backend session before clearing the cookie, and the header and footer reflect the
  signed-in user on every page. The split-panel direction from the mockup round was chosen; the
  mockups remain at `/mocks/auth` and the design contract is
  [docs/design/auth-pages.md](docs/design/auth-pages.md). No social sign-in (ADR-012) and no
  password reset (P1-008/P1-009) yet. The header's developer "Design system" link moved out
  (the footer keeps it), and a system E2E journey (`test/e2e/auth.e2e.spec.ts`) covers sign-up,
  sign-out, sign-in, and the `next` redirect through the real stack.
- Two sign-in/sign-up page directions, built as working mockups ahead of the real UC-002 web
  implementation: a focused centered card (`/mocks/auth/focused/*`) and a split panel that
  restates the escrow promise beside the form (`/mocks/auth/split/*`), with a gallery at
  `/mocks/auth` and a board at `/mocks/auth/states` rendering every UC-002 form state —
  validation, generic invalid-credentials, rate-limited, pending. Both directions share one form:
  single sign-up for buyers and sellers (PD-0003), no social buttons (ADR-012), no dead
  forgot-password link (P1-009). Nothing submits or sets a cookie — see
  [the design note](docs/design/auth-pages.md).
- Two home-page directions for the refurbished-laptop marketplace, built as working mockups
  with laptops-only static content and reachable at `/mocks/marketplace` (commerce-first) and
  `/mocks/editorial` (sustainability-led), with a gallery at `/mocks` stating what each one argues for.
  The original scaffold home page is preserved at `/mocks/original`. The sustainability-led
  direction was chosen as the home page: `/` renders it without the mock switcher, and the
  header, footer and about page no longer link to `/mocks` (the pages remain reachable by URL).
  Nothing is wired to the backend — see [the design note](docs/design/home-page.md).
- A standard marketplace footer on every page — brand block, Marketplace/Company/Support/Legal
  link columns, a guarantee strip and payment methods, patterned on refurbed and Back Market —
  plus the pages it links to: `/about`, `/contact`, `/faq` (with anchored sections), `/terms` and
  `/privacy`. All static placeholder content, clearly marked pre-release; every footer link
  resolves to a real page.
- The product is now called **Acme Tech**: header, footer, page titles and a new favicon. Four logo
  directions for the name are built in `components/brand/logo.tsx` and compared on a brand board
  at `/mocks/brand` — large, in the header, in dark mode and at favicon size. The "lid" mark
  (an open laptop in side profile) was chosen as the default in the site header and favicon.
- `pnpm dev` now starts the **whole stack** — backend and web app — in one terminal with prefixed
  output, via `scripts/dev.ts`. The individual apps remain available as `pnpm dev:backend` and
  `pnpm dev:web`.

- The web application is scaffolded in `apps/web` (roadmap Phase 6): Next.js 16 App Router with
  React Server Components by default, Tailwind CSS v4 design tokens with light and dark themes,
  UI primitives on Radix, a typed data layer that is the only path to the backend, and the test
  setup (Vitest + React Testing Library + MSW, with Playwright for system E2E at
  `test/e2e`). Two sample pages only — a home page and a design-system page; no marketplace
  feature is built yet. Fonts are bundled locally. `pnpm run dev:web`, `pnpm run test:web`, and
  `pnpm run test:e2e` are new.
- Three decisions settling how the frontend is built:
  [ADR-010](docs/decisions/ADR-010-frontend-stack.md) fixes the stack and rejects a generated
  OpenAPI client in favour of importing the shared Zod contracts directly;
  [ADR-011](docs/decisions/ADR-011-web-session-transport-and-bff.md) closes the token-transport
  question ADR-008 left open — the browser holds an httpOnly cookie, Next.js forwards it to the
  backend as a Bearer header, and Next.js is never an authority;
  [ADR-012](docs/decisions/ADR-012-federated-sign-in-readiness.md) keeps Google/Facebook sign-in
  an additive change later and fixes the account-linking rules now.
- Backlog P1-014 (users can see and end their active sessions) and P2-021 (sign in with Google
  and Facebook).
- Simulated escrow payment and a double-entry ledger (UC-004, PD-0004, ADR-009; roadmap Phase 4).
  A buyer pays an awaiting-payment order through `POST /api/orders/:orderId/pay`; on success the
  money is held in a per-order escrow account, the order becomes `paid_into_escrow` with a
  "Payment secured" timeline entry, the listing's reserved unit becomes sold, and the 8% marketplace
  fee rate is frozen on the order for Phase 5 to charge at release. Failure keeps the order payable
  ("Payment failed"); a 15-minute payment hold protects an order from expiry while a payment is in
  progress; a payment that succeeds after the order was cancelled or already paid is returned to the
  buyer ("Payment returned") and never revives the order. Phase 4 runs on a built-in simulated
  provider driven by a `scenario` request field (success, failure, timeout, duplicate callback) and
  a signed, deduplicated webhook. Platform admins read an order's payment attempts and financial
  history. Orders now carry a `payment` summary, listings a `soldQuantity`.
- `ledger` module: append-only journal and derived balances, with immutability and the
  debits-equal-credits rule enforced by Postgres triggers, idempotent posting by key, a rebuild
  command, and property-based tests (fast-check). `Money` gains `add`, `subtract`, and
  `percentageBps` (round-half-up).
- Roadmap "Backend reliability" block collecting the deliberately deferred transaction boundary,
  outbox, idempotency keys, correlation IDs, and destructive tests, which must close before Phase 5
  builds on the money model.
- API and application integration tests run against real Postgres by default, locally and in CI, through a Testcontainers-managed `postgres:18-alpine` with the real migrations applied. `TEST_PERSISTENCE=memory` (`pnpm test:memory`) keeps a Docker-free fast loop, and `pnpm test:unit` runs only unit tests. A persistence test proves every migration applies, reverts, and re-applies cleanly on a fresh database.
- Identity and access control (UC-002, UC-003): email/password sign-up and sign-in, opaque server-side sessions with immediate revocation (ADR-008), self-serve seller organizations, fixed `owner`/`manager`/`viewer` roles, a `platform_admin` role with cross-organization inspection and organization deactivate/reactivate, and an append-only organization audit trail.
- An authorized operator order-inspection path: marketplace staff can open any order with its timeline, regardless of organization.
- Postgres schema and migration for `users`, `user_credentials`, `sessions`, `organizations`, `organization_memberships`, and `organization_audit_entries`, plus the foreign keys from `listings` and `orders` that the initial schema could not yet declare.
- UC-001, the first stable use case: a seller organization publishes a refurbished-laptop listing, a buyer discovers it and places a single-unit SEK order, and the order timeline shows `Awaiting payment` and the next step.
- `listings` and `orders` backend modules implementing UC-001, with pooled stock, 24-hour reservation expiry, an immutable listing snapshot per order, and an append-only order timeline.
- Backend HTTP API over Fastify with shared Zod contracts in `packages/api-contracts` and a stable error envelope. (The original `x-actor-id` identity stub it shipped with has since been replaced by real authentication.)
- Hand-written Postgres schema and migration for `listings`, `orders`, and `order_timeline_entries`, including a database-level no-oversell constraint.
- An in-memory persistence mode (`PERSISTENCE=memory`) so the API runs with no external dependencies, plus `docker-compose.yml` for local Postgres.

- pnpm monorepo scaffold with a backend workspace, placeholder web app, and shared packages.
- Product direction and MVP scope for a trust-centered marketplace, with a roadmap toward the first visible workflow.
- Architecture decisions and engineering standards for module boundaries, financial invariants, transactional outbox events, and interface-first testing.
- Shared AI development instructions and optional role skills for Claude Code, Codex, and Gemini.

Future entries should describe notable product or architecture changes. Update `[Unreleased]` with the relevant implementation PR; use [the release checklist](docs/RELEASE_CHECKLIST.md) when preparing the first release.
