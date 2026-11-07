# Feature Idea: Marketplace-Managed Brand List

## Status

Idea — backlog [P2-024](../product-backlog.md). Captured 2026-11-07 while shaping [seller listing management](../feature-specs/seller-listing-management.md) (decision D6).

## Product question

Should marketplace staff be able to add, rename, and retire brands on the curated brand list without a product release?

## User problem

Sellers must pick a listing's brand from a curated list (decision D6), and buyers filter on the same list (UC-006). Until this idea ships, the list changes only with a product release. A seller with stock of a brand that is not on the list cannot publish it, and has to ask support and wait.

## Affected users

- Seller
- Buyer
- Marketplace operator

## Affected journey

- Listing creation
- Discovery
- Support

## Rough idea

An operator page for the brand list:

- **Add** a brand: it immediately appears in the seller's brand picker and the buyer's brand filter.
- **Rename** a brand (spelling or capitalization): existing listings follow, because they reference the brand rather than copy its text.
- **Retire** a brand: no new listings can choose it, existing listings keep it, and the buyer filter keeps it while listings with it are in the catalogue.
- Every change is recorded with the operator, the time, and a reason.

Later: sellers request a missing brand from the picker, and the request lands in an operator queue (P2-014).

## Why it might matter

- **Transaction:** a seller is never blocked from publishing for longer than an operator takes to respond.
- **Trust:** the list stays curated, with no free-text drift, while still growing with the assortment.
- **Operational:** removes engineering from a routine marketplace task.

## Smallest useful version

Operators can add a brand and fix a brand's spelling. No retiring, no seller requests.

## Risks and trade-offs

- A typo'd or duplicate brand added by an operator spreads to listings and filters immediately. Changes need care and an audit trail.
- Retiring a brand that buyers have bookmarked filters for (UC-006 B6 shares filters by link) must not break those links.
- More operator surface to build before the operator slice has its basics.

## Open questions

- Are brands global, or eventually per category once the assortment goes beyond laptops?
- Do models get the same treatment (a model vocabulary per brand)?
- Who may manage the list: every platform admin, or a narrower staff role?

## Decision

- Keep exploring. Revisit when support receives repeated missing-brand requests (seller listing management spec, success metrics).

## Notes

- Builds on [P1-017](../product-backlog.md), which moves brand to the curated list at publish time.
- Related: P1-016 (brand and model aliases for buyer search).
