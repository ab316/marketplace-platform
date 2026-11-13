# Feature Spec: Seller Listing Management

## Status

**Approved — 2026-11-07.** Shaped for the Phase 6 deliverable "Seller listing management" ([roadmap](../roadmap.md)). Decisions D1–D12 were settled by the founder on 2026-11-07 (see [Decisions](#decisions)); no questions remain open. The behavior is distilled into six use cases (see [Use cases](#use-cases)): UC-005 and UC-007–UC-010 are Approved, and UC-011 (discard) is Draft. Incomplete drafts (P1-012), brand from the curated list (P1-017), and the web surface shipped on 2026-11-07; UC-011 (discard) remains.

The seller side of listings was first settled inside [UC-001](../use-cases/UC-001-buyer-places-an-order.md), a buyer use case, as the supporting steps S1–S4 plus parts of A5, E1, and E2. It was written as a precondition for the buyer journey rather than as a seller workflow. Those steps now live in their own use cases, one goal each, and UC-001 keeps only the buyer's side.

## Summary

A seller organization publishes what it sells through listings. This feature is the seller's whole workflow around them: start a listing without having every detail, keep working on it, publish it when the disclosures are complete, archive it when it should stop taking orders, and see all of the organization's listings in one place. It is built for the web app, which today has no listing surface for sellers at all.

## Problem

A seller organization that has just been created (UC-003, now in the web app) cannot do anything that earns money. The `/seller` home promises "Publish your first listing" but can only say it is not available yet. The listing behavior that exists today was shaped around the buyer and does not fit how sellers work:

- **A draft must be complete before it can be saved.** A seller who does not yet know the battery cycle range or the fulfillment promise cannot save their work at all. UC-001 already described drafts as editable work in progress (S1/S2); the behavior that was built does not do this.
- **A draft can never be thrown away.** A mistaken or abandoned draft stays in the organization's list forever.
- **Brand is free text.** "lenovo", "Lenovo " and "LENOVO" are different values, so a buyer filtering by brand (UC-006) misses listings, and the catalogue has to guess.
- **Grades are not defined anywhere a seller can read them.** The buyer-facing words for A/B/C live only in a design document, so sellers grade by their own standards.
- **Nobody can see who did what.** A listing records when it was published or archived, but not by which member.

Current workaround: none in the browser. The API can be called directly, which is not a product.

## Target users

- **Seller organization owner and manager** — create, edit, publish, and archive listings.
- **Seller organization viewer** — reads the organization's listings; changes nothing.
- **Buyer** (indirectly) — sees only published listings, with complete and comparable disclosures.
- **Marketplace operator** — not a user of this feature. Operators inspect any organization's listings through UC-003 A1 and the later operator surface.

## Goals

- A seller can go from an empty organization to a published, orderable listing in the browser.
- A seller can save a listing at any stage and come back to it.
- Every published listing meets the same disclosure bar, with grades and brands that mean the same thing on every listing.
- Each member can see every listing the organization has, what state it is in, and how much stock is left.

## Non-goals

- **Changing a published listing.** Its content is frozen (D2). Minor corrections are a future idea ([idea 003](../ideas/003-correcting-published-listings.md), P2-023). Restocking is P1-011.
- **Re-publishing an archived listing.** Archiving is final.
- **Discarding a draft in the first slice.** It is settled (D3, D9) as [UC-011](../use-cases/UC-011-seller-discards-listing-draft.md) / P1-018, but not scheduled with the first web slice.
- **Listing activity history** (who changed what): P1-019.
- **Searching and filtering the seller's own listings**: P2-022.
- **AI grade checking or suggestion** ([idea 004](../ideas/004-ai-condition-grade-assistant.md)) and **brand list management by marketplace staff** ([idea 005](../ideas/005-marketplace-managed-brand-list.md)).
- **Optional disclosures** (operating system, GPU, ports, included accessories, warranty notes). UC-001 named them optional, but they were never built and are not part of this feature.
- Photos (P2-007), listing quality score (P2-002), seller analytics (P2-003), bulk import, other currencies.
- Operator-side listing views and actions.

## User journey

```text
Seller opens their organization's listings
→ starts a new listing and fills in what they know
→ saves; the draft says what is still missing
→ comes back later, completes the draft
→ publishes; the product warns the content is final, then the listing goes live
→ buyers find and order it; the seller sees stock move (available / reserved / sold)
→ when the seller stops selling it, they archive it; open orders continue
```

## Main flow

1. A member opens the organization's listings and sees every listing in every status, newest first. Each draft shows whether it is ready to publish ([UC-010](../use-cases/UC-010-member-reviews-organization-listings.md)).
2. An owner or manager starts a new listing. Nothing is required to save it; anything entered must be well-formed ([UC-005](../use-cases/UC-005-seller-creates-listing-draft.md)).
3. They edit the draft as often as needed, adding, changing, or clearing details ([UC-007](../use-cases/UC-007-seller-edits-listing-draft.md)).
4. They publish. Every required disclosure must be present and valid, and every gap is reported at once. Publishing is final for the content ([UC-008](../use-cases/UC-008-seller-publishes-listing.md)).
5. The listing is `Active`: in the catalogue (UC-006) and orderable (UC-001) while units are available.
6. They archive it. It stops taking orders and leaves the catalogue, and existing orders are untouched ([UC-009](../use-cases/UC-009-seller-archives-listing.md)).

## Edge cases

- A draft with nothing in it at all. Allowed, and shown as "Untitled draft".
- A brand the seller sells that is not on the curated list. The seller cannot choose it, so the listing cannot be published with it. The seller contacts support (D10).
- Two members editing the same draft at once. The last save wins (D11).
- A member publishes or archives a listing that another member already published or archived. The product says so, and nothing changes.
- An active listing whose units are all reserved or sold. It stays `Active` but leaves the catalogue. The seller sees that no units are available and why (reserved vs sold).
- Archiving a listing with unpaid orders. The orders keep their reservation. If one is cancelled or expires, the unit returns to the archived listing's stock but is never orderable again.
- The organization is deactivated by an operator. Every write is refused, the listings stay readable for members, and they disappear from the catalogue (UC-003 E6).
- A platform admin tries to act as a seller. Refused: staff never sell (UC-003 E7).

## States and status changes

| Current state | Action                                        | New state | Notes                                                                       |
| ------------- | --------------------------------------------- | --------- | --------------------------------------------------------------------------- |
| —             | Owner/manager creates a listing               | Draft     | Any subset of fields; values entered must be well-formed                    |
| Draft         | Owner/manager saves changes                   | Draft     | Fields can be added, changed, or cleared                                    |
| Draft         | Publish, every required field present + valid | Active    | Content frozen from here on; publication time recorded                      |
| Draft         | Publish, something missing or invalid         | Draft     | Rejected with every field-level reason at once                              |
| Draft         | Discard                                       | Discarded | Kept, out of every view; never deleted (D9). UC-011, not yet built          |
| Active        | Orders reserve, sell, or release units        | Active    | Stock counters move; status does not. No available units = not in catalogue |
| Active        | Owner/manager archives                        | Archived  | Final. Open orders unaffected; archive time recorded                        |
| Active        | Edit content                                  | —         | Not allowed (D2); corrections are idea 003 / P2-023                         |
| Archived      | Any change or re-publish                      | —         | Not allowed; archived is terminal                                           |

## Permissions

| Action                                             | Allowed users                                   |
| -------------------------------------------------- | ----------------------------------------------- |
| Create, edit, publish, archive (and later discard) | Owner, manager — of an active organization only |
| See the organization's listings in every status    | Owner, manager, viewer — also when deactivated  |
| See a draft                                        | Members of the owning organization; operators   |
| Any listing write                                  | Never a platform admin (UC-003 E7)              |

## Timeline entries

None. Listings have no timeline. Order timelines are unaffected: an order's snapshot already preserves what the buyer was promised. A record of who created, edited, published, and archived a listing is P1-019.

## Notifications

None.

## Business rules

The listing rules live in [`business-rules-policies.md`](../business-rules-policies.md#listing-lifecycle) (lifecycle, required fields, condition grades, brand). In short:

- Drafts may be incomplete, but any value entered must be well-formed. Completeness is checked only when publishing.
- Every published listing meets one disclosure bar, the required-fields list.
- A published listing's content never changes. Archiving is final.
- Brand is chosen from the curated marketplace brand list.
- Condition grade is cosmetic and defined in plain language. Every unit on a listing meets at least its grade.

## Use cases

One actor, one goal, one trigger each ([sizing rule](../product-operating-model.md#use-case-sizing)). All five are **Draft**.

| Use case                                                              | Primary actor   | Goal                                        | Replaces in UC-001 |
| --------------------------------------------------------------------- | --------------- | ------------------------------------------- | ------------------ |
| [UC-005](../use-cases/UC-005-seller-creates-listing-draft.md)         | Owner / manager | Start a listing without every detail        | S1                 |
| [UC-007](../use-cases/UC-007-seller-edits-listing-draft.md)           | Owner / manager | Bring a draft up to the publish bar         | S2                 |
| [UC-008](../use-cases/UC-008-seller-publishes-listing.md)             | Owner / manager | Make a complete draft orderable             | S3, S4, E1         |
| [UC-009](../use-cases/UC-009-seller-archives-listing.md)              | Owner / manager | Stop new orders without disturbing old ones | A5 (seller side)   |
| [UC-010](../use-cases/UC-010-member-reviews-organization-listings.md) | Any member      | See every listing, its state and stock      | —                  |

| [UC-011](../use-cases/UC-011-seller-discards-listing-draft.md) | Owner / manager | Remove a draft that is no longer wanted | — |

UC-005 and UC-007–UC-010 are Implemented on API and web (2026-11-07). UC-011 is Draft (P1-018, not yet scheduled).

## Changes to current behavior

Phase 6 allows no new backend behavior by default. This feature is a recorded exception (roadmap, 2026-11-07): the web form is designed around the behavior below, so the product must change before or with the web surface.

1. **Incomplete drafts** (P1-012; UC-005, UC-007, UC-008). **Done on the API 2026-11-07.** Previously a draft was refused unless every disclosure was present and valid, and an edit had to leave it complete. A seller can now save any subset, clear a field, and learn at publish time everything that is missing, all at once.
2. **Brand from the curated list** (P1-017; UC-005, UC-007, UC-008). **Done 2026-11-07.** Brand used to be free text. It is now chosen from the curated list, and publishing refuses a brand that is not on it. Existing listings are mapped to the list (D12).
3. **Draft readiness** (UC-005, UC-007, UC-010). **Done on the API 2026-11-07.** A seller can see, for each draft, whether it can be published and what is missing, before trying.

Archiving (UC-009) and the organization's listing list (UC-010, apart from readiness) already behave as specified.

## Acceptance criteria

- [ ] An owner or manager can save a draft with any subset of fields, including none, and finish it across several sessions.
- [ ] A malformed value is refused at save with a field-level reason. A missing value is not.
- [ ] Publishing reports every missing or invalid required field in one answer, and leaves the listing a draft.
- [ ] Brand is chosen from the curated list. Publishing refuses any other value.
- [ ] Before publishing and before archiving, the seller is told the step is final and confirms it.
- [ ] A published listing's content cannot be changed. An archived listing cannot be changed or re-published.
- [ ] Archiving leaves existing orders, their snapshots, and their reservations untouched.
- [ ] Every member, including a viewer, sees all of the organization's listings with status, stock, and draft readiness. A viewer is offered no write action.
- [ ] A deactivated organization's members can read but never write. A platform admin can never write.
- [ ] Buyers never see a draft, by search, by direct link, or by inference from result counts.
- [ ] Condition grade definitions shown to the seller are the same words buyers see.

## Success metrics

- **Time to first listing:** time from organization creation to its first published listing.
- **Draft completion rate:** share of drafts that are published within 14 days.
- **Publish rejections per publish attempt**, by field. If high, the form is not guiding the seller well.
- **Archive-then-recreate rate:** an archived listing followed within 24 hours by a near-identical new listing from the same organization. This is the typo-fix workaround and the evidence for [idea 003](../ideas/003-correcting-published-listings.md).
- **Unlisted-brand requests** reaching support: the evidence for [idea 005](../ideas/005-marketplace-managed-brand-list.md).

## Product risks

- **Abandoned drafts accumulate** until discarding ships (P1-018). Incomplete drafts make this more likely.
- **Frozen content is unforgiving.** A typo costs an archive and a re-publish, and the listing's publication date resets. The archive-then-recreate metric watches this.
- **A curated brand list with no way out blocks a seller** whose brand is missing, until the list changes. For now a product release changes it; later, marketplace staff could (idea 005).
- **No record of which member published or archived** a listing (P1-019) weakens investigations when a listing is disputed.
- **Grade definitions are self-assessed.** Sellers may grade generously. An AI consistency check is idea 004; disputes are the backstop.

## Decisions

D1–D8 decided 2026-11-07 by the founder.

- **D1 — Incomplete drafts are supported.** A draft can be saved with any subset of fields. Completeness is checked at publish. This changes current behavior and is recorded as an exception to the Phase 6 "no new backend behavior" rule. Absorbs P1-012.
- **D2 — Published listings do not change.** Minor corrections (typos) and later description changes are wanted eventually, with a guard against changes that alter what is being sold, possibly AI-assisted. Captured as [idea 003](../ideas/003-correcting-published-listings.md) / P2-023.
- **D3 — Drafts are discardable.** Captured as P1-018 and settled in [UC-011](../use-cases/UC-011-seller-discards-listing-draft.md) (see D9).
- **D4 — One required-fields list.** The business rules hold the single list, aligned with what publishing enforces. The stale four-item list is replaced.
- **D5 — Condition grades are defined in the business rules,** in the same words buyers see. AI grade checking and suggestion are [idea 004](../ideas/004-ai-condition-grade-assistant.md) / P3-018.
- **D6 — Brand comes from the curated marketplace list,** with no free-text escape hatch. A brand not on the list waits until the list is extended. Staff-managed brands are [idea 005](../ideas/005-marketplace-managed-brand-list.md) / P2-024. Absorbs P1-017.
- **D7 — Listing activity history** belongs in the backlog as P1-019.
- **D8 — Seller listing search and status filter** belong in the backlog as P2-022. The first version lists everything, newest first, with status shown on each row.

D9–D12 decided 2026-11-07 by the founder, answering the questions this spec had left open.

- **D9 — A discarded draft is kept out of sight, never deleted.** It gets its own `Discarded` status, disappears from every view, and can never be edited, published, or brought back. The business rule that listings are never hard-deleted holds without exception.
- **D10 — A seller whose brand is not on the list contacts support** for now. The brand picker says so. Support extends the list in a product release, until staff can manage it themselves ([idea 005](../ideas/005-marketplace-managed-brand-list.md)).
- **D11 — The last save wins** when two members edit the same draft. In practice this means separate saves overwrite each other. Two saves landing at the same instant are already refused one at a time: the second gets a conflict and can simply be retried. **Later:** optimistic locking at the edit itself. The seller's save carries the version they opened, and a save over someone else's newer changes is refused with "this draft changed since you opened it". Revisit with P1-019 or if sellers report lost work.
- **D12 — Existing brands are mapped by one case-insensitive pass when P1-017 ships.** Nothing has been released, so every listing today is local or test data. Brands that match the list apart from capitalization ("lenovo", "LENOVO ") become the list's value. Anything else is left as it is: it cannot be saved again unchanged or published, and local databases can be reset. No migration tooling and no database rule on brand values are built, because the list is expected to move to marketplace staff (idea 005).

## Open questions

None.

## Follow-up ideas

- **Duplicate a listing as a new draft.** A cheap way to fix a published typo (archive the old one, publish the copy) until idea 003, and to list a near-identical model.
- **Preview as a buyer** before publishing: the listing detail exactly as a buyer will see it.
- Restocking an active listing (P1-011) needs an amendment to UC-008 or a new use case.
