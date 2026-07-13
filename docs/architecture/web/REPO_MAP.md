# Web Architecture Map (Authoritative)

Frontend location: `apps/web`

Current status: placeholder TypeScript package. This document defines the target architecture once Next.js is initialized.

Framework direction:

- Next.js App Router
- React Server Components by default
- TypeScript strict mode
- Shared API contracts from `packages/api-contracts`

Reference basis:

- Next.js App Router supports colocated route files and private folders outside routing.
- Next.js recommends thinking explicitly about server/client boundaries and protecting server-only data access.
- React recommends keeping state minimal, deriving values where possible, and avoiding redundant or contradictory state.

---

## 1) Frontend Principles

The frontend must be held to the same quality bar as the backend.

- **Product-first UI**: build visible buyer, seller, and operator workflows, not backend demo screens.
- **Route-driven composition**: routes define pages and layouts; feature modules own workflow UI and behavior.
- **Server-first by default**: use Server Components for data loading and static/non-interactive UI. Add Client Components only for interactivity.
- **Contracts over coupling**: the web app never imports backend code. It consumes backend behavior through typed API contracts.
- **User states are first-class**: loading, empty, error, unauthorized, optimistic, and success states are part of the feature.
- **Accessibility is non-negotiable**: semantic HTML, keyboard access, focus management, labels, and contrast are required.
- **Performance is a product feature**: avoid unnecessary client JavaScript, oversized shared components, and unbounded re-renders.
- **Design consistency beats novelty**: establish reusable primitives and patterns before creating one-off UI.

---

## 2) Boundaries

### Hard Rules

- `apps/web` MUST NOT import from `apps/backend`.
- `apps/web` MUST NOT import backend domain, application, infrastructure, or presentation code.
- Shared request/response schemas and DTO types MUST come from `packages/api-contracts`.
- Cross-app utility sharing MUST go through `packages/*`, not relative imports between apps.
- Backend calls MUST go through the web API/data access layer, not directly from arbitrary components.
- Server-only code MUST NOT be imported by Client Components.

### Allowed Dependencies

```text
apps/web
  -> packages/api-contracts
  -> browser-safe shared packages
  -> external frontend libraries

apps/web
  -X-> apps/backend
```

When a shared package is intended for browser use, keep it free of Node-only APIs, secrets, database clients, and backend framework imports.

---

## 3) Target Web Structure

Use a route-driven app with feature-owned workflow code:

```text
apps/web/src/
  app/
    (buyer)/
    (seller)/
    (operator)/
    layout.tsx
    page.tsx
    loading.tsx
    error.tsx
    not-found.tsx
  features/
    listings/
      api/
      components/
      hooks/
      schemas/
      types.ts
      index.ts
    offers/
    orders/
  components/
    ui/
    layout/
    feedback/
  data/
    api-client.ts
    server/
    mutations/
  lib/
    formatting/
    auth/
    telemetry/
  styles/
  test/
```

### Folder Responsibilities

- `app/`: routes, layouts, route groups, loading/error/not-found boundaries, page composition.
- `features/<feature>/`: workflow-specific UI, hooks, view models, and feature-local helpers.
- `components/ui/`: reusable design-system primitives with no product/business knowledge.
- `components/layout/`: shell, navigation, page chrome, responsive layout primitives.
- `components/feedback/`: empty states, inline errors, loading indicators, toasts, confirmation UI.
- `data/`: backend API client, server-only data access, mutations/server actions, cache/revalidation helpers.
- `lib/`: generic browser-safe utilities and thin adapters.
- `styles/`: global styles, tokens, and theme setup.
- `test/`: test utilities, MSW handlers, factories, and accessibility helpers.

Avoid large generic folders such as `utils/` or `shared/` without clear ownership.

---

## 4) Routes and Features

Routes should compose feature modules; they should not accumulate business logic.

Rules:

- Keep route files thin: fetch data, choose layout, compose feature components.
- Keep workflow-specific behavior inside `features/<feature>/`.
- Prefer route groups for product areas such as buyer, seller, and operator experiences.
- Use `loading.tsx`, `error.tsx`, and `not-found.tsx` for route-level user states.
- Use nested layouts only when a product area genuinely shares navigation or context.

Feature modules should expose a small public surface through `index.ts`.

Example:

```text
features/listings/
  components/listing-card.tsx
  components/listing-form.tsx
  api/listings.queries.ts
  api/listings.mutations.ts
  schemas/listing-form.schema.ts
  types.ts
  index.ts
```

---

## 5) Server and Client Boundaries

Default to Server Components.

Use Client Components for:

- form interactions that need local state
- rich controls
- browser APIs
- optimistic UI
- event handlers
- client-side transitions that materially improve UX

Rules:

- Add `"use client"` as low in the component tree as possible.
- Do not pass secrets, raw tokens, or over-broad backend records into Client Components.
- Server-only modules live under `data/server/` or use an explicit `server-only` guard once available.
- Client Components receive view models, not database-shaped or backend-internal objects.
- Prefer composition over global client state.

---

## 6) Data Access and Mutations

All backend communication must go through `src/data/` or feature-local API wrappers that call `src/data/`.

Rules:

- Validate request and response shapes with schemas from `packages/api-contracts`.
- Keep fetch wrappers typed and centralized.
- Map backend DTOs to UI view models before rendering complex screens.
- Handle auth, correlation IDs, error normalization, and retries in one API layer.
- Mutations must have explicit pending, success, validation-error, and failure behavior.
- Do not call backend endpoints directly from reusable UI primitives.
- Do not duplicate backend business rules in the frontend. UI validation may improve usability, but backend remains authoritative.

For server-side mutations, prefer server actions or route handlers only when they keep secrets server-side and simplify the product flow. Otherwise use explicit backend API calls through the data layer.

---

## 7) State Management

Start with React and URL state. Add a state library only when repeated pain justifies it.

Preferred order:

1. Local component state for ephemeral UI.
2. URL/search params for shareable filters, pagination, and tabs.
3. Server/cache state from framework data fetching or a query library.
4. Context for stable cross-tree UI concerns such as auth session display or theme.
5. Dedicated client state library only for complex client-only workflows.

Rules:

- Keep state minimal and derive values where possible.
- Avoid duplicated state across URL, component state, and server cache.
- Keep forms close to their feature.
- Use optimistic updates only when rollback behavior is defined.
- Never store secrets in client state.

---

## 8) UX, Accessibility, and Design Quality

Every product slice must define the user-facing states it creates.

Required states:

- loading
- empty
- validation error
- recoverable failure
- unauthorized/forbidden where applicable
- success or completion feedback

Accessibility rules:

- Use semantic HTML before custom widgets.
- Every form control has a programmatic label.
- Interactive controls are keyboard reachable and visibly focused.
- Modal/dialog flows manage focus.
- Error messages are associated with the relevant fields or region.
- Color is not the only signal for status.

Design rules:

- Build reusable UI primitives before repeating one-off styling.
- Keep dense operational screens scannable.
- Use tables for comparison-heavy operator views.
- Use cards sparingly for repeated entities, not as a default page layout.
- Prefer clear status labels and timelines for order/payment state.

---

## 9) Security and Privacy

Frontend security is not cosmetic.

Rules:

- Never expose secrets, provider keys, service tokens, or privileged internal IDs to the browser.
- Treat all browser-provided data as untrusted.
- Enforce authorization on the backend; frontend guards are UX only.
- Avoid rendering raw HTML. If unavoidable, sanitize and document the reason.
- Do not log PII, tokens, payment details, or sensitive operational data.
- Prefer server-side data access for sensitive screens.
- Keep error messages helpful without leaking internals.

---

## 10) Observability

Frontend observability should explain user-impacting failures.

Required for meaningful product flows:

- user-visible error boundaries
- normalized client error reporting
- correlation/request IDs propagated to backend calls when available
- lightweight performance checks for core pages
- analytics events only after product questions are clear

Do not add analytics that cannot drive a decision.

---

## 11) Testing Policy

Frontend tests should prove user behavior, not implementation details.

Minimum expectations:

- Unit tests for pure helpers and complex component logic.
- Component tests for reusable UI primitives and feature components with meaningful states.
- Feature/page integration tests with the backend simulated at the HTTP boundary.
- System E2E tests for critical buyer/seller/operator workflows through the real web app and backend once runnable; these live at repository-level `test/e2e`, not inside the frontend suite.
- Accessibility checks for forms, dialogs, navigation, and error states.

Mocking rules:

- Simulate the network with MSW or equivalent in feature integration tests; these are not E2E tests.
- Do not mock `packages/api-contracts`; use the real schemas/types.
- Avoid mocking child components unless the dependency is genuinely outside the behavior under test.

---

## 12) How to Add a Frontend Feature

1. Identify the product area: buyer, seller, or operator.
2. Decide the route and URL shape.
3. Define or reuse API contracts in `packages/api-contracts`.
4. Add backend API behavior if needed.
5. Add feature code under `features/<feature>/`.
6. Add route composition under `app/`.
7. Implement loading, empty, error, unauthorized, and success states.
8. Add tests at the lowest useful level.
9. Update docs when the feature changes architecture, product behavior, or shared patterns.

---

## 13) When to Create an ADR

Create an ADR for:

- introducing a frontend state library
- introducing a design system/library
- changing the frontend framework or routing model
- changing the API contract strategy
- adopting a generated client
- adding analytics/session replay
- adding a BFF layer or Next.js route handlers as a backend facade
