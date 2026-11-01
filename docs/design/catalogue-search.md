# Design: Catalogue Search (buyer browse, filters, sorting)

- **Status:** draft
- **Figma:** none yet — in-repo mockups are the design input, listed in the `/mocks` gallery and browsable at `/mocks/catalog` (states: `/mocks/catalog/results`, `/mocks/catalog/filtered`, `/mocks/catalog/empty`). Desktop only; see Open questions on mobile.
- **Related use case:** `docs/product/use-cases/UC-006-buyer-searches-the-catalogue.md` (Approved 2026-10-31)
- **Related issue:** #14 (sold-out listings in the catalogue — fixed by the UC-006 API implementation)
- **Roles affected:** buyer (anonymous and signed in)

## Route & entry points

- Route: `/listings` — the buyer catalogue. Refinements live in the query string, e.g. `/listings?q=thinkpad&brand=Lenovo&priceMax=800000&grade=B&ram=16&sort=price_asc&page=2`.
- How the user arrives: a header "Browse laptops" link; shared or bookmarked links with refinements; later, listing detail pages link back to the filtered catalogue. There is no search field in the site header (decided 2026-10-31) — searching happens on this page.
- Anonymous users get the identical page (UC-006: search is not personalized; no sign-in prompt for browsing).
- The URL is the single source of refinement state (UC-006 B6). Back/forward must walk search history; `nuqs` (already a dependency) manages the params.

## User states

- **Loading:** skeleton grid of 12 cards plus a skeleton result count; the filter rail renders immediately (it is static). On refinement changes, the previous results stay visible with a subtle busy indication rather than collapsing to skeletons.
- **Empty (catalogue has no listings at all):** "No laptops for sale right now" with a short line that stock changes daily. No filter rail prominence; this is the marketplace-is-empty state, not the search-missed state.
- **Zero results (refinements active):** headline "Nothing matches your search", the active refinement chips repeated in the body, each removable, plus a "Clear all filters" button. Never a bare empty grid (UC-006 A1/A2).
- **Validation error:** field-level message on the offending control (e.g. "Max price must be at least the min price" on the price inputs); valid refinements stay applied, results for them keep showing (UC-006 E1). Unknown enum values arriving by URL are dropped from the controls and reported in a dismissible notice naming the parameter.
- **Recoverable error:** backend unreachable → full-width inline error with a Retry button; the filter rail and URL state survive, so retry re-runs the same search.
- **Unauthorized / forbidden:** not applicable — public surface. Ordering from a listing page handles sign-in, not this page.
- **Success:** result count ("34 laptops"), sort control, active-refinement chips (when any), card grid, pagination. Paging past the end shows the true total and a "Back to first page" action (UC-006 A4).

## Key components

- **Page header row** — H1 "Refurbished laptops", result count (live region), sort select (`Newest`, `Price: low to high`, `Price: high to low`).
- **Search field** — keyword input with submit; part of the same form as the filter rail.
- **Filter rail** (left on desktop, collapsible "Filters" disclosure above results on mobile; count of active filters on the toggle):
  - **Brand** — checkbox group from the curated brand list (14 entries; see Open questions); multiple = OR. The common six show at rest behind a "Show all 14 brands" disclosure, so the rail stays scannable.
  - **Price** — two number inputs (Min, Max), SEK, both optional; applied on submit, not per keystroke.
  - **Condition** — radio group "A — like new or better / B or better / C or better / Any"; copy must say grades are cosmetic and inclusive of better grades.
  - **Memory** — radio group 8 GB+ / 16 GB+ / 32 GB+ / 64 GB+ / Any.
  - **Apply** button (form submit) and "Clear all" link. No auto-apply on every click: one navigation per refinement batch keeps URLs shareable and the Server Component model simple.
- **Active refinement chips** — one chip per refinement with an × to remove just it; rendered under the header whenever any refinement is active; mirrors the URL exactly (UC-006 Outputs).
- **Listing card** — tinted spec panel (no photos yet, P2-007), title, brand + model, CPU / RAM / storage / screen line, condition grade badge, battery guarantee line, price (SEK, öre never shown), seller organization name, "In stock". Whole card is one link to the listing detail (UC-001 B2).
  - The grade badge carries the **letter only** ("Grade B"). Pairing it with the plain-language word wrapped the badge onto two lines and unbalanced every card in the grid.
- **Grade legend** — one line above the grid mapping each grade to its plain-language meaning (A "Like new", B "Light wear", C "Visible wear"), plus the reminder that grades are cosmetic only. This is what keeps the bare letter from being an unexplained code and stops colour carrying the meaning alone (REPO_MAP §8). The listing detail page still spells each grade out in full.
- **Pagination** — numbered pages with Previous/Next; current page in the URL.
- **Zero-results panel** — see user states.

## Interaction notes

- **The page is a thin async Server Component (ADR-013):** parse `searchParams` with the shared contract schema → call the data layer → render a synchronous `<CatalogueResults>` with a view model. All states above are component-testable.
- Filters submit as a plain GET form, so the page works with JavaScript disabled; `nuqs` progressively enhances chip removal and sort changes.
- Changing any refinement resets `page` to 1; changing sort preserves refinements.
- Chip removal, "Clear all", and pagination are links (GET), not buttons with handlers — shareability falls out for free.
- Result count uses `aria-live="polite"` so refinement changes are announced.
- Out-of-stock listings never render; if one is opened from a stale result, the listing detail page owns the "no longer available" message (UC-006 A3). Until bug #14 is fixed the backend may still return them; the UI must not invent a client-side workaround — the fix belongs in the query.
- Mockups deliberately render fake, non-interactive controls; they demonstrate layout, density, copy, and states, not behavior.

## Accessibility requirements

- The filter rail is a `<form>` with a visible "Filters" heading; every control has a programmatic label (use `<Field>`); the grade and memory groups are `fieldset`/`legend`.
- Chips are links/buttons labelled "Remove filter: Brand Lenovo", not bare ×.
- Grade badges pair letter + word; colour is never the only signal (REPO_MAP §8).
- Result grid is a `<ul>`; each card one `<li>` with a single link whose accessible name is the listing title.
- Focus order: search → sort → chips → filters → results. After form submit, focus moves to the result count. Pagination links have `aria-current="page"`.
- Price inputs are `inputmode="numeric"` with visible "SEK" suffix; validation errors are associated via `aria-describedby`.
- Skeletons are `aria-hidden`; the loading state announces "Loading results".

## Open questions

- **Mobile is entirely undesigned — for this surface and for the product as a whole.** No mobile layout has been considered for any page yet; the mockups are desktop-only at 1440 px, and the breakpoints in this spec (`sm:`, `lg:`) are the implementer's reasonable defaults, not a design decision. Before this page is built, decide at least: how the filter rail behaves on a narrow screen (disclosure above the grid vs. a slide-over sheet — the sheet needs a Client Component and so touches ADR-013), how many card columns each breakpoint gets, and whether the refinement chips wrap or scroll horizontally. Worth settling as a product-wide mobile pass rather than page by page, since the header, footer, and auth pages have the same gap.
- ~~Persistent header search~~ — **decided 2026-10-31: no search field in the site header for now.** The catalogue page's own keyword field is the search surface; the commerce-first home mockup's hero search is part of the home-page direction argument, not the header. Revisit only if buyers demonstrably look for search outside `/listings`.
- ~~Curated brand list contents~~ — **resolved.** The list is the common laptop manufacturers a Swedish refurbished catalogue carries: Lenovo, Dell, HP, Apple, Acer, Asus, Fujitsu, Huawei, LG, Microsoft, MSI, Razer, Samsung, Toshiba (business off-lease brands first, then alphabetical). The rail shows the first six with a "Show all 14 brands" disclosure. The list stays marketplace **configuration**, not code, and should still be sanity-checked against real seller stock before launch.
