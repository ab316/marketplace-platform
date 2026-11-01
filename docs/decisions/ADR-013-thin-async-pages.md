# ADR-013: Thin Async Pages for Server Component Testability

Date: 2026-10-31
Status: Accepted
Owners: Platform Team

## Context

ADR-010 commits `apps/web` to React Server Components by default, and the testing strategy commits frontend behavior to Vitest + React Testing Library with MSW (`TESTING_STRATEGY.md` §10, `REPO_MAP.md` §9). Those two commitments conflict at one point: an `async` Server Component returns a Promise of an element, and React's client renderer — which is what RTL drives in jsdom — cannot suspend on it. There is no official RSC renderer for Vitest, and Next-specific request APIs (`cookies()`, `headers()`) have no jsdom equivalents. `PROJECT_STATE.md` has carried this as a gap: "Async Server Components are not component-testable, so those paths rely on the Playwright suite."

Relying on Playwright for all server-rendered behavior is the wrong trade: E2E tests are the most expensive tier, and most of what a page does — mapping URL state to a query, branching between results/empty/error, rendering view models — is cheap to test when it is not trapped inside the async boundary. The first marketplace surface (the UC-006 catalogue) is exactly such a page: `searchParams` → validated query → data fetch → one of several view states.

## Decision

Async Server Components are composition shells, kept too thin to need component tests. Concretely:

1. **An async page (or async server component) may only:** validate/parse its inputs (`params`, `searchParams`, cookies) using shared schemas, call functions from the server-only data layer (`src/data/`), choose which presentational component to render, and pass it plain, serializable props (view models). No conditional markup beyond that choice, no formatting logic, no business rules.
2. **Everything below the async boundary is synchronous.** Presentational components receive data as props and never fetch. They carry all meaningful states (results, empty, zero-results, error, loading skeleton) and are tested with RTL in `test/component/`.
3. **Input-mapping and view-model logic lives in plain functions** (feature-local, e.g. `features/<feature>/search-params.ts`), unit-tested in `test/unit/`. Data-layer functions are already integration-tested against MSW in `test/integration/`.
4. **Calling an async component as a function** (`render(await Page({ searchParams }))`) is permitted sparingly, to cover a page's own branching when extracting it would be artificial. It must not be used for trees containing nested async children or Suspense boundaries, and must not stub Next request APIs beyond `cookies()`/`headers()` test doubles.
5. **Playwright (`test/e2e`) owns what genuinely needs the server runtime:** streaming/Suspense behavior, cookie-dependent rendering, route protection, revalidation, and the browser-to-backend journey.

The test for compliance: deleting every async component in a feature and re-wiring the same presentational components to a mock loader should lose no component-level test coverage.

## Consequences

### Positive

- Every user-visible state of a page is testable in the fast Vitest tier; the RSC gap in `PROJECT_STATE.md` stops being a blanket exclusion.
- Pages become trivially reviewable — the async shell reads as a table of contents.
- The pattern matches the existing data-layer discipline (`src/data/` is already the single backend path and already MSW-tested), so no new tooling or dependencies.
- If React/Vitest ship an official RSC testing story later, nothing has to be unwound.

### Negative / Trade-offs

- The shell itself (a few lines of awaiting and prop-passing) is only covered by Playwright; a typo wiring the wrong prop surfaces in E2E or typecheck, not in a unit test.
- More files per feature (shell + presentational + mapping module) than an all-in-one page.
- Discipline-based: nothing mechanical prevents logic creeping into a shell. Reviews (`marketplace-review`) must treat a fat async component as a defect.

## Alternatives considered

1. Keep relying on Playwright for all server-rendered paths (status quo)
   - Pros: no convention to enforce.
   - Cons: slowest feedback for the cheapest logic; states like zero-results-with-active-filters are awkward to stage end-to-end; E2E suite grows combinatorially with page states.
2. Render async components in jsdom via `render(await Page())` as the primary strategy
   - Pros: tests the real page; no restructuring.
   - Cons: breaks on nested async children and Suspense; requires stubbing Next internals; couples tests to implementation details of the framework; community-workaround status, no stability guarantee.
3. Adopt an experimental RSC test renderer
   - Pros: closest to "test what ships".
   - Cons: nothing stable exists for Vitest today; betting a repo convention on an experiment contradicts the one-toolchain constraint in ADR-010.

## Notes / Links

- Related ADRs: ADR-010 (frontend stack), ADR-011 (session transport — `cookies()` usage this pattern keeps out of presentational components).
- Related docs: `docs/architecture/web/REPO_MAP.md` §5/§9, `docs/TESTING_STRATEGY.md` §10, `docs/PROJECT_STATE.md` (active risks).
- First application: the UC-006 catalogue page (`docs/design/catalogue-search.md`).
