# UC-005: Seller Creates a Listing Draft

Owner: product (listings)
Status: Implemented
Surfaces: API, Web
Last updated: 2026-11-07

Part of [seller listing management](../feature-specs/seller-listing-management.md). Takes over step S1 of [UC-001](UC-001-buyer-places-an-order.md) and absorbs backlog item [P1-012](../product-backlog.md) (incomplete drafts) and the draft side of [P1-017](../product-backlog.md) (brand from the curated list).

**Current behavior vs this use case:** implemented on the API and the web (2026-11-07). A draft saves with any subset of fields (P1-012) and reports its readiness, and brand is one of the curated list's values (P1-017). On the web, `/seller/listings/new` creates the draft on its first save ([design](../../design/seller-listing-management.md)).

## Goal

A seller starts a listing for a laptop model they want to sell, without needing every detail at hand.

## Primary Actor

- Seller organization member with listing permission (owner or manager)

## Stakeholders

- **Seller organization** — owns the listing; wants work in progress kept safe and private.
- **Buyer** — never sees a draft.
- **Marketplace operator** — can inspect any organization's drafts (UC-003 A1).

## Preconditions

- The actor is signed in and is an owner or manager of an active seller organization.

## Trigger

The seller chooses to create a new listing.

## Main Flow

1. The seller starts a new listing.
2. The seller enters any of the listing fields (see Data / Validations). None is required to save.
3. The seller saves.
4. The product checks that every value entered is well-formed. It does not check completeness.
5. A listing is created in `Draft`, belonging to the seller's organization, with its creation time.
6. The seller sees the draft and its **readiness**: whether it can be published, and if not, which required fields are missing or invalid.

## Alternate / Error Flows

### A1: Empty draft

- Condition: the seller saves without entering anything.
- Steps: the draft is created like any other.
- Outcome: it appears in the organization's listings as "Untitled draft", with every required field listed as missing.

### E1: Malformed value

- Condition: a value that is entered breaks a well-formedness rule. Examples: a price of zero, a battery health floor above 100, a battery cycle minimum above the maximum, a brand not on the curated list, text over its length limit.
- Steps: the save is refused with a reason on each offending field.
- Outcome: no draft is created. The web form keeps everything the seller typed.

### E2: Not allowed to create listings

- Condition: the actor is signed out, is a viewer, is not a member of any organization, or is a platform admin.
- Steps: the action is refused. A signed-out user is sent to sign in. A platform admin is told staff accounts do not sell (UC-003 E7).
- Outcome: nothing is created.

### E3: Organization deactivated

- Condition: the actor's organization has been deactivated.
- Steps: the action is refused with an explanation that seller actions are paused (UC-003 E6).
- Outcome: nothing is created.

## Postconditions

- A `Draft` listing exists, owned by the actor's organization. The actor cannot place it in another organization.
- No buyer can find, open, or infer it.
- Its stock is zero reserved and zero sold.

## Data / Validations

### Inputs

Every field in the [required-fields list](../business-rules-policies.md#required-listing-fields). All are optional when saving a draft.

### Rules: well-formedness (checked whenever a value is present)

| Field                    | A present value must be                                                    |
| ------------------------ | -------------------------------------------------------------------------- |
| Title                    | 1–140 characters after trimming                                            |
| Description              | 1–5000 characters                                                          |
| Brand                    | one value from the curated marketplace brand list                          |
| Model, CPU               | 1–120 characters each                                                      |
| RAM                      | whole GB, 1–2048                                                           |
| Storage                  | type (SSD, NVMe, HDD) and whole GB ≥ 1                                     |
| Screen size              | 5–30 inches                                                                |
| Condition grade          | A, B, or C ([definitions](../business-rules-policies.md#condition-grades)) |
| Battery health floor     | whole percent, 1–100                                                       |
| Battery cycle range      | optional, whole numbers 0–10 000; minimum ≤ maximum when both set          |
| Known defects            | 1–2000 characters; "none" is an explicit valid value                       |
| Price                    | SEK only, whole öre, > 0                                                   |
| Quantity                 | whole units, 1–10 000                                                      |
| Fulfillment expectations | 1–2000 characters                                                          |

Storage type and capacity may be saved independently of each other, and so may the two battery cycle bounds.

### Outputs

- The draft as stored, with status, creation time, and readiness (each missing or invalid required field, with a reason).

## Observability

- Logs: draft created (actor, organization, listing).
- Metrics: drafts created; share of drafts created incomplete.

## Security / Compliance

- Auth: signed in.
- Authorization: owner or manager of an active organization. The organization always comes from the actor's membership, never from the request.
- Audit: the creation time is recorded. Which member created the draft is not recorded yet (P1-019).

## Non-Goals (this use case)

- Publishing ([UC-008](UC-008-seller-publishes-listing.md)); editing ([UC-007](UC-007-seller-edits-listing-draft.md)); discarding (P1-018).
- Duplicating an existing listing, photos, optional disclosures, bulk creation.

## Success Metric

A seller saves a draft holding only a title and a price, closes the browser, and finds it again in the organization's listings with the missing fields named.

## Mapping to Architecture

- Commands: `Listings.CreateListingDraft`, with completeness checks moved to publishing
- Domain events: `ListingDraftCreated` (internal; no integration event)
- Persistence: listing draft fields become optional until publish
