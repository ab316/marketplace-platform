# Home page — direction exploration

Status: **decided (28 October 2026).** The sustainability-led direction is the home page and the
"lid" mark is the brand default. The other directions remain browsable under `/mocks` for
reference, but are no longer linked from the site chrome (header, footer, about page).

No Figma source exists for this surface yet. These mockups are the input to that conversation, not
the output of one — they exist so the direction can be argued about against something real rather
than in the abstract.

The marketplace sells **refurbished laptops only** (PD-0002), so every mockup shows laptops and
nothing else. Where a general marketplace would browse by product family, these browse by _kind of
laptop_ — MacBooks, business ultrabooks, workstations, gaming, 2-in-1s, Chromebooks.

## Why there are three URLs

The two new directions differ in **what they assume about the person who just arrived**, which is
a product decision, not a visual preference. Building both makes that decision concrete.

| URL                  | Direction          | Assumes the visitor…                                     | Reference         |
| -------------------- | ------------------ | -------------------------------------------------------- | ----------------- |
| `/mocks/marketplace` | Commerce-first     | already wants a refurbished laptop and is price-shopping | backmarket.com    |
| `/mocks/editorial`   | Sustainability-led | is not yet convinced that buying used is safe            | refurbed.se       |
| `/mocks/original`    | Original scaffold  | — kept as the reference point for the design tokens      | this repo, before |

`/` renders the sustainability-led direction, without the mock switcher — it is the storefront
now, not an exhibit. `/mocks` remains the gallery that states each argument side by side; reach it
by URL, since the chrome no longer links to it.

## What was taken from the reference sites

- **Condition grade beside the price, not in a spec list.** Both references treat grade as a
  primary purchase axis. Grades describe cosmetic condition only, and every mockup says so
  explicitly — the "does used mean broken" question is the one that blocks a first purchase.
- **The new price struck through with the saving stated.** The saving is given as a percentage and
  as the word "Save", so colour is never the only signal (REPO_MAP.md §8).
- **A trust strip, not a trust chapter**, in the commerce-first direction: returns, warranty,
  escrow, delivery as four short labels under the hero.
- **Impact figures as the hero's visual anchor** in the sustainability-led direction, standing in
  for the photography that direction would normally lead with.
- **Seller identity on every card.** This marketplace's differentiator is that sellers are
  registered organizations with a record; the references surface seller rating the same way.

## Implementation notes

- All three pages are **Server Components shipping no JavaScript**. Search fields and category
  chips are presentational only.
- Content is static and invented, in `apps/web/src/features/home-mocks/mock-data.ts`. Prices are
  SEK minor units, matching `Money` in `packages/core-domain`.
- Product photography does not exist yet. `ProductThumb` renders a tinted panel with a category
  icon, which reserves the correct space without flattering the layout with borrowed marketing
  images.
- Every mockup carries a banner stating that it is static and unwired.

## Open questions before a direction is chosen

1. Who is the majority visitor at launch — first-time sceptic or returning shopper? A mostly
   returning audience would argue against the editorial direction. (A catalog-first direction was
   built and dropped: a browse page is not a home page for this marketplace.)
2. Does the sustainability argument carry the brand, or is it a supporting claim? The
   sustainability-led direction only works if the impact numbers are real and auditable.
3. How much inventory will exist at launch? The commerce-first direction looks thin with a few
   hundred listings.

## Brand and logo

The product is called **Acme Tech**. The scaffold shipped a seven-pixel "M" in a small tile beside
the word "Marketplace", which disappeared in the header and had no favicon. Four logo directions
are built in `apps/web/src/components/brand/logo.tsx` and compared at `/mocks/brand` — each shown
as a large lockup, in a header strip, in dark mode, at 16–48 px, and on the brand colour. The
"lid" direction (the side profile of an open laptop in two shapes) is the chosen default in the
site header and the favicon (`app/icon.svg`); the others are one prop away. A catalog-first home
page direction was built and then dropped: a browse page is not a home page for this marketplace.

## When a direction is chosen

The winner graduates into a real feature module backed by `src/data/`, this spec is rewritten from
`TEMPLATE.md` against the chosen design, and `apps/web/src/features/home-mocks/` plus the
`/mocks/*` routes are deleted.
