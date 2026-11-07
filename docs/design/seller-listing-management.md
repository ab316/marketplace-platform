# Design: Seller listing management (listings list, draft editor, publish, archive)

- **Status:** approved (7 November 2026) and implemented the same day. Decisions on the former
  open questions are under [Decisions](#decisions).
- **Figma:** none; the mockup round was skipped (decision 2).
- **Related use cases:** `docs/product/use-cases/UC-005-seller-creates-listing-draft.md`,
  `UC-007-seller-edits-listing-draft.md`, `UC-008-seller-publishes-listing.md`,
  `UC-009-seller-archives-listing.md`, `UC-010-member-reviews-organization-listings.md`
  (all Approved). UC-011 (discard) is not in this slice.
- **Related spec and rules:** `docs/product/feature-specs/seller-listing-management.md` (D1–D12);
  `docs/product/business-rules-policies.md` (listing lifecycle, required listing fields,
  condition grades, brand)
- **Related decisions:** PD-0003 (roles: owner and manager write, viewer reads; staff never sell),
  ADR-011 (cookie session, Server Actions), ADR-013 (thin async pages)
- **Roles affected:** seller (owner, manager, viewer). Buyers and platform admins appear only in
  what they must _not_ see.

## Why this slice

The backend half of seller listing management is built: drafts save with any subset of fields
and report their readiness (P1-012), publishing lists every gap at once, and archiving leaves
open orders alone. Nothing in the web app reaches any of it. The `/seller` home's "Publish your
first listing" card still says "Coming soon". This slice lets a seller go from an empty
organization to a live listing in the browser. That is the first half of the Phase 6 demo:
"a seller signs up, creates an organization, publishes a listing".

## Route & entry points

Every route lives inside the existing `app/(seller)/` group, under the protected `/seller`
prefix (no `proxy.ts` change).

| Route                          | Purpose                                                                                                             | Use cases              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `/seller/listings`             | The organization's listings, every status, newest first. `?page=N`                                                  | UC-010                 |
| `/seller/listings/new`         | An empty draft form. Nothing is created until the first save                                                        | UC-005                 |
| `/seller/listings/[listingId]` | One listing. A draft opens in the editor; an active or archived listing opens read-only, with its stock and actions | UC-007, UC-008, UC-009 |

- **One URL per listing.** The page branches on status and role, so there is no separate
  `/edit` route to keep in sync. When a draft is published, the same URL simply renders the live
  listing.
- **"New listing" does not create anything on click.** Creating an empty draft on click would
  leave a junk draft behind every abandoned visit, and drafts cannot be discarded yet (P1-018).
  The draft is created by the first **Save draft**, which then redirects to
  `/seller/listings/[id]`.
- **How the user arrives:**
  - The seller home's "Publish your first listing" card becomes a **"Your listings"** link to
    `/seller/listings`. The "Add your team" card stays "Coming soon".
  - A **seller sub-navigation**, "Overview · Listings", appears on every `/seller` page through a
    new `app/(seller)/seller/layout.tsx`. This is the first time the seller area has more than
    one page, which is the case REPO_MAP §4 reserves nested layouts for. The members slice will
    add "Team".
  - The header's organization-name link still goes to `/seller` (unchanged).
- **A listing of another organization** (by pasted URL) renders the route's `not-found`. The
  seller area only ever shows the member's own organization; buyers see public listings
  elsewhere.

## User states

### Shared by every route

- **Anonymous:** `proxy.ts` sends them to sign-in with `next` preserved (as today).
- **Signed in, no organization:** redirected to `/seller/setup`.
- **Platform admin:** the existing `StaffNotice` ("Marketplace staff accounts don't sell on Acme
  Tech"). No list, no form (UC-003 E7).
- **Organization deactivated:** the existing deactivation banner sits above the content. Every
  write affordance is **absent**, not disabled (the rule from the setup slice), but reads still
  work (UC-010 A2).
- **Viewer:** reads everything; no "New listing", no editor, no publish or archive. A viewer who
  opens `/seller/listings/new` is redirected to `/seller/listings`.

### `/seller/listings` (UC-010)

- **Loading:** `loading.tsx` with a skeleton table of 5 rows; the page heading renders.
- **Empty, owner or manager:** "No listings yet", one line ("Start a draft. You can save it
  half-finished and publish when every detail is in."), and a primary **New listing** button.
- **Empty, viewer:** "No listings yet. Owners and managers of your organization create
  listings." No button.
- **Success:** heading "Listings" with the total ("12 listings"), **New listing** (owner/manager,
  active organization), the table (see Key components), pagination.
- **Past the last page** (stale link): an empty table body with "There's nothing on this page",
  the true total, and a link back to page 1 (UC-010 A3).
- **Recoverable failure:** the route's `error.tsx` with **Try again**; the header and sub-nav
  still render.

### `/seller/listings/new` and a draft on `/seller/listings/[listingId]` (UC-005, UC-007, UC-008)

- **Default (new):** the empty editor and heading "New listing". The readiness panel reads "Not
  saved yet" and asks for a first save: it only ever shows the server's answer, so the form never
  restates the publish bar (changed during implementation; the earlier draft listed all 15 fields
  here, which would have duplicated the backend rule).
- **Default (existing draft):** the editor filled with saved values. Heading is the title, or
  "Untitled draft".
- **Client validation error:** well-formedness only, on blur and on save: a value that is present
  but invalid, such as price 0, battery health 120, or a cycle minimum above the maximum. Errors
  sit on their fields and **no request is made**. An empty field is never an error here.
- **Server validation error** (`400 VALIDATION_FAILED` / `INVALID_LISTING_DATA`): each
  `details.issues[].path` is mapped onto its field (the form uses the request paths as field
  names; see Interaction notes). Focus moves to the first invalid field.
- **Pending save:** the Save button reads "Saving…", inputs are disabled while the save runs to protect edits from a late response, and a second save is
  blocked until the first answers.
- **Saved:** a status line beside the button, "Saved at 14:32" (`aria-live="polite"`). The
  readiness panel updates from the server's answer. After the **first** save of a new draft, the
  page redirects to `/seller/listings/[id]` and shows the same status line.
- **Unsaved changes:** "Unsaved changes" replaces the saved status, and leaving the page asks for
  confirmation (browser `beforeunload`, plus a guard on in-app links).
- **Edited by someone else first** (`409 LISTING_STATE_CONFLICT`: another member published it):
  banner "This listing was published by another member, so it can no longer be edited." with a
  **View listing** button that reloads the page. Typed values are kept until then.
- **Simultaneous save** (`409 LISTING_CONCURRENCY_CONFLICT`): banner "Someone saved this draft at
  the same moment. Save again to keep your changes." Values kept (spec D11).
- **No longer allowed** (`403`: role lowered or organization deactivated mid-edit): banner "You
  can no longer change this listing." and the page reloads into its read-only state.
- **Rate limited (429) / recoverable failure (5xx, unreachable):** the same banners and copy as
  the existing forms. Values are kept.
- **Draft opened by a viewer, or in a deactivated organization:** the read-only details panel
  (same component as published listings), with "Not entered" for empty fields, and the readiness
  panel without the Publish button.

### Publishing (UC-008)

- **Not ready:** the readiness panel heading reads "5 details missing". **Publish** is shown but
  disabled, with a visible reason under it ("Complete the details above to publish."), not a
  tooltip.
- **Ready, unsaved changes:** Publish is disabled with "Save your changes before publishing."
  Readiness always reflects the last save, so publishing never sends something the seller has
  not seen validated.
- **Ready and saved:** Publish is enabled and opens the confirmation dialog (Key components).
- **Pending:** the dialog's confirm button reads "Publishing…" and both buttons are disabled.
- **Success:** the page re-renders as the active listing, with a success banner "Your listing is
  live. Buyers can find it in the catalogue." and a link to `/listings`. (The buyer listing
  detail page does not exist yet, issue #15; when it ships, this links to the listing itself.)
- **Refused as incomplete** (`400 LISTING_INCOMPLETE`, stale page): the dialog closes, the
  readiness panel is replaced by the server's issue list, and a banner says "Some details are
  missing or invalid." Nothing is lost.
- **Already published or archived** (`409`): the page reloads into the listing's real state with
  a notice "This listing was already published."

### An active or archived listing on `/seller/listings/[listingId]` (UC-009, UC-010)

- **Default:** heading (title), status badge, publication date (and archive date), the stock
  block, and the read-only details panel, all as buyers see them.
- **Active, owner or manager, active organization:** an **Archive listing** button (secondary,
  not destructive red: archiving is final but harms nothing).
- **Active with no units available:** a callout "Not in the catalogue: every unit is reserved by
  unpaid orders" or "…: sold out" (UC-010 step 4).
- **Archive pending / success:** the dialog's confirm reads "Archiving…"; on success the page
  re-renders archived with "Listing archived. It no longer takes orders; open orders continue."
- **Archive refused** (`409`, already archived): reload with "This listing was already archived."
- **Archived:** no actions. A line explains that archiving is final and that the stock numbers
  still move as open orders finish.

## Key components

New feature module **`features/seller-listings/`** (public surface through `index.ts`):

- **`components/listings-table.tsx`** — synchronous. A `<table>` with a visually hidden caption
  (REPO_MAP §8: tables for comparison-heavy views). Columns:
  - **Listing** — the title as a link to `/seller/listings/[id]` ("Untitled draft" in muted
    italics when there is none), with brand and model on a second line.
  - **Status** — badge with the word, never colour alone: `Draft` (outline), `Active` (success),
    `Archived` (neutral).
  - **Price** — "7 990 kr", or "—" for a draft without one.
  - **Stock** — for active and archived listings, "2 available · 1 reserved · 1 sold" (of 4).
    For drafts this column shows readiness instead: "Ready to publish" (success text with a
    check icon) or "5 details missing" (muted).
  - **Date** — "Published 3 Nov" / "Archived 5 Nov" / "Created 7 Nov".
  - An active row with nothing available carries a small "Not in catalogue" badge beside its
    status.
- **`components/listing-editor.tsx`** — Client Component; React Hook Form over a feature-local
  schema derived from the shared contract (`schemas/listing-form.schema.ts`). The Server Action
  arrives as a prop so the editor is component-testable, the same pattern as
  `create-organization-form.tsx`. Two columns on wide screens: the form on the left, the sticky
  readiness panel on the right. The form has five `fieldset`s in the business-rules order:
  1. **Basics** — Title (`Input`); Description (`Textarea`, hint "What a buyer needs to know:
     condition story, what's included, why it's a good buy.").
  2. **Specifications** — Brand (a native `<select>` over the curated list, with a hint
     "Brand not listed? Contact support." linking to `/contact`; see Open questions); Model;
     CPU; RAM (number, "GB" suffix); Storage type (select: SSD, NVMe, HDD) and Storage
     (number, "GB" suffix) on one row; Screen size (number, step 0.1, "inches" suffix).
  3. **Condition** — Grade as a radio group of three cards, each with its name and the
     business-rules definition (A Like new, B Light wear, C Visible wear), plus the line "Grade is
     the minimum every unit meets, and describes looks only. Disclose faults under Known
     defects."; Battery health floor (number, "%" suffix, hint "Every unit has at least this
     battery health."); Battery cycle range, optional (two numbers, "Min" and "Max"); Known
     defects (`Textarea`, hint "Write "none" if there are none.").
  4. **Price and stock** — Price (kronor with up to two decimal places, "kr" suffix; exact minor units are represented as decimal kronor);
     Quantity (number, "units").
  5. **Fulfillment** — Fulfillment expectations (`Textarea`, hint "What happens after payment,
     and roughly when, e.g. "Shipped from Gothenburg within 2 business days."").
     Below the form is a sticky save bar: **Save draft** and the save status.
- **`components/readiness-panel.tsx`** — synchronous. Heading "Ready to publish" or "N details
  missing"; the issue list as links ("Battery health floor: Required to publish.") whose
  `href="#<field id>"` moves focus to that field; "Reflects your last save." in small text; the
  Publish button and its reason line.
- **`components/listing-details-panel.tsx`** — synchronous, read-only. Every disclosure in the
  same five groups, as buyers will read it. Grade is spelled out in full ("Grade B — Light
  wear"), and "Not entered" is shown for an empty draft field. Used for published listings and
  for read-only drafts.
- **`components/stock-summary.tsx`** — available, reserved, sold, total as four labelled figures,
  plus the "not in catalogue" callout.
- **`components/confirm-dialog.tsx`** — the publish and archive confirmations over a new
  `components/ui/alert-dialog.tsx` primitive (see Open questions).
  - **Publish:** title "Publish this listing?"; body "Buyers can find and order it straight away.
    After publishing, its details can't be changed. To change something, you'd archive it and
    publish a new listing."; buttons **Publish** / **Keep editing**.
  - **Archive:** title "Archive this listing?"; body "It leaves the catalogue and takes no new
    orders. Orders already placed continue as normal. Archiving can't be undone."; buttons
    **Archive** / **Cancel**.
- **`actions.ts`** — Server Actions, each re-parsing input with the shared contract schema:
  - `createListingDraftAction`: `POST /api/listings`, then `redirect` to the new listing.
  - `saveListingDraftAction`: `PATCH`; returns the fresh draft, so readiness updates without a
    reload.
  - `publishListingAction`, `archiveListingAction`: `POST …/publish` and `POST …/archive`; these
    `revalidatePath` the listing and the list.
  - Error mapping follows User states; failures are returned, never thrown, as in the existing
    actions.
- **`schemas/listing-form.schema.ts`** — the form's values (kronor rather than öre, strings for
  empty inputs) and the mapping to `UpdateListingRequest`: every field is always sent, empty
  becomes `null`, kronor × 100 becomes `priceMinor`.
- **`types.ts`** — view models (`SellerListingRow`, `ListingDetailsView`) and the action failure
  shape.
- **Data layer `data/server/seller-listings.ts`** — server-only reads, validated with the shared
  schemas: `listSellerListings(page)` → `GET /api/seller/listings` (`sellerListingListResponseSchema`);
  `getSellerListing(id)` → `GET /api/listings/:id` (`sellerListingSchema`). It calls `notFound()`
  when the listing's `organizationId` is not the actor's.
- **Pages** (`app/(seller)/seller/listings/page.tsx`, `.../new/page.tsx`,
  `.../[listingId]/page.tsx`) — thin async shells per ADR-013: read the actor, branch (redirect /
  staff notice / not found / render), and pass view models. Each has a `loading.tsx`; the
  `[listingId]` route has a `not-found.tsx`.
- **Shared grade copy:** the grade names and definitions move from `features/catalogue`
  (`GRADE_WORD`) to one shared module, so the seller form and the buyer pages cannot drift apart.
  The business rules are the source of the words.
- **Reused primitives:** `Field`, `Input`, `Textarea`, `Button`, `Badge`, `Card`, `Skeleton`,
  `EmptyState`, `FormErrorBanner`, `Container`. New: `alert-dialog`, and a small `InputSuffix`
  addition to `Field`/`Input` for units (GB, %, kr) if `Input` cannot already carry one.

## Interaction notes

- **The form's field names are the request paths** (`title`, `specifications.brand`,
  `condition.guarantees.batteryHealthMinPercent`, …), which React Hook Form supports natively.
  Server issues therefore land on their fields without a mapping table. The one exception is
  price: the field is `priceKronor`, and `priceMinor` issues map onto it.
- **Every save sends the whole form**, with empty fields as `null`. What the seller sees is
  exactly what is stored, and merge-patch semantics never surprise anyone. Last save wins (spec
  D11); optimistic locking is a later follow-up.
- **Client validation never blocks saving an incomplete draft.** It only refuses values that the
  backend would also refuse. Completeness lives in the readiness panel, which shows the server's
  answer only, so the form never duplicates the publish bar (REPO_MAP §6).
- **No autosave.** An explicit **Save draft** keeps the server-action flow simple and the
  "Saved at" feedback honest. Autosave can come later if sellers lose work.
- **Brand select and existing off-list values:** a draft whose stored brand is not on the curated
  list (pre-release test data, spec D12) shows that value as a disabled, selected option marked
  "(not on the list)", plus a field error, until the seller picks a listed brand.
- **Mutations are POSTs via Server Actions,** never GETs (SameSite=Lax posture, ADR-011).
- **No optimistic UI.** Status changes render only after the backend confirms.
- **Pagination on the list is links** (`?page=`), as in the catalogue. No filters or search
  (P2-022).
- **Mobile:** the editor collapses to one column, with the readiness panel above the form as a
  collapsible summary ("5 details missing") and the save bar sticky at the bottom. The table
  becomes a stacked list below `md`. These are implementer defaults pending the product-wide
  mobile pass (see Open questions in `docs/design/catalogue-search.md`).

## Accessibility requirements

- Each form section is a `fieldset` with a visible `legend`; the grade options are a real radio
  group whose definitions are part of each option's accessible description.
- Every control goes through `Field`: programmatic label, hint and error via
  `aria-describedby`, `aria-invalid`, and `role="alert"` on error text. Units are visible text,
  not placeholders.
- Number inputs use `inputmode="numeric"` (`decimal` for screen size and price). Price accepts up to two decimal places.
- Readiness issue links move focus to their field; the panel heading is a live region, so "Ready
  to publish" is announced after the save that completes a draft.
- Save status uses `aria-live="polite"`; banners use `role="alert"`. After a failed save, focus
  moves to the first invalid field, or to the banner for form-level failures.
- Dialogs trap focus, return focus to the button that opened them, close on Esc, and put initial
  focus on the **safe** button (Keep editing / Cancel).
- The listings table has a caption, column headers with `scope="col"`, and status badges that pair
  word and colour. Each row has a single link, whose accessible name is the title.
- One `h1` per page: "Listings", "New listing", or the listing title ("Untitled draft").
- Skeletons are `aria-hidden`; loading states announce "Loading listings" / "Loading listing".

## Acceptance criteria (for this slice)

Behaviour is the use cases'; these criteria cover the web surface.

- [x] An owner or manager can open "Your listings" from the seller home, start a new listing,
      save it with only a title, leave, and find it in the list as a draft with "14 details
      missing".
- [x] Reopening the draft shows the saved values. Completing it across saves, clearing a field
      included, updates the readiness panel after each save, and issue links focus their field.
- [x] A malformed value shows a field error and makes no request. A server issue lands on its
      field.
- [x] Publish is enabled only for a ready, saved draft. Confirming makes it active at the same
      URL with the success banner, and it appears in the `/listings` catalogue.
- [x] A `LISTING_INCOMPLETE` answer replaces the readiness panel with the server's issues and
      loses nothing.
- [x] An active listing shows its stock. Archiving it through the dialog leaves it archived,
      removes it from the catalogue, and keeps it in the seller's list.
- [x] A viewer sees the list and every listing read-only, with no write affordance anywhere. A
      deactivated organization's members see the banner and no write affordance. A platform admin
      sees the staff notice on every route.
- [x] Another organization's listing URL renders not-found.
- [x] Tests:
  - component tests for the table (each status, stock, readiness, empty states, viewer), the
    editor (validation, unsaved state, server issue mapping), the readiness panel, the details
    panel, and both dialogs;
  - MSW integration tests for each Server Action (request body shape with `null`s and
    `priceMinor`, each error mapping, the create redirect);
  - one Playwright journey: sign up → create organization → new listing → partial save → return
    → complete → publish → visible in the catalogue → archive → gone from the catalogue.
- [x] Docs in the same PR(s): each use case's "current behavior" note and its index row gain the
      Web surface; `CHANGELOG.md`; `test/e2e/README.md` lists the journey; the seller home design
      contract notes the card became a link.

## Delivery

Built as one change rather than the two PRs first proposed: the list, editor, publish, and archive
landed together with the P1-017 backend change and the Playwright journey.

## Backend findings settled alongside (not web work)

- **Brand from the curated list (P1-017)** landed before the web surface, as recommended: the write
  contract accepts only the curated values, publishing refuses an off-list brand, and a one-pass
  migration maps brands that differ only in capitalization (spec D12).
- **The seller list has no "updated" ordering or status filter.** That is fine for this slice
  (UC-010 orders by creation; P2-022 covers filtering). Recorded so nobody adds it quietly.

## Decisions

Decided by the founder on 7 November 2026, together with the approval of this contract.

1. **P1-017 lands first.** It was a small change: a domain check, a contract enum, and a one-pass
   migration.
2. **No mockup round.** Built straight from this contract.
3. **shadcn `AlertDialog`** (`@radix-ui/react-alert-dialog`), consistent with ADR-010 and reusable
   for later confirmations.
4. **Price in kronor with up to two decimal places.** The API keeps öre; preserve them exactly to avoid changing prices during unrelated edits.

## Open questions

- **Mobile** remains the product-wide open question (`docs/design/catalogue-search.md`). The
  defaults above are placeholders, not design decisions.

Review correction: preserve exact minor-unit prices when loading and saving API-created drafts. The price input accepts up to two decimal places, including comma decimals.
