# Feature Spec: Buyer Discovery — Inspecting a Listing

## Status

**Approved — 2026-11-07.** Shaped for the Phase 6 deliverable "Buyer listing detail" ([roadmap](../roadmap.md)) and settled as [UC-012](../use-cases/UC-012-buyer-views-listing-details.md), with the design contract [`buyer-listing-detail.md`](../../design/buyer-listing-detail.md). Closes [#15](https://github.com/ab316/marketplace-platform/issues/15).

**Split out of the [buyer ordering spec](buyer-ordering.md) on 2026-11-07**, where this behavior was first shaped. Discovery is its own area of the product and will keep growing — a public seller profile, saved listings, photos, recommendations, better match quality — while ordering is one commitment step. Decisions keep the numbers they were settled with (D1 and D4 here; D2, D3, D5–D8 in the ordering spec), so existing references stay valid.

Where discovery already is: the catalogue itself is [`catalogue-search.md`](catalogue-search.md) (UC-006) — keyword, filters, sorting, and what appears. This spec picks up where a result is opened.

## Summary

A buyer who found a laptop needs to decide whether to buy it, from a page rather than a card. This feature is the listing's own page: every disclosure the seller had to publish, the price, who is selling it, and whether it can be ordered at all — readable by anyone, signed in or not, with the order action handed to the [ordering spec](buyer-ordering.md).

`GET /api/listings/:listingId` has existed since Phase 1. Nothing in the web app reached it, and catalogue cards were not even links.

## Problem

Discovery ends in a dead end. A buyer can search the catalogue (UC-006) and then stop: result cards are non-interactive list items, there is no `/listings/[id]` route, and the card cannot carry everything that matters — the full condition disclosure, the known defects, the fulfillment promise ([#15](https://github.com/ab316/marketplace-platform/issues/15)).

Two gaps in settled behavior surfaced while shaping:

- **The buyer could not see who is selling.** [UC-001](../use-cases/UC-001-buyer-places-an-order.md) B2 requires the seller organization on the listing detail, and the [catalogue design](../../design/catalogue-search.md) puts its name on every card. Neither carried anything but an organization id, and the organization profile is readable only by its own members and operators. Shipped on the API and the catalogue card on 2026-11-07 (P1-020).
- **A listing that can no longer be ordered had no defined behavior.** Sold out, archived, draft, deactivated seller — all of them reachable from a stale search result or an old link, none of them specified. Settled as D4.

Current workaround: none in the browser.

## Target users

- **Buyer, anonymous** — reads everything and is asked for nothing. Discovery is public; the sign-in wall belongs to ordering.
- **Buyer, signed in** — the same page, plus the action to order it.
- **Seller organization member** — indirectly: their disclosures and their organization's name are what the buyer judges. A member opening their own organization's listing sees why they cannot order it.
- **Marketplace operator** — not a user of this feature.

## Goals

- Everything the publish bar demands is readable on one page, in buyer language.
- The buyer knows who they would be buying from before they commit to anything.
- A listing that cannot be ordered says so plainly instead of disappearing, erroring, or offering a dead action.
- A detour into a listing never costs the buyer their search.

## Non-goals

- **Ordering, the order page, and cancellation** — the [buyer ordering spec](buyer-ordering.md). This page renders the order action; what it does is settled there.
- **Catalogue search itself** — [`catalogue-search.md`](catalogue-search.md) (UC-006); refinement counts (P1-015) and match quality (P1-016) stay unscheduled there.
- **A public seller profile page.** Buyers see the seller's name where it matters. The page is a follow-up; trust statistics are P2-005.
- **Photos** (P2-007), **saved listings** (P2-004), **reviews and ratings** (P2-008), **recommendations** (P3-011) — all of them land in this area eventually, none of them now.
- **Asking to be told when a sold-out listing is back** — needs notifications (P1-007) and restocking (P1-011).

## User journey

```text
Buyer opens a result from the catalogue, a shared link, or a bookmark
→ reads the specification, the condition and its defects, the price, and the fulfillment promise
→ sees who is selling it
→ sees whether it can be ordered, and either orders it (ordering spec) or learns why not
→ returns to their search with it intact
```

## Main flow

1. The buyer opens a listing. No sign-in is required, and nothing about them is recorded.
2. The page shows what the laptop is, what condition it is guaranteed to be in, what it costs, what the seller promises after payment, and who the seller is.
3. The page shows whether the listing can be ordered, and offers the next step that fits this viewer: order it, sign in first, or the reason there is no action.
4. The buyer returns to the catalogue with their refinements intact, or continues into [UC-001](../use-cases/UC-001-buyer-places-an-order.md).

## Edge cases

- **Sold out** — every unit reserved or sold. The page renders in full, says the listing is currently unavailable, and explains that units can return if a reservation lapses.
- **Archived** — the page renders in full, marked no longer sold. Old orders and shared links keep resolving to what was promised.
- **Draft, deactivated seller, or unknown id** — not available, indistinguishably, so nothing leaks about what exists.
- **A member of the selling organization, or a platform admin, opens it** — the page explains why they cannot order instead of offering a dead button (ordering spec D3).
- **The listing sells out while the buyer reads** — the page is already stale when it is sent; the order attempt is the only source of truth, and its refusal belongs to UC-001 A3/A4.
- **The data cannot be loaded** — a retryable error, never shown as "not available".
- **A listing whose selling organization cannot be resolved** — not available, and left out of the catalogue. Organizations are never deleted (PD-0003), so this is broken data, not a seller that went away.

## States and status changes

None. This feature only reads: opening a listing never reserves stock, never holds anything, and never changes any status.

## Permissions

| Action                                 | Allowed users                                                          |
| -------------------------------------- | ---------------------------------------------------------------------- |
| View a published listing's detail      | Anyone, including anonymous visitors                                   |
| View a draft listing                   | Members of the owning organization and operators (unchanged, UC-005)   |
| View a listing of a deactivated seller | Members of that organization and operators only (unchanged, UC-003 E6) |
| See the selling organization's name    | Anyone who can see the listing                                         |

## Timeline entries

None. Listings have no timeline, and viewing one records nothing.

## Notifications

None.

## Business rules

Recorded in [`business-rules-policies.md`](../business-rules-policies.md) under "seller identity visible to buyers". In short: a buyer sees the selling organization's name wherever they judge or commit to a purchase; only the name is public; an order shows the seller's current name, because the snapshot preserves the offer, not the counterparty's identity.

## Acceptance criteria

All met on 2026-11-07, except the order action itself, which belongs to the [ordering slice](buyer-ordering.md): where it goes, the page says ordering opens with the next release.

- [x] Every catalogue result is one keyboard-accessible link whose accessible name is the listing title; it opens `/listings/<id>`.
- [x] The detail page shows every required disclosure, the condition grade spelled out in words, the price in SEK, the fulfillment expectations, and the selling organization's name.
- [x] The page works signed out and signed in, and renders loading, not-found, recoverable-error, sold-out, and archived states.
- [x] A sold-out or archived listing is readable, says so prominently, and offers no order action.
- [x] A draft, a deactivated seller's listing, and an unknown id are all "not found" to a buyer.
- [x] The buyer can return to the catalogue with their refinements intact.
- [x] Opening a listing never reserves stock and never changes any state.
- [x] The seller's name reaches the catalogue card and the listing detail through the shared API contracts (P1-020, shipped 2026-11-07).

## Success metrics

- **Detail views**, and the share of them that are sold-out or archived listings — a rising share means the catalogue is serving stale results.
- **Detail-to-order rate** once ordering ships. No baseline exists; this is the first time the funnel can be measured at all.

## Product risks

- **The seller's name is buyer-visible content the seller can change at any time** through the organization profile (UC-003). Accepted: operators keep the audit trail, and the order snapshot protects the offer rather than the identity.
- **A page is stale the moment it is sent.** Availability shown here is never a reservation; the product must not let the page imply otherwise, and must never invent a client-side stock check.
- **Discovery is where this product earns trust, and it is one page with no photos.** P2-007 and the trust profile (P2-005) matter more here than anywhere else; this spec deliberately ships without them and should be revisited once buyers use it.

## Decisions

Settled by the founder on 2026-11-07, together with the ordering decisions; numbers are kept from that round.

- **D1 — The buyer sees who is selling.** Listing responses carry a small seller summary (organization id and name), which puts the name on the catalogue card and the listing detail; the order response carries the same, so the order page can show it. The detail page's seller section is built to grow: contact details, response time, completed orders and other trust signals are expected there later ([P2-005](../product-backlog.md)), and a public seller profile page may follow. Only the name is exposed now — nothing a seller has not already agreed is public. A **backend change**, recorded as a Phase 6 exception and tracked as **P1-020**; the listing half shipped on 2026-11-07, the order half ships with the ordering slice.
- **D4 — A listing that cannot be ordered still opens, and says why.** Sold out → the page renders in full, marked "Currently unavailable", with the reason that units may return if a reservation lapses. Archived → the page renders in full, marked "No longer sold", so links from old orders and shared links keep working. Draft, deactivated seller, or unknown id → not found, which is what the API already does. [UC-006](../use-cases/UC-006-buyer-searches-the-catalogue.md) A3 was amended to match: it previously promised a page for a deactivated seller's listing.

## Open questions

- **Mobile.** Unresolved for the product as a whole, not for this surface in particular — see the open question in [`catalogue-search.md`](../../design/catalogue-search.md). The listing detail page uses the implementer's breakpoints until the product-wide mobile pass happens.
- **Does the buyer need the exact number of units left?** UC-001 B2 says "in stock" is enough and exact counts are optional. The first version shows availability, not a count. Revisit if buyers ask, or if scarcity turns out to matter for conversion.

## Follow-up ideas

What this area is expected to grow, roughly in the order it is likely to matter:

- **A public seller profile page** (`/sellers/<id>`): name, what they sell, and over time the trust signals from P2-005. The listing detail's seller section becomes a link to it.
- **Photos** (P2-007) — the single biggest gap between this page and a credible refurbished-laptop listing.
- **Saved listings** (P2-004) and **"notify me when it is back"** for a sold-out listing.
- **Comparable listings** on the page, from the same catalogue query that found it.
