# Design: Seller listing management (listing list, create and edit a draft, publish, archive)

- **Status:** approved (1 November 2026) and implemented the same day; the mockups stay browsable at `/mocks/seller-listings`
- **Figma:** none; the in-repo mockups are the design input, listed in the `/mocks` gallery and
  browsable at `/mocks/seller-listings` (nine states: list, empty list, form, form with errors,
  detail in each status, archive confirmation, deactivated organization). Desktop only.
- **Related use cases:** `docs/product/use-cases/UC-007-seller-publishes-a-listing.md` (S1–S5,
  A1–A3, E1–E3) and `docs/product/use-cases/UC-008-seller-withdraws-a-listing-from-sale.md`
  (W1–W4, A1–A3, E1–E2)
- **Related decisions:** PD-0002 (laptops only), PD-0003 (roles: owner/manager write, viewer
  reads; admins never sell), ADR-010 (Radix primitives), ADR-011 (cookie session, Server
  Actions), ADR-013 (thin async pages)
- **Roles affected:** seller (owner, manager, viewer); platform admin only in what they must _not_
  see

## Why this slice

The backend half of UC-007 and UC-008 has been implemented and tested since Phase 1: the five
seller routes under `/api/listings` and `/api/seller/listings` create, edit, publish, archive,
and list listings. Nothing in the web app reaches them. The seller home's "Publish your first
listing" card is marked "Coming soon". This slice turns that card into a link and gives a seller
the complete path from an empty organization to a listing a buyer can find. It is the second
`(seller)` slice and the first with a multi-step form, a dense list, and a destructive action,
so it establishes three patterns the members and operator slices will reuse.

## Decisions settled before the mockup round (2026-11-01)

- **No new backend behavior.** The form requires every field to save a draft, because the backend
  does (UC-007 Gaps; P1-012 is out of this slice). The form says so plainly rather than promising
  a "save for later" it cannot deliver.
- **Two use cases, one slice.** Publishing (UC-007) and archiving (UC-008) ship in one PR; the
  index tracks their Web surfaces separately.
- **Archive confirmation is a Radix `AlertDialog`**, not a confirm page and not an inline two-step
  button. Reasons: the action is irreversible in the MVP (no re-publish, no restock), the
  `alertdialog` role and focus handling are what an irreversible action needs, and the members
  slice needs the same primitive for "remove member". Trade-off accepted: the first overlay
  primitive and the first seller action that needs JavaScript. ADR-010 pre-approves Radix
  primitives; no new ADR.
- **Brand is a text input with the curated brand list as suggestions** (`<datalist>` over
  `CATALOGUE_BRANDS` from the shared contracts), never a constraint. Enforcement is P1-017.
- **Price is entered in whole SEK** and converted to öre in a unit-tested mapping; the API never
  sees a decimal.
- **One list, no status tabs.** The seller list endpoint has no status filter and adding one is
  backend work. Status is a badge per row; the list is paginated.

## Route & entry points

All routes live in the existing `app/(seller)/` group; `/seller` is already in
`PROTECTED_PREFIXES`, so no proxy change is needed.

- `/seller/listings` — the organization's listings, every status.
- `/seller/listings/new` — create a draft.
- `/seller/listings/[listingId]` — the seller-facing detail: full disclosures, stock counts,
  status, and the actions the status and role allow.
- `/seller/listings/[listingId]/edit` — edit a draft (same form as `new`, pre-filled).
- How the user arrives: the seller home's "Publish your first listing" card becomes a link to
  `/seller/listings/new` (and, once the organization has listings, a "Your listings" link to
  `/seller/listings`); a seller sub-navigation (Overview · Listings) on `/seller/*` pages; the
  list's row links to detail; detail's actions to edit/publish/archive.
- After saving a new draft: redirect to its detail page. After publishing: stay on detail, which
  now shows `Active`. After archiving: stay on detail, which now shows `Archived`. After editing:
  redirect to detail.

## User states

### Shared across all four routes

- **Anonymous:** redirected to sign-in with `next` preserved (proxy; cookie presence only).
- **Signed in, no organization:** redirected to `/seller/setup`.
- **Platform admin:** the existing `StaffNotice` in place of the page.
- **Member, organization deactivated:** the deactivation banner from the seller home above the
  content; every write affordance absent (not disabled); reads work. `new` and `edit` redirect to
  the listing list, which shows the banner — there is nothing to write.
- **Viewer role:** reads work; no "New listing", "Edit", "Publish", or "Archive" affordances
  anywhere. `new` and `edit` redirect to the list.
- **Loading:** `loading.tsx` skeletons per route (table skeleton, form skeleton, detail skeleton).
- **Recoverable failure:** the route group's `error.tsx` with retry; header still renders.

### `/seller/listings`

- **Empty:** "No listings yet" with one sentence and a primary "Create your first listing"
  button (owner/manager) or, for a viewer, the sentence alone.
- **Populated:** a table (REPO_MAP §8: tables for comparison-heavy views): title, brand + model,
  status badge, available / total stock (reserved and sold on hover or in a secondary line),
  price in SEK, updated date. Row title is the link to detail. Sorted newest first (the API's
  order). Pagination identical in behavior to the catalogue's (GET links, `aria-current`).
- **Past the end:** the true total and a "Back to first page" link, as the catalogue does.

### `/seller/listings/new` and `/edit`

- **Default:** the form, grouped into four fieldsets: Listing (title, description), Laptop
  (brand, model, CPU, RAM, storage type, storage size, screen size), Condition (grade, battery
  health minimum, battery cycle range, known defects), Offer (price, quantity, fulfillment
  expectations). A sentence at the top: "Every field is required to save a draft. Drafts are not
  visible to buyers until you publish."
- **Validation error:** field-level, from the shared `createListingRequestSchema` /
  `updateListingRequestSchema` plus the SEK → öre mapping (price must be a whole or two-decimal
  SEK amount > 0). On submit, focus moves to the first invalid field.
- **Pending:** controls disabled, submit reads "Saving draft…", `aria-busy`.
- **Listing not a draft (edit route only):** the backend rejects with
  `409 LISTING_STATE_CONFLICT`; the page redirects to detail, which shows the real status
  (UC-007 A2). The edit page itself redirects to detail without rendering the form when the
  loaded listing is not a draft.
- **Not found / not yours:** `404 LISTING_NOT_FOUND` or `403 LISTING_ACCESS_DENIED` → the route's
  `not-found.tsx` ("This listing doesn't exist or belongs to another organization").
- **Deactivated organization during submit (`409 ORGANIZATION_STATE_CONFLICT`):** banner with the
  backend's message; typed values preserved.
- **Rate limited (429) / recoverable failure:** the same two banners the auth and organization
  forms use; typed values preserved.
- **Success:** redirect to detail.

### `/seller/listings/[listingId]`

- **Draft:** status badge `Draft`, a note "Not visible to buyers", disclosures, stock, and the
  actions **Edit** and **Publish** (owner/manager). Publish is a Server Action form button; on
  `409` the page refreshes to the current status.
- **Active:** badge `Active`, "Visible in the catalogue" with a link to the public listing page
  once it exists (until then, to the catalogue filtered by the listing's brand — honest and
  useful), stock line "N available · N reserved · N sold", and the action **Archive…**
  (owner/manager). No Edit (UC-007 A2); the page says why in one line: "Published content can't
  be edited so buyers always see what they ordered."
- **Archived:** badge `Archived`, "Withdrawn from sale on <date>", disclosures and final stock
  counts, no actions. One line: "Archived listings can't be re-published; create a new listing to
  sell this model again."
- **Archive confirmation (AlertDialog):** title "Archive this listing?", body stating the four
  consequences from UC-008 W2, buttons "Cancel" (focused on open) and "Archive listing"
  (destructive variant). Pending: "Archiving…". On `409 LISTING_STATE_CONFLICT` the dialog
  closes and the page shows the current status. Escape and Cancel close it; clicking outside does
  not (Radix `AlertDialog` default).

## Key components

- **`features/seller-listings/`** (new feature module; public surface through `index.ts`):
  - `components/listing-table.tsx` — synchronous; receives a view model of rows plus pagination.
  - `components/listing-form.tsx` — Client Component; React Hook Form over a feature-local form
    schema derived from the shared contract schema (SEK as entered, grouped fieldsets); the
    Server Action arrives as a prop so the form is component-testable; used by `new` and `edit`.
  - `components/listing-detail.tsx` — synchronous; disclosures, stock, status-specific notes.
  - `components/listing-actions.tsx` — Client Component; renders the actions the `status` × `canWrite`
    matrix allows and hosts the `ArchiveListingDialog`.
  - `components/archive-listing-dialog.tsx` — the AlertDialog around the archive Server Action.
  - `components/seller-nav.tsx` — the Overview · Listings sub-navigation (lives in the feature
    for now; moves to `components/layout/` when a third seller area appears).
  - `form-schema.ts` — form values ↔ API request mapping, including SEK ↔ öre; unit-tested.
  - `actions.ts` — `createListingAction`, `updateListingAction`, `publishListingAction`,
    `archiveListingAction`; each re-parses input with the shared schema, calls the data layer,
    maps 401 → sign-in, 403/404 → not-found, 409 → redirect-to-detail or banner as above,
    429/5xx → banner; success → `revalidatePath` of the seller listing routes and redirect.
  - `types.ts` — failure shapes mirroring `CreateOrganizationFailure`.
- **`data/server/seller-listings.ts`** — server-only reads: `listSellerListings(page)` over
  `GET /api/seller/listings` and `getSellerListing(id)` over `GET /api/listings/:id`, both
  validated with the shared schemas.
- **New UI primitives** (`components/ui/`): `select.tsx` (native `<select>` styled like `Input`;
  storage type and grade have three options each, so no Radix Select yet), `alert-dialog.tsx`
  (Radix `@radix-ui/react-alert-dialog`), `table.tsx` (semantic table styles). Added to the
  design-system page.
- **Reused:** `Field`, `Input`, `Textarea`, `Button`, `Badge`, `Card`, `Skeleton`,
  `FormErrorBanner`, `EmptyState`, `StaffNotice`, the deactivation banner (to be extracted from
  the seller home into the seller-organization feature's public surface).
- **Pages** — thin async shells per ADR-013: read the actor, branch (redirect / staff / render),
  fetch through `data/server/`, pass view models.

## Interaction notes

- **The write matrix is computed in one place** (`canWriteListings(actor)`: membership present,
  role owner or manager, organization active) and passed down as a boolean; components never
  inspect the actor. The backend remains the authority (ADR-011 §4).
- **Publish is a plain form POST to a Server Action**, no dialog: it is reversible in effect
  (archive) and the draft state already made the intent explicit. Archive is the only confirmed
  action.
- **No optimistic UI.** Status changes render after the backend confirms and the path is
  revalidated.
- **Condition grade copy** reuses the catalogue's words (A "Like new", B "Light wear", C "Visible
  wear") and the "cosmetic only" reminder, so sellers and buyers read the same scale.
- **Battery cycle range** is optional as a pair; entering only one bound is a field error on the
  missing one ("Enter both bounds or leave both empty").
- **Storage size and RAM** are whole GB; screen size allows one decimal.
- **Updated date and stock** on the list row are the catalogue's formatting helpers, shared via
  `lib/formatting/` (the first time two features need the same formatter, so it moves out of
  the catalogue feature).

## Accessibility requirements

- Every control through `Field` (label, hint, error via `aria-describedby`, `aria-invalid`,
  `role="alert"` on errors). Fieldsets have `legend`s.
- The list is a real `<table>` with `<th scope="col">`, a caption (visually hidden) naming the
  organization, and status badges pairing colour with the word.
- Action buttons have explicit names including the listing title where the context is not the
  heading ("Archive <title>" in the dialog's confirm button is not required; the dialog title
  carries it).
- The AlertDialog: `role="alertdialog"`, labelled by its title, described by its body, initial
  focus on Cancel, focus returns to the Archive button on close.
- On a failed submit, focus moves to the first invalid field, or to the form banner for
  form-level failures.
- One `h1` per page: "Your listings", "New listing", the listing title, "Edit <title>".
- Skeletons are `aria-hidden`; loading states announce "Loading your listings" / "Loading
  listing".
- The sub-navigation is a `<nav aria-label="Seller">` with `aria-current="page"`.

## Acceptance criteria (for this slice)

Behaviour is UC-007's and UC-008's; these cover the web surface only.

- [x] An owner or manager of an active organization can create a complete draft, see it on the
      detail page as `Draft`, edit it, publish it, and see it as `Active`. The listing then
      appears in the public catalogue.
- [x] From an `Active` listing the member opens the archive dialog, cancels (no request), then
      confirms; the listing shows `Archived`, leaves the catalogue, and stays in the seller list.
- [x] A viewer sees the list and detail pages with no write affordances; visiting `new` or
      `edit` redirects to the list.
- [x] A member of a deactivated organization sees the banner, no write affordances, and reads
      still work.
- [x] A platform admin sees the staff notice on every route; a user without an organization is
      redirected to setup; anonymous users go through sign-in with `next`.
- [x] Missing or invalid fields show field-level errors and make no request; a non-numeric or
      non-positive SEK price is a field error.
- [x] `409` on publish or archive refreshes to the real status; `409` on edit redirects to
      detail; `404`/`403` on detail render not-found; `429` and `5xx` show their banners with
      typed values preserved.
- [x] The seller home's "Publish your first listing" card is a link; the "Coming soon" badge is
      gone from it.
- [x] Tests: unit tests for the form ↔ request mapping (including SEK ↔ öre and the cycle-range
      pair rule); component tests for the table (empty, populated, past-the-end), the form
      (blank, errors, pending, pre-filled), the detail in each status × canWrite, and the
      dialog; MSW integration tests for the four Server Actions and their error mapping; a
      Playwright journey — sign up, create organization, create a draft, publish, find it in
      `/listings` by keyword, archive, confirm it left the catalogue and remains in the seller
      list as `Archived`.
- [x] Docs in the same PR: UC-007 and UC-008 Surfaces lines and index rows gain Web; UC-001's
      row narrows to buyer detail/ordering; `CHANGELOG.md`; `test/e2e/README.md`;
      `apps/web/src/features/README.md` (which still says only `auth/` exists).

## Backend findings to settle alongside (not web work)

- None required. The five routes, the role matrix, the deactivated-organization freeze, and
  the admin exclusion are implemented and covered by `listings.api.int.spec.ts` and the
  authorization-matrix test. If the web slice finds a `409` whose envelope message is not
  user-safe, fix the message in the backend rather than rewording it in the UI.

## Open questions

- **Mockup round.** Built; review at `/mocks/seller-listings` and approve the contract. Two
  judgement calls the mockups make that the contract did not: the active-listing detail offers
  "View as a buyer" (a link to the public page), and an active listing with no available units is
  flagged "not shown to buyers" in the list, since the catalogue hides it (UC-006 Q1).
- **Seller sub-navigation placement.** A horizontal tab row under the header on `/seller/*`
  (proposed) versus a left rail. The tab row degrades better without a mobile design and
  matches the catalogue's density. Decide in the mockup round.
- ~~**Public listing link from an active listing's detail.**~~ Decided: "View as a buyer" links to
  the catalogue searched for the listing's model (`/listings?q=<model>`), since brand may not be
  in the curated list. Swap to the detail URL in the buyer slice.
- **Mobile.** No mobile design exists (see `docs/design/catalogue-search.md`). The table will
  need a card fallback below `sm:`; implementer default until the product-wide mobile pass.
