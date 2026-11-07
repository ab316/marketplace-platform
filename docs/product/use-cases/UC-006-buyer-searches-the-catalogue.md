# UC-006: Buyer Searches and Filters the Catalogue

Owner: product (catalog/discovery)
Status: Implemented
Surfaces: API ✓ · Web ✓
Last updated: 2026-10-31

Slice 1 of the [catalogue search feature spec](../feature-specs/catalogue-search.md), shaped from backlog item [P1-010](../product-backlog.md). It settles how a buyer narrows and orders the catalogue. It expands step B1 of [UC-001](UC-001-buyer-orders-refurbished-laptop.md), which settled plain browsing with an optional keyword; everything from the listing detail page onward stays UC-001's.

Questions Q1–Q5 were decided on 2026-10-31; the decisions are recorded in the spec's [Decisions](../feature-specs/catalogue-search.md#decisions) section. Implemented end to end the same day: `GET /api/listings` carries the filters and sort (and excludes sold-out listings, closing bug [#14](https://github.com/ab316/marketplace-platform/issues/14)), and `/listings` in the web app is the buyer-facing surface. Brand filtering uses the curated marketplace brand list matched case-insensitively against the listing's brand text; moving the vocabulary to publish time stays deferred to [P1-017](../product-backlog.md).

## Goal

A buyer narrows the catalogue to laptops matching their budget, condition tolerance, and minimum specification, and orders the results the way they want to read them.

## Primary Actor

- Buyer (signed in or anonymous)

## Stakeholders

- **Buyer** — wants to reach a shortlist of orderable laptops without reading the whole catalogue.
- **Seller organization** — wants its listings found by the attributes buyers search on.
- **Marketplace operator** — wants to know what buyers search for and what they fail to find.

## Preconditions

- At least one listing is `Active`, owned by an active organization. No sign-in is required.

## Trigger

A buyer opens the catalogue, or changes a keyword, filter, or sort on it.

## Main Flow

1. **B1.** The buyer opens the catalogue. It shows orderable listings — `Active`, owned by an active organization, with at least one unit available — newest first, with the total number of matches.
2. **B2.** The buyer sets any combination of refinements:
   - a **keyword**, matched against the listing's title, description, brand, and model;
   - **brand**, one or more values from the curated marketplace brand list;
   - a **price range**, a minimum and/or a maximum in SEK, each independently optional;
   - a **minimum condition grade** — C accepts any grade, B accepts A or B, A accepts A only;
   - a **minimum memory**, chosen from 8 GB+, 16 GB+, 32 GB+, 64 GB+.
3. **B3.** The buyer picks a sort order: newest first (default), price low to high, or price high to low.
4. **B4.** The product applies the keyword and every active filter together, and returns the matching listings in the chosen order, with the total number of matches and the active refinements shown.
5. **B5.** Each active refinement can be removed individually, and all of them can be cleared at once.
6. **B6.** The current refinements are reflected in the page address, so the search can be shared, bookmarked, and reopened with the same results.
7. **B7.** The buyer pages through the results. Ordering is deterministic — every sort breaks ties on a stable value — so no listing is duplicated or skipped between pages.
8. **B8.** The buyer opens a listing and continues with [UC-001](UC-001-buyer-orders-refurbished-laptop.md) B2.

## Alternate / Error Flows

### A1: No listing matches

- Condition: at B4 the active refinements match nothing.
- Steps: the product states that nothing matched, lists the active refinements, and offers to remove any one of them or all of them. The sort and the refinement controls stay usable.
- Outcome: no empty list without explanation; the buyer can always recover in one action.

### A2: A filter value nothing in the catalogue has

- Condition: the buyer filters on a brand or memory size that no active listing carries.
- Steps: treated as A1. The filter is applied and reported, never silently dropped.
- Outcome: the buyer learns the catalogue has nothing, rather than being shown unrelated results.

### A3: A result sells out, is archived, or its seller is deactivated after the page is rendered

- Condition: the buyer is looking at results that are no longer accurate.
- Steps: the listing disappears from any subsequent search. Opening an already-rendered result shows the listing detail page with no stock available; attempting to order it is [UC-001](UC-001-buyer-orders-refurbished-laptop.md) A3/A4.
- Outcome: no order is created against unavailable stock. Search results are a point-in-time view and are never treated as a reservation.

### A4: The buyer pages past the last result

- Condition: a page beyond the end of the result set is requested, usually from a shared or stale link.
- Steps: the product returns an empty page while reporting the true total, and offers to return to the first page.
- Outcome: no error; the buyer is not stranded.

### E1: Invalid refinement input

- Condition: a maximum price below the minimum, a negative or non-numeric price, an unknown brand, grade, memory bucket, or sort value, or a keyword over the length limit.
- Steps: the request is rejected with a field-level reason naming the offending refinement; the catalogue stays usable and the valid refinements remain applied.
- Outcome: the buyer can correct one refinement without rebuilding the whole search.

### E2: Draft or archived listings sought by keyword

- Condition: a keyword that would match a `Draft` or `Archived` listing, or a listing of a deactivated organization.
- Steps: those listings are excluded before matching.
- Outcome: no non-public listing is ever discoverable or inferable through search.

## Postconditions

- No state is changed. Searching is a read.
- Every listing shown was orderable at the moment the results were produced.
- The buyer's refinements are fully represented in the page address.

## Data / Validations

### Inputs

| Refinement     | Accepted values                              | Notes                                                       |
| -------------- | -------------------------------------------- | ----------------------------------------------------------- |
| Keyword        | 1–140 characters                             | Matched against title, description, brand, model (as today) |
| Brand          | one or more values from the curated list     | OR within the filter; matched case-insensitively            |
| Minimum price  | SEK, ≥ 0, optional                           | Inclusive                                                   |
| Maximum price  | SEK, ≥ minimum when both are given, optional | Inclusive                                                   |
| Minimum grade  | `A`, `B`, or `C`                             | Inclusive of better grades                                  |
| Minimum memory | `8`, `16`, `32`, `64`                        | GB; inclusive                                               |
| Sort           | `newest`, `price_asc`, `price_desc`          | Default `newest`                                            |
| Page           | existing catalogue pagination                | Unchanged from UC-001                                       |

### Rules

- A listing is in the catalogue only if it is `Active`, its organization is active, and at least one unit is available.
- Brand filter values come from a curated marketplace brand list and are matched case-insensitively against the listing's brand; a listing whose brand text is not on the list is reachable by keyword but not by the brand filter until [P1-017](../product-backlog.md) moves the vocabulary to publish time.
- Keyword and all filters are combined conjunctively; values within a single multi-value filter are combined disjunctively.
- Condition grade and memory filters are minimums, not exact matches.
- All prices are SEK minor units, consistent with [UC-001](UC-001-buyer-orders-refurbished-laptop.md); no other currency is accepted or returned.
- Every sort breaks ties deterministically, so pagination is repeatable for an unchanging catalogue.
- No refinement is ever silently ignored: it is applied, or the request is rejected with a reason.
- Search is identical for anonymous and signed-in buyers. It is not personalized and does not depend on who is asking.

### Outputs

- The matching listings, in the requested order, with the same buyer-facing fields the catalogue returns today.
- The total number of matches.
- The active refinements, echoed back so the buyer's view and the result set cannot disagree.

## Observability

- **Logs:** catalogue searches at a level that does not retain free-text keywords against an identified user.
- **Metrics:** searches performed; share of searches using each refinement; zero-result rate; the most frequent zero-result refinement combinations; catalogue response time, which must stay within the 300 ms p95 budget ([NFR §2](../../architecture/non-functional-requirements.md)) with filters applied.
- **Traces:** standard request correlation; no search-specific tracing.

## Security / Compliance

- **Auth:** none required. The catalogue is public, exactly as in [UC-001](UC-001-buyer-orders-refurbished-laptop.md).
- **Authorization:** no listing a buyer could not already open is exposed, and no field beyond the public listing view is returned. Non-public listings must be excluded by the query itself, not filtered out afterwards, so that result counts cannot be used to infer their existence.
- **Abuse:** the catalogue is a public unauthenticated read and must be rate-limited and bounded in page size and keyword length.
- **Audit:** none. Nothing is changed.

## Non-Goals (this use case)

- Relevance ranking, typo tolerance, and brand aliases — slice 3 of the spec (P1-016).
- Refinement counts and dead-end prevention — slice 2 (P1-015).
- Trust-based ranking, saved searches, category-specific filters (P2-006); saved listings (P2-004).
- Any change to listing detail, ordering, reservation, or stock behavior.
- Seller-side and operator-side search.

## Success Metric

A buyer can reach a shortlist of orderable laptops matching a budget, a minimum condition, and a minimum memory in a single refinement pass, share that search as a link, and page through it without a listing appearing twice.

## Mapping to Architecture

- Queries: `Catalog.BrowseActiveListings` extended with filter and sort criteria. No new command.
- Domain events: none. Integration events: none — this is a read-only surface with no cross-module consumer.
- Persistence: no new data. The curated brand list is marketplace configuration, not listing data; publish-time brand capture is deferred to [P1-017](../product-backlog.md).

## Consequences for UC-001

Amended alongside this use case's approval:

- **B1** defers browsing and discovery behavior to this use case.
- **A5** (seller archives a listing with stock) stays consistent; its catalogue-visibility statement points here.
- **A3** (last unit reserved while the buyer was viewing) stays possible — a listing can leave the catalogue between search and order, and search results are never a reservation.
- **Scope decision 2 / required fields** change only when [P1-017](../product-backlog.md) moves brand to a publish-time vocabulary; UC-001 publishing is untouched by this slice. (Since 2026-11-07, publishing is settled by [UC-008](UC-008-seller-publishes-listing.md), which takes on P1-017.)
