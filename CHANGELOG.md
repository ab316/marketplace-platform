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

- Settled the buyer's order page and order list (UC-014, now Approved) with four decisions added to
  the [buyer ordering spec](docs/product/feature-specs/buyer-ordering.md) as D9–D12: the order list
  pages at 12 like the catalogue, the timeline is one section of the order page rather than the page
  itself, the product owns the page's single forward-looking "next step" line while the API keeps a
  `nextStep` per timeline entry, and the seller-borne marketplace fee stays invisible to buyers.
  UC-001 was rewritten as the order-placement use case it became when it was split — retitled, goal
  and outputs narrowed to the commitment, finding and reading the listing turned into
  preconditions, and its file renamed to `UC-001-buyer-places-an-order.md` with every reference
  updated. No behavior changed; step and flow labels are unchanged.
- Local ports moved off 3000, which collides with most other Node tooling: the backend now
  defaults to **4000** and the web app to **4001**. Both are configured in a new repo-root `.env`
  (`BACKEND_PORT`, `WEB_PORT`; see `.env.example`), and `pnpm dev` derives the web app's
  `BACKEND_API_URL` from `BACKEND_PORT` so the two cannot drift. `pnpm dev` now starts both apps;
  what previously ran only the backend is `pnpm dev:backend`.
- Shaped the buyer's web slices (Phase 6): a new [buyer listing detail and ordering spec](docs/product/feature-specs/buyer-ordering.md) settles decisions D1–D8, and UC-001 is split by goal the way the seller side was — UC-012 (buyer views a listing's details, Approved, with a design contract), UC-013 (buyer cancels an unpaid order), and UC-014 (buyer reviews their orders, Draft). Two business rules are new: a buyer always sees the selling organization's name, and neither the selling organization's own members nor platform admins may place orders (backlog P1-020 and P1-021, both Phase 6 exceptions to the no-new-backend rule). UC-006 A3 was corrected: a deactivated seller's listing is not viewable at all.
- Split product tracking into three homes: the backlog holds everything not yet built (finished items are removed), the roadmap schedules backlog items by ID and shrinks finished phases into a Done list, and a new use-case index (`docs/product/use-cases/README.md`) records what is built. Retired the provisional feature catalog; its remaining ideas moved into the backlog.
- Every listing and order endpoint now requires a real session instead of the `x-actor-id` header, and enforces organization membership and role. Anonymous catalogue browsing is unchanged.
- Deactivating a seller organization hides its listings from buyers and stops new orders, without deleting any listing, order, or history.
- Reorganized the roadmap around the new Identity and Access Control phase (now Phase 2; later phases renumbered), with scope set by PD-0003 and the session strategy by ADR-008. Email verification and password reset are deferred to backlog P1-008/P1-009.
- Focused the marketplace on refurbished computers, with UC-001 defining the first purchase use case (PD-0002).
- The backend now serves a real HTTP API; `src/index.ts` boots Fastify through the composition root instead of logging and exiting.

### Added

- Captured the design contract for the buyer ordering slice
  ([`docs/design/buyer-ordering.md`](docs/design/buyer-ordering.md)): the confirmation step, the
  order page in its four states, cancellation, and `/orders` with its empty state. A new mockup
  gallery at `/mocks/orders` (`features/order-mocks/`) carries the two genuine layout arguments —
  the confirmation as a dialog over the listing vs. a dedicated page, and the order page as a
  sticky status panel vs. a single column — plus the states board and list exhibit every direction
  must satisfy. The founder chose the dedicated confirmation page and the status-panel order page
  on 2026-11-12; the rejected directions stay browsable.
- `pnpm seed` fills the local Postgres database with a standing cast for manual testing: four
  buyers, Nordic Refurb with owner/manager/viewer, Baltic Devices, a deactivated organization
  whose active listing stays hidden from buyers, a platform admin, and listings in every status
  (active, a single-unit listing, archived, a complete draft, an incomplete draft). Everything is
  created through the real HTTP routes, so the seed cannot bypass an invariant, and the script is
  re-runnable: it recognizes what already exists and creates only what is missing.
- Buyers can open a listing (UC-012; [spec](docs/product/feature-specs/buyer-discovery.md),
  [design](docs/design/buyer-listing-detail.md)), closing
  [#15](https://github.com/ab316/marketplace-platform/issues/15).
  - `/listings/[listingId]` is the buyer's page: specification, condition with the grade spelled
    out and known defects in their own block, description, fulfillment promise, price, who is
    selling, and whether it can be ordered. Public — it renders identically with no session.
  - Catalogue cards are now links, named by the listing title, and carry the buyer's refinements
    so "Back to results" restores the same search.
  - A sold-out listing reads in full as "Currently unavailable" and explains that reserved units
    can come back; an archived one as "No longer sold", so old links still show what was
    promised. A draft, a deactivated seller's listing, and an unknown id are one "not available".
  - Where the order action goes, the page says ordering opens with the next release; members of
    the selling organization and platform admins are told why they cannot order (P1-021 enforces
    it on the API later).
  - The backend's rate limit is now `RATE_LIMIT_MAX` (default 300 per minute, unchanged): the
    full Playwright suite drives every page's server-side calls from one address and needs more.

- Buyer-facing listings now name the seller (P1-020, [UC-012](docs/product/use-cases/UC-012-buyer-views-listing-details.md)): `GET /api/listings` and the published shape of `GET /api/listings/:listingId` carry `seller: { organizationId, name }` (`catalogueListingSchema` / `listingDetailSchema`), and catalogue cards show "Sold by …". Both routes stay open to anonymous buyers. The name is resolved through the listings module's organization directory port — one batched read per catalogue page, never one per row — and only the name is exposed. A listing whose organization cannot be resolved is treated as not available rather than shown without a counterparty. Seller and admin routes are unchanged.

- Seller draft saves disable inputs while pending, preventing late responses from erasing new edits. Prices retain exact öre, including drafts created through the API.

- Sellers manage their listings in the web app (UC-005, UC-007–UC-010; design contract
  [docs/design/seller-listing-management.md](docs/design/seller-listing-management.md)).
  - `/seller/listings` lists every status: stock for published listings, readiness ("Ready to
    publish" / "N details missing") for drafts.
  - `/seller/listings/new` creates a draft on its first save.
  - `/seller/listings/[id]` is the draft editor (five sections, a readiness panel whose items
    focus their field, exact SEK price, curated brand select, grade cards with their
    definitions, an unsaved-changes guard) or the read-only listing with its stock and an Archive
    action.
  - Publishing and archiving confirm through a new shadcn `AlertDialog` primitive
    (`@radix-ui/react-alert-dialog`).
  - Viewers, deactivated organizations, and staff get no write affordance. The seller area gains
    an "Overview · Listings" sub-navigation, and the seller home's listings card is now a link.
  - Grade names and definitions moved to `lib/formatting/listing.ts`, so the seller form and the
    catalogue share them.
  - Component, MSW-integration, and a Playwright journey cover the slice.
- Listing brand comes from the curated marketplace list (P1-017). Writes accept only
  `CATALOGUE_BRANDS` values (`400 VALIDATION_FAILED` otherwise), and publishing refuses an off-list
  brand. A migration maps existing brands that differ only in capitalization to the curated value
  and leaves the rest untouched (pre-release data).
- Sellers can save **incomplete listing drafts** (P1-012; UC-005, UC-007, UC-008, UC-010).
  `POST /api/listings` accepts any subset of the fields, including `{}`. `PATCH` uses merge-patch
  semantics (an omitted field keeps its value, `null` or blank text clears it, nested objects
  merge). Values that are present must still be well-formed. Each draft reports
  `readiness: { ready, issues }`, and publishing an incomplete draft answers `400
  LISTING_INCOMPLETE` with every missing or invalid field at once. A new migration makes the
  disclosure columns nullable and adds two database rules: a published listing must have every
  disclosure, and a draft can never hold stock. **Contract change:** `listingSchema` now
  describes published listings only (`status` active or archived, `publishedAt` always set). The
  new `listingDraftSchema` and `sellerListingSchema` (either shape, by `status`) are returned by
  listing detail, the seller and admin listing lists, and create/edit.
- Seller listing management shaped: a feature spec and one-goal use cases UC-005 and UC-007–UC-011
  replace the seller steps inside UC-001. The business rules gain the listing lifecycle, the
  publish bar, condition grade definitions, and the curated-brand rule. Use-case numbers are no
  longer reserved ahead of shaping.
- Sellers can create their organization in the web app (UC-003 C1–C3, the first slice of the
  web-first roadmap phase): the footer's "Sell on Acme Tech" leads to `/seller/setup` (through
  sign-in or sign-up when needed); creating an organization lands on the `/seller` home showing
  the organization, role, status, and honest "what's next" cards, and members who sign in land
  there too. `/seller` is the first protected route group. Platform staff see a notice instead of the form, and the backend now refuses
  staff on `POST /api/organizations` (`STAFF_CANNOT_SELL`, closing a UC-003 E7 gap). The FAQ's
  seller section gains a "Create your seller organization" call to action and no longer claims
  pre-listing verification (self-serve per PD-0003; verification remains P2-018). Design
  contract: [docs/design/seller-organization-setup.md](docs/design/seller-organization-setup.md).
  Component, MSW-integration, API, and system E2E tests cover the slice.

- Buyer catalogue at `/listings` (UC-006, completing P1-010), linked from the header and home
  page. Keyword, brand, SEK price bounds, minimum grade and memory, sorting, and pagination live
  in the URL. GET forms support browsing without JavaScript; removable chips, empty states,
  validation notices, loading UI, and a transport-error retry keep searches recoverable.
  Frontend unit, component, and API-boundary integration tests cover the page behavior.
  Opening a listing detail remains deferred to #15; mobile design remains a product-wide gap.

- Catalogue design reference with static results, filtered, and empty mockups under
  `/mocks/catalog`, shared grade badge styling, and ADR-013's thin async page convention for
  testable Server Component features. The live catalogue page follows in a separate slice.

- Catalogue search API (UC-006, API portion of P1-010): `GET /api/listings` accepts curated
  brand filters, inclusive SEK price bounds, minimum condition grade and memory, and newest or
  price sorting with deterministic ID tiebreaks. Filters combine with keyword search. Results
  and totals exclude fully reserved and sold-out listings (fixes #14). The buyer web surface
  remains pending.

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
