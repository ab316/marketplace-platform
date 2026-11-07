# UC-008: Seller Publishes a Listing

Owner: product (listings)
Status: Approved
Surfaces: API, Web
Last updated: 2026-11-07

Part of [seller listing management](../feature-specs/seller-listing-management.md). Takes over steps S3–S4 and error flow E1 of [UC-001](UC-001-buyer-orders-refurbished-laptop.md), including its required-fields table, now kept in the [business rules](../business-rules-policies.md#required-listing-fields). Absorbs the publish side of [P1-017](../product-backlog.md) (brand from the curated list).

**Current behavior vs this use case:** implemented on the API (2026-11-07): publishing reports every missing or invalid required field in one answer (`LISTING_INCOMPLETE`), and the database refuses an incomplete published listing. Still missing: refusing a brand that is not on the curated list (P1-017), the confirmation step, and the web surface.

## Goal

A seller makes a complete draft visible and orderable to buyers.

## Primary Actor

- Seller organization member with listing permission (owner or manager)

## Stakeholders

- **Buyer** — relies on every published listing meeting the same disclosure bar, with comparable brand and grade.
- **Seller organization** — wants the listing live as soon as it is complete.
- **Marketplace operator** — wants incomplete listings never to reach buyers.

## Preconditions

- The actor is signed in and is an owner or manager of an active seller organization.
- A `Draft` listing of that organization exists.

## Trigger

The seller chooses to publish a draft.

## Main Flow

1. The seller chooses to publish a draft.
2. The product tells the seller that publishing is final for the listing's content: afterwards it cannot be edited, only archived. The seller confirms.
3. The product checks that the listing is still a draft and that every [required field](../business-rules-policies.md#required-listing-fields) is present and valid, brand included.
4. The listing becomes `Active` and its publication time is recorded. Every unit is available.
5. The listing appears in the catalogue under the visibility rules of [UC-006](UC-006-buyer-searches-the-catalogue.md) and can be ordered ([UC-001](UC-001-buyer-orders-refurbished-laptop.md)).
6. The seller sees the listing as `Active` with its stock.

## Alternate / Error Flows

### E1: Missing or invalid required fields

- Condition: at step 3 one or more required fields are missing or invalid.
- Steps: publishing is refused, listing **every** missing or invalid field with a reason in one answer.
- Outcome: the listing stays `Draft`. Buyers never see an incomplete listing.

### E2: Already published or archived

- Condition: the listing is no longer a draft, for example after a double click or another member publishing first.
- Steps: the product reports the listing's actual state.
- Outcome: nothing changes. No second publication time is recorded.

### E3: Not allowed

- Condition: the actor is signed out, is a viewer, belongs to a different organization, or is a platform admin.
- Steps: the action is refused. A listing of another organization is not revealed.
- Outcome: nothing changes.

### E4: Organization deactivated

- Condition: the actor's organization has been deactivated.
- Steps: the action is refused (UC-003 E6).
- Outcome: the listing stays `Draft`.

## Postconditions

- The listing is `Active`, with available units = quantity, zero reserved, and zero sold.
- Its buyer-visible content is frozen. Orders snapshot it at creation (UC-001 B5).
- available + reserved + sold = quantity from now on, and no counter goes negative.

## Data / Validations

- Inputs: none beyond the listing itself.
- Rules: the publish bar is the [required-fields list](../business-rules-policies.md#required-listing-fields). Each value must also meet the well-formedness rules of [UC-005](UC-005-seller-creates-listing-draft.md#rules-well-formedness-checked-whenever-a-value-is-present). The battery cycle range stays optional.
- Outputs: the published listing, or the full list of field-level reasons.

## Observability

- Logs: listing published (actor, organization, listing); publish refused (fields only, no content).
- Metrics: listings published; publish refusals per attempt, by field; time from draft creation to publication.

## Security / Compliance

- Auth: signed in.
- Authorization: owner or manager of the organization owning the listing, which must be active.
- Audit: the publication time is recorded. Which member published is not recorded yet (P1-019).

## Non-Goals (this use case)

- Changing or unpublishing an active listing (D2, idea 003); scheduled publishing; restocking (P1-011).
- Optional disclosures and photos.

## Success Metric

No buyer ever sees a listing with a missing disclosure or an off-list brand, and a seller fixing a draft learns every problem from a single publish attempt.

## Mapping to Architecture

- Commands: `Listings.PublishListing`, with the completeness check collecting every failure
- Domain events: `ListingPublished` (internal; no integration event until a cross-module consumer appears)
