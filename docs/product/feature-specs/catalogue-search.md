# Feature Spec: Catalogue Search

## Status

**Ready — approved 2026-10-31.** Shaped from backlog item [P1-010](../product-backlog.md) (basic browse filters and sorting), which turned out to be larger than the Level 1 refinement it was captured as. Behavior for the first slice is distilled into [UC-006](../use-cases/UC-006-buyer-searches-the-catalogue.md) (Approved). Questions Q1–Q5 are decided — see [Decisions](#decisions). Later slices stay in this spec until they are scheduled.

> **Why this escalated to Level 2.** P1-010 reads like "add a filter to an existing list" (Level 1). Shaping it surfaced three things that are new product behavior, not refinements of settled behavior: result ordering becomes a product decision rather than an implementation detail; filtering by brand and RAM requires listing data to be comparable, which touches what a seller must enter when publishing ([UC-001](../use-cases/UC-001-buyer-places-an-order.md) S1); and "no results" becomes a first-class state that the catalogue has never had. Per the operating model, that is an escalation, so P1-010 gets a spec and a use case.

## Summary

Discovery is the first half of the marketplace promise: a buyer who cannot find a suitable laptop never reaches the trust loop at all. Today the catalogue offers one keyword box, a single fixed order (newest first), and no way to narrow by the things buyers actually decide on — budget, how much RAM, how good the condition is, which brand they trust. This feature turns the catalogue into a search surface a buyer can steer: keyword plus filters plus an explicit sort, with results that stay stable while they page through and a "no results" state that tells them what to relax.

The feature is specified end to end so the shape is production-grade, and sliced so the first slice is small. Later slices (facet counts, relevance quality) stay here until scheduled.

## Problem

A buyer arriving at the catalogue has a budget, a minimum spec, and a tolerance for wear. The product currently lets them express none of that. Their only tools are a keyword that matches raw substrings and a list sorted by publication date — so finding "a B-grade ThinkPad with at least 16 GB under 8 000 kr" means reading every listing on every page. Two things follow:

- **Buyers do not convert.** The discovery funnel metric we already care about — listing-to-order conversion, search-with-no-result rate ([`success-metrics.md`](../success-metrics.md)) — has no chance to improve while the only refinement is a substring match.
- **Sellers with good stock stay invisible.** Newest-first means a well-disclosed listing sinks as soon as other sellers publish, regardless of how well it matches what the buyer asked for.

Current workaround: the buyer scrolls, or leaves.

## Target users

- **Buyer** — wants to narrow the catalogue to laptops they would actually consider, and to order the result by what matters to them (price or recency).
- **Seller organization member** — wants their listing to be findable by the attributes buyers search on, which means the attributes they enter must be comparable across listings.
- **Marketplace operator** — wants to see what buyers search for, and especially what they search for and do not find.

## Goals

- A buyer can combine a keyword with filters on brand, price, condition grade, and memory, and change the sort order.
- Filter and sort state is shareable and restorable — a buyer can send a link to the search they ran.
- Results are stable: paging forward and back does not duplicate or skip listings.
- A search that matches nothing explains what to relax rather than showing an empty page.
- A buyer is never shown a listing they cannot order.
- What buyers search for, and what they fail to find, is measurable.

## Non-goals

Out of scope for this feature entirely (they belong to [P2-006](../product-backlog.md) improved marketplace search, or to other items):

- Trust-based or seller-reputation ranking, personalization, recommendations, featured or promoted listings.
- Saved searches, search alerts, and saved listings (P2-004).
- Categories beyond laptops, and category-specific filter sets — the assortment is laptops only ([UC-001](../use-cases/UC-001-buyer-places-an-order.md) scope decision 1).
- Image or photo search; photos are deferred (P2-007).
- Seller-side or operator-side search over their own listings and orders (operator order search is part of [P0-013](../product-backlog.md)).
- Any change to ordering, reservation, payment, or stock behavior.

## User journey

```text
Buyer opens the catalogue
→ sees active, orderable listings, newest first
→ types a keyword and/or sets filters (brand, price, condition, memory)
→ chooses a sort (newest, price low→high, price high→low)
→ sees the matching listings with the active refinements shown and removable
→ opens a listing detail page (UC-001 B2)
→ places an order (UC-001 B3)
```

## Main flow

1. The buyer opens the catalogue. The product shows active listings that have at least one unit available, newest first, with a result count.
2. The buyer enters a keyword, sets any combination of filters, and/or picks a sort order.
3. The product applies every active refinement together (keyword **and** each filter), and shows the matching listings in the chosen order with the total number of matches.
4. The active refinements stay visible and individually removable, and are reflected in the page's address so the search can be shared or reopened.
5. The buyer pages through results; the ordering is deterministic, so no listing appears twice or is skipped.
6. The buyer opens a listing and continues into [UC-001](../use-cases/UC-001-buyer-places-an-order.md).

## Edge cases

- **No matches.** The product says nothing matched and names which refinements are active, with a way to clear them individually or all at once. It never shows a bare empty list.
- **A filter value that no listing has.** Same as no matches; a filter is never silently ignored.
- **Invalid or contradictory input** — a maximum price below the minimum, a negative price, an unknown brand or grade, a page far beyond the last result. The buyer gets a clear correction and a usable catalogue, never an error page.
- **A listing sells out while the buyer is looking at results.** It disappears from subsequent searches. The already-rendered card is stale; opening it shows the listing detail with no available stock, which [UC-001](../use-cases/UC-001-buyer-places-an-order.md) A3 already covers at order time.
- **A listing is archived, or its seller organization is deactivated, mid-session.** Same as selling out: it leaves the catalogue immediately and existing orders are unaffected ([UC-003](../use-cases/UC-003-seller-organization-and-member-management.md) E6).
- **A listing is published while the buyer pages.** With newest-first, a new listing at the front can shift later pages. Deterministic tiebreaking bounds this; perfectly stable pagination under insertion is a scale concern, noted under Product risks.
- **Abusive or very long queries.** Query length is capped and the catalogue is rate-limited like any other public read; a rejected query is explained, not swallowed.
- **Keyword that only matches a draft or archived listing.** No results — draft and archived listings are never searchable by buyers ([`business-rules-policies.md`](../business-rules-policies.md) listing visibility).

## States and status changes

This feature changes no listing or order state. It changes only what a buyer sees.

| Listing state                                 | Appears in catalogue search | Notes                                                                          |
| --------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------ |
| Draft                                         | No                          | Never visible to buyers.                                                       |
| Active, ≥ 1 unit available                    | Yes                         | The orderable catalogue.                                                       |
| Active, 0 units available (all reserved/sold) | No (decided — Q1)           | Still shown by today's backend; tracked as a bug until the backend work lands. |
| Archived                                      | No                          | Visible to its seller and to operators only.                                   |
| Active, owned by a deactivated organization   | No                          | [UC-003](../use-cases/UC-003-seller-organization-and-member-management.md) E6. |

## Permissions

| Action                          | Allowed users                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Search and filter the catalogue | Everyone, signed in or not ([UC-001](../use-cases/UC-001-buyer-places-an-order.md) preconditions) |
| Open a listing detail page      | Everyone                                                                                          |
| Order a listing from results    | Signed-in buyer only (unchanged)                                                                  |

Search results contain no more information than the listing detail page already shows publicly. Search is not personalized, so no search behavior is attributed to an identified user in this feature.

## Timeline entries

None. Searching is a read; it touches no order.

## Notifications

None in this feature. Search alerts are explicitly out of scope (P2-006).

## Business rules

Approved 2026-10-31 and recorded in [`business-rules-policies.md`](../business-rules-policies.md) under listing visibility:

- The buyer-facing catalogue shows only active listings from active organizations that have at least one unit available to order.
- Brand is not free text to the buyer: the brand filter offers a curated marketplace brand list, matched case-insensitively against listing data until the vocabulary moves to publish time (P1-017).
- Every refinement a buyer sets is applied; the product never silently drops a filter it cannot satisfy.
- Filters combine conjunctively — a listing must satisfy the keyword and every active filter.
- Sort order is explicit and buyer-chosen. The default is newest first.
- Price filtering is in SEK, consistent with the single-currency rule.
- Condition grade filtering is inclusive of better grades: asking for B means A or B, because a buyer stating a minimum acceptable condition will accept better.
- Memory filtering is a minimum, not an exact match, for the same reason.

## Slices

Only the first slice is scheduled. The rest stay here until picked up.

### Slice 1 — steerable catalogue (P1-010; [UC-006](../use-cases/UC-006-buyer-searches-the-catalogue.md))

Keyword plus the four filters (brand via the curated list, per Q2), three explicit sorts, result count, stable pagination, in-stock-only results, shareable refinement state, and the no-results state. Relevance ranking is deliberately **not** in this slice: without it, "newest" stays the honest default rather than shipping a "best match" sort that is really a substring match.

### Slice 2 — refinement counts (new backlog item P1-015)

Show how many listings each filter value would yield, so a buyer can narrow without dead ends, and disable values that would return nothing. Deferred because it is only worth building once there is enough stock for dead ends to be common.

### Slice 3 — match quality (new backlog item P1-016)

Replace substring matching with real text matching: word-level matching rather than raw substrings, tolerance for small misspellings, brand and model aliases ("ThinkPad" finding Lenovo, "MacBook" finding Apple), and a relevance sort that becomes the default when a keyword is present. Deferred because it is the most expensive part and is wasted effort until buyers are actually searching.

### Later (already captured as P2-006)

Trust-based ranking, saved searches, category-specific filters.

## Acceptance criteria

Slice 1 only. Detailed, testable criteria live in [UC-006](../use-cases/UC-006-buyer-searches-the-catalogue.md); this is the product-level checklist.

- [ ] A buyer can filter by brand, price range, condition grade, and minimum memory, in any combination.
- [ ] A buyer can sort by newest, price ascending, and price descending.
- [ ] Filters and sort combine with a keyword, and every active refinement is applied.
- [ ] Active refinements are visible, individually removable, and restored from a shared link.
- [ ] Results show the total number of matches.
- [ ] Only orderable listings appear (active, active seller, stock available).
- [ ] A search with no matches explains what is active and offers a way to relax it.
- [ ] Invalid refinement input is corrected clearly and never produces an error page.
- [ ] Paging through results neither duplicates nor skips a listing.

## Success metrics

Against the discovery funnel already defined in [`success-metrics.md`](../success-metrics.md):

- **Primary:** listing-to-order conversion rate for sessions that used at least one refinement, compared with sessions that did not.
- **Guardrail:** search-with-no-result rate. Filters make zero-result searches easier to produce; if this climbs without conversion improving, the filters are too strict or the stock too thin.
- **Diagnostic:** which filters and sorts are used, and the most frequent zero-result refinement combinations — direct input to slices 2 and 3 and to seller stock guidance.

No baseline exists; the catalogue has no usage yet. The first measurement after release is the baseline.

## Product risks

- **Thin stock makes filters feel broken.** With few listings, almost any combination returns nothing, which reads as a broken product rather than an empty market. Mitigation: the no-results state must suggest what to relax; slice 2 (counts) addresses it properly.
- **Interim brand matching can miss listings** (decided in Q2). Until P1-017 moves brand to publish time, the curated filter matches listing brand text case-insensitively; a misspelled or unconventional brand value ("Lenvoo", "IBM/Lenovo") will not be found by the filter. Acceptable while the catalogue is small; P1-017 removes it.
- **"Newest first" plus insertion shifts pages.** Acceptable at MVP volume; revisit if the catalogue grows.
- **Performance under filtering.** The catalogue is a public, unauthenticated, cacheable read and the most-hit endpoint the product will have. It must stay within the 300 ms p95 API budget ([NFR §2](../../architecture/non-functional-requirements.md)) with filters applied, which is an indexing question for the architect, not a product one.
- **An existing scale limit sits directly under this feature.** The catalogue excludes deactivated sellers through a list capped at 1000 organizations ([`PROJECT_STATE.md`](../../PROJECT_STATE.md)). Already scheduled as a Refinements engineering item; this feature makes it load-bearing.

## Decisions

Q1–Q5 decided 2026-10-31 by the founder.

- **Q1 — Sold-out listings are not shown.** An active listing with zero available units is excluded from the catalogue. The backend does not enforce this yet and is not being changed right now; the gap is recorded as a GitHub bug and closes with the backend work for UC-006. Revisit showing "out of stock" entries if sellers ask for demand signal.
- **Q2 — Brand is not free text to the buyer; the easy path ships first.** The brand filter offers a curated marketplace brand list (starting set: the brands actually sold — e.g. Lenovo, Dell, HP, Apple, Asus, Acer), matched case-insensitively against the listing's existing free-text brand. Moving the vocabulary to publish time — seller picks from the list, existing listings migrated — is deliberately deferred to [P1-017](../product-backlog.md) so this slice needs no listing-data change. A listing whose brand text is off-list stays reachable by keyword.
- **Q3 — Memory is filtered as fixed buckets:** 8 GB+, 16 GB+, 32 GB+, 64 GB+.
- **Q4 — Both price bounds are optional** and independently settable; a bare maximum (a budget ceiling) is the expected common case.
- **Q5 — Relevance is deferred to slice 3 (P1-016).** Slice 1 ships with newest-first as the default and only keyword behavior being today's matching.

## Follow-up ideas

- Seller-facing guidance when a listing matches few searches — relates to P2-002 (listing quality score).
- Feeding frequent zero-result searches back to sellers as stock demand signal.
- Reconsidering pagination style (cursor-based) if the catalogue grows past a few thousand listings.
