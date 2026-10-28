# ADR-010: Next.js App Router and the Frontend Stack

Date: 2026-10-27
Status: Accepted
Owners: Platform Team

## Context

`apps/web` has been a placeholder TypeScript package since the repository was bootstrapped. The target architecture in `docs/architecture/web/REPO_MAP.md` already commits to route-driven composition, server-first rendering, and contracts-over-coupling, but it names no concrete libraries. Phase 6 cannot start until the stack is chosen, because the choice of rendering model, data layer, and design system shapes every file that follows.

`REPO_MAP.md` §13 requires an ADR before introducing a frontend state library, a design system, a routing model, or a generated client. This ADR covers all of them at once, so Phase 6 starts from a settled base instead of accreting one decision per PR.

Constraints that matter:

- **SEO is a product requirement.** Buyer-facing catalogue and listing pages must be server-rendered and crawlable. A client-rendered SPA is not acceptable for the discovery surface.
- **The backend is authoritative and stays that way.** `apps/web` must not become a second place where business rules live (`REPO_MAP.md` §2, §6). Whatever we pick must make the HTTP boundary the obvious path, not an obstacle to route around.
- **Contracts already exist.** `packages/api-contracts` holds the Zod schemas the backend validates against, and the backend already generates OpenAPI from them via `@asteasolutions/zod-to-openapi`. The frontend should exploit the monorepo rather than duplicate type definitions.
- **One toolchain.** The repository standardizes on Vitest, Oxlint, and Oxfmt with exact-pinned versions upgraded together. A frontend that drags in a second test runner or formatter is a maintenance tax.
- **Solo maintenance.** Every library added is one more thing to upgrade. The bar for inclusion is a problem we actually have.
- **This is also a portfolio artifact.** Where two options are technically close, prefer the one that is the current production norm.

## Decision

### 1. Next.js (App Router) with React Server Components by default

Next.js 16 with the App Router, React 19, TypeScript strict mode, and Server Components as the default. Client Components are interactive islands, added as low in the tree as possible.

This confirms the direction already recorded in `TECH_STACK.md` and `REPO_MAP.md` rather than changing it. Server-first rendering is what makes the catalogue crawlable, and it keeps backend calls on the server where the session cookie and internal API URL stay private (ADR-011).

### 2. API communication: shared Zod contracts behind a typed data layer

`apps/web` imports schemas from `packages/api-contracts`, and all backend traffic goes through `src/data/` — a typed `fetch` wrapper owning base URL, credential forwarding, correlation IDs, error normalization, and response validation with the same schema the backend validated against.

**We do not generate a frontend client from OpenAPI.** The planned pipeline in `TECH_STACK.md` ("Planned: generated OpenAPI and frontend client") is superseded for the frontend half: in a single monorepo, importing the source-of-truth Zod schemas gives stronger guarantees than regenerating types from a specification derived from those same schemas, with no codegen step and no CI drift check to maintain. The backend keeps publishing OpenAPI — it documents the API and serves future third-party or non-TypeScript consumers, which is when a generated client earns its cost.

### 3. State: layered, with no general-purpose state library

There is no single "state management" choice. State is classified and handled at the cheapest adequate layer, which is the preference order `REPO_MAP.md` §7 already sets out:

| State                                        | Mechanism                                                             |
| -------------------------------------------- | --------------------------------------------------------------------- |
| Server data for initial render               | Server Components awaiting the data layer                             |
| Server data mutated or refetched client-side | TanStack Query                                                        |
| Filters, pagination, sort, tabs              | URL search params via `nuqs`                                          |
| Form state and client-side validation        | React Hook Form + `@hookform/resolvers/zod`, reusing contract schemas |
| Cross-tree UI concerns (theme)               | React Context                                                         |
| Complex client-only workflow state           | Zustand — **only when a concrete case demands it**                    |

Redux is rejected. TanStack Query is adopted now because mutations with pending/error/success states appear in the first real feature; `nuqs` because catalogue filters must be shareable and crawlable, which makes URL state an SEO requirement rather than a preference. Zustand is pre-approved in principle but **must not be installed until a feature needs it**.

### 4. Design system: Tailwind CSS v4 + shadcn/ui on Radix primitives

Tailwind CSS v4 for styling, with design tokens declared as CSS custom properties in `@theme`. Components come from shadcn/ui: source is copied into `src/components/ui/`, owned and modified by us, built on Radix UI primitives.

shadcn/ui is a generator, not a runtime dependency, so the only added dependencies are Radix primitives, `class-variance-authority`, `clsx`, and `tailwind-merge`. Radix carries the keyboard, focus, and ARIA behavior that `REPO_MAP.md` §8 requires and that hand-rolled dialogs and comboboxes reliably get wrong.

Material UI is rejected: a strong prescribed visual identity is a liability for a marketplace that needs its own brand, and it adds runtime weight and Server Component friction for components we would restyle anyway.

**Known friction:** Oxfmt does not sort Tailwind class lists, and `prettier-plugin-tailwindcss` is not usable without adopting Prettier for `.tsx`. We accept unsorted class lists rather than run two formatters.

### 5. Supporting libraries

- **Icons:** `lucide-react` — shadcn/ui's default, tree-shakeable.
- **Fonts:** `geist` package with bundled variable Geist Sans and Geist Mono, loaded through `next/font/local`. Self-hosted, no layout shift, and no build-time font download.
- **Animation:** CSS and Tailwind transitions first. `motion` may be added for genuinely complex sequences; it is **not** installed up front.
- **Theming:** `next-themes` for light/dark without a flash of wrong theme.

### 6. Testing: Vitest + React Testing Library + MSW, Playwright for E2E

- **Unit and component:** Vitest with the `jsdom` environment and React Testing Library, in `apps/web/test/`. One runner across the monorepo.
- **Feature integration:** the backend is simulated at the HTTP boundary with MSW, so the real data layer and the real contract schemas are exercised. `packages/api-contracts` is never mocked.
- **System E2E:** Playwright at repository-level `test/e2e`, per `TESTING_STRATEGY.md` and `REPO_MAP.md` §11 — not inside the frontend suite.

Async Server Components are not reliably testable with React Testing Library today; server-rendered pages are covered by Playwright instead. This is a known gap, not an oversight.

## Consequences

### Positive

- The catalogue is server-rendered and crawlable without extra work; SEO follows from the default rendering mode.
- Importing `packages/api-contracts` makes frontend/backend contract drift a type error at build time, with no codegen step or drift check in CI.
- shadcn/ui gives an owned, restyleable design system whose accessibility behavior comes from Radix rather than from our own discipline.
- A single test runner across backend and frontend; one upgrade, one configuration idiom.
- Deferring Zustand, `motion`, and generated clients keeps the installed surface close to what is actually used.

### Negative / Trade-offs

- The App Router's server/client split is genuinely harder to learn than a plain SPA, and mistakes leak server data or balloon the client bundle. `REPO_MAP.md` §5 is the guard; review must enforce it.
- shadcn/ui components are vendored source: we own their maintenance and get no upstream fixes automatically.
- Tailwind class lists stay unsorted, so diffs are noisier than a Prettier-formatted project.
- Choosing contract imports over a generated client ties the frontend to the monorepo. Extracting `apps/web` into its own repository later would require adopting the generated client after all — acceptable, since the OpenAPI document is already produced.
- Server Components are not covered by component tests, shifting load onto the Playwright suite, which is slower and coarser.

## Alternatives considered

1. **Remix / React Router 7**
   - Pros: simpler mental model, smaller default JS payload, cleanest self-hosting, excellent form and mutation ergonomics.
   - Cons: RSC support still maturing; markedly smaller ecosystem and hiring signal than Next.js. Technically a fine fit; rejected on ecosystem and portfolio grounds rather than capability.
2. **TanStack Start**
   - Pros: best-in-class type safety, Vite-native, natural fit with TanStack Query.
   - Cons: reached 1.0 only in October 2026; small ecosystem, few battle-tested patterns. Wrong risk profile for the project's primary web surface.
3. **Astro with React islands**
   - Pros: outstanding for content-heavy, crawlable pages.
   - Cons: a marketplace is an authenticated, interactive application (cart, checkout, seller dashboards, operator tooling), which is not where Astro is strongest.
4. **Generated OpenAPI client (`openapi-typescript` + `openapi-fetch`), per the original `TECH_STACK.md` plan**
   - Pros: decouples the frontend from the monorepo; the standard answer across repository boundaries.
   - Cons: generates types from a specification derived from Zod schemas we can simply import, adding a build step, a CI drift check, and a weaker runtime story — strictly more machinery for strictly less guarantee, here.
5. **Material UI as the component library**
   - Pros: enormous component inventory, batteries included.
   - Cons: prescriptive visual identity, heavier runtime, more Server Component friction.
6. **Redux Toolkit for state**
   - Pros: familiar, strong devtools.
   - Cons: solves a problem server-first rendering largely removes; most "global state" here is server state, which TanStack Query models better.

## Notes / Links

- Related ADRs: ADR-011 (web session transport and the BFF boundary), ADR-001 (modular monolith)
- Architecture: `docs/architecture/web/REPO_MAP.md` (authoritative frontend structure and rules)
- Tech stack: `docs/TECH_STACK.md` — frontend section and the superseded generated-client plan
- Testing: `docs/TESTING_STRATEGY.md`
- Roadmap: Phase 6 — Web Workflow and API Client
