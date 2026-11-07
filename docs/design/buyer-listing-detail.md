# Design: Buyer listing detail

- **Status:** draft (7 November 2026) — the design input for the Phase 6 slice that closes [#15](https://github.com/ab316/marketplace-platform/issues/15).
- **Figma:** none; no mockup round is planned for this page (the catalogue and seller slices set the pattern of designing in the repo). If one happens, link the frame here.
- **Related use case:** `docs/product/use-cases/UC-012-buyer-views-listing-details.md` (Approved)
- **Related spec and rules:** `docs/product/feature-specs/buyer-ordering.md` (D1, D2, D4, D5);
  `docs/product/business-rules-policies.md` (required listing fields, condition grades, seller
  identity visible to buyers)
- **Related decisions:** ADR-011 (cookie session, the Next.js BFF boundary), ADR-013 (thin async
  pages), PD-0004 (no money moves before payment)
- **Roles affected:** buyer (anonymous and signed in). Seller members and platform admins appear
  only as viewers who are refused the order action.

## Why this slice

The catalogue is a dead end: cards are non-interactive list items and `/listings/[id]` does not
exist, so a buyer can find a laptop and then do nothing with it. The backend has served the full
listing detail since Phase 1. This page is the buyer's half of the Phase 6 demo and the entry
point every later buyer surface hangs off.

Ordering is **not** in this slice. The page reserves the place where the order action goes and
renders its disabled and signed-out shapes, so the next slice adds behavior, not layout.

## Route & entry points

| Route                   | Purpose                                                   | Use case |
| ----------------------- | --------------------------------------------------------- | -------- |
| `/listings/[listingId]` | One published listing, everything a buyer needs to decide | UC-012   |

- **Public.** No `proxy.ts` change: the page renders for anonymous visitors exactly as it does for
  signed-in ones, apart from the order action (below).
- **Arrived at from:** a catalogue result (the whole card becomes the link), a shared or bookmarked
  link, the seller's publish success notice (UC-008's gap closes with this page), and later from an
  order.
- **Back to the catalogue.** The page keeps the buyer's search: the catalogue card links carry the
  current query string, and the page renders a "Back to results" link that restores it. With no
  such context — a cold link — the link reads "Browse all laptops" and goes to `/listings`.

## User states

- **Loading:** a skeleton of the page's real shape (title block, spec panel, price/action card),
  `aria-hidden`, announcing "Loading listing". The page is a thin async Server Component, so this
  is `loading.tsx`.
- **Success — available:** the full listing, an "In stock" badge, and the order action. No unit
  count (spec open question).
- **Sold out:** the full listing, the availability badge replaced by a prominent **"Currently
  unavailable"** notice explaining that every unit is reserved or sold and that units can return if
  a reservation lapses. No order action; the catalogue link is the way on (UC-012 A1).
- **Archived:** the full listing with a prominent **"No longer sold"** notice. No order action
  (UC-012 A2). Price and disclosures stay visible — this page is what an old order links to.
- **Not found:** one page for an unknown id, a draft, and a deactivated seller's listing — "This
  listing is not available" plus a link to the catalogue. Never leaks which of the three it was
  (UC-012 A5/E1). This is `not-found.tsx`.
- **Recoverable error:** the backend is unreachable or errors — a full-width inline error with a
  Retry action, distinct in wording from "not available" (UC-012 E2). This is `error.tsx`.
- **Signed out:** identical page; the order action reads "Sign in to order" and links to
  `/sign-in?next=/listings/<id>` (spec D5).
- **Cannot order (own organization):** the action area reads "This is your organization's listing",
  with a link to it in `/seller/listings`.
- **Cannot order (platform admin):** the action area reads that marketplace staff do not place
  orders — the same tone as the existing seller-area staff notice.
- **Empty:** not applicable; a listing is never empty. Optional fields that are absent (the battery
  cycle range) are omitted rather than shown blank.

## Key components

Two columns on desktop: the disclosures on the left, a sticky purchase card on the right. One
column on narrow screens, purchase card first after the title (see Open questions on mobile).

- **Title block** — H1 with the listing title, the brand and model beneath it, and the condition
  grade badge. The badge carries the letter plus its word ("Grade B · Light wear"); the catalogue's
  letter-only badge exists because cards are narrow, and this page has room to spell it out.
- **Purchase card** (the right column) — price in SEK (never öre), the availability badge or the
  unavailable notice, the order action, and one line of reassurance that no money moves until the
  buyer pays and that an order holds the unit for 24 hours. This card is the whole commitment
  surface; everything the buyer agrees to is inside it.
- **Specifications panel** — CPU, memory, storage (type and capacity), screen size, as a
  definition list, not prose. Same tinted panel the catalogue card uses, so the two read as one
  product.
- **Condition section** — the grade with the full definition from the business rules, the
  guaranteed battery health floor, the battery cycle range when present, and **known defects given
  their own block**. Defects are the disclosure a buyer is most likely to miss and most likely to
  dispute: never collapsed, never truncated, never below the fold on desktop.
- **Description** — the seller's own text, preserving paragraph breaks.
- **Fulfillment section** — the seller's fulfillment expectations, framed as "What happens after
  you pay".
- **Seller section** — the selling organization's name under a "Sold by" heading. Built as a
  distinct block, not a line of small print, because trust signals, contact details, and a link to
  a seller profile are expected here later (spec D1, P2-005). With only a name in it today it still
  gets its own heading.
- **Back to results link** — above the title.

## Interaction notes

- **Thin async page (ADR-013):** `page.tsx` resolves the id, calls a new server data-layer function
  for the listing, and renders a synchronous `<ListingDetailView>` with a view model. Every state
  above is then component-testable in Vitest; Playwright covers only the real-stack path.
- **The order action is a link or a button, never both.** Signed out → a link to sign-in. Eligible
  buyer → the button that opens the confirmation step (next slice; in this slice it may ship
  disabled with "Ordering arrives in the next slice" rather than a fake flow — decide at
  implementation, but do not ship a button that silently does nothing).
- **Availability is read at render time** and is stale the moment it is sent. The page never
  polls, and never implies a reservation. The order attempt is the only source of truth, and its
  refusal is handled by the ordering slice (UC-001 A3/A4).
- **Grade wording comes from one place** shared with the catalogue's legend and the seller editor's
  grade cards, so buyer and seller read identical words.
- **Prices** use the existing SEK formatter; no new money formatting.
- **Metadata:** the page sets its own `<title>` and description from the listing, since these links
  are meant to be shared.

## Accessibility requirements

- The catalogue card becomes **one** link whose accessible name is the listing title; the card's
  other text is not separately focusable (issue #15's first criterion).
- One H1 (the title); the sections are H2s in reading order: specifications, condition,
  description, fulfillment, sold by.
- Specifications and guarantees are `<dl>` pairs, not table-shaped divs.
- The grade badge never relies on colour alone — the letter and the word are both present, and the
  full definition is in the condition section (REPO_MAP §8).
- The unavailable and archived notices are the page's first announced content after the title, not
  a visual treatment of the price; they are in the accessibility tree before the action area.
- Focus order: back link → title → purchase card (price, action) → disclosures. The action is
  reachable without passing the whole description.
- The retry action in the error state is a real button with a clear label.
- Skeletons are `aria-hidden`; the loading state announces itself once.

## Open questions

- **Mobile**, as everywhere else in the product: the single-column order, whether the purchase card
  sticks to the bottom of the viewport, and where the defects block lands relative to the fold.
  Part of the product-wide mobile pass (see `catalogue-search.md`).
- **Does the page show how many units are left?** UC-012 says availability, not a count; revisit if
  scarcity turns out to drive conversion.
- **Does the seller section link anywhere yet?** No, until a public seller profile exists
  (spec follow-up idea). The heading is designed to survive that becoming a link.
