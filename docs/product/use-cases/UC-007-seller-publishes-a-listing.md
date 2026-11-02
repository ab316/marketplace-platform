# UC-007: Seller Publishes a Listing

Owner: product (listings)
Status: Implemented
Surfaces: API ✓ · Web ✓ (shipped 2026-11-01: `/seller/listings`, `/seller/listings/new`, `/seller/listings/[id]`, `/seller/listings/[id]/edit`; design contract [`docs/design/seller-listing-management.md`](../../design/seller-listing-management.md))
Last updated: 2026-11-01

Carved out of [UC-001](UC-001-buyer-orders-refurbished-laptop.md) on 2026-11-01 under the operating model's sizing rule: UC-001's supporting flow S1–S4 and error flows E1/E2 (seller side) are the behavior this document now owns. UC-001 keeps the buyer's journey from the listing detail page onward and points here for how a listing comes to exist. Nothing about the behavior changed in the carve-out; the backend that implements it is the one Phase 1 built and tested. Withdrawing a published listing is [UC-008](UC-008-seller-withdraws-a-listing-from-sale.md).

## Goal

A seller organization member turns a refurbished-laptop offer into an `Active` listing that buyers can find and order.

## Primary Actor

- Seller organization member with listing permission (owner or manager)

## Stakeholders

- **Seller organization** — wants to offer pooled stock of identical units with one set of disclosures and start receiving orders.
- **Buyer** — relies on every published listing carrying the full disclosure set, so nothing incomplete ever reaches the catalogue.
- **Marketplace operator** — wants publication attributable to a member and a time, and wants to inspect any listing in any status.

## Scope decisions (settled for this use case)

Inherited from UC-001 and unchanged:

1. **Assortment:** refurbished laptops only.
2. **Inventory model:** a listing is pooled stock of identical units with a shared condition guarantee expressed as floors and ranges, not per-unit values.
3. **Required disclosures:** the Data / Validations table below. The bar is "the buyer can make an informed decision without surprises." Photos are deferred (P2-007).
4. **Currency:** SEK only; prices are integer minor units (öre). The seller enters whole SEK in the web app; the stored value is öre.
5. **Brand is free text** with the curated marketplace brand list offered as suggestions. Making it a controlled vocabulary at publish time is [P1-017](../product-backlog.md).

## Preconditions

- The actor is signed in and is an owner or manager of an `Active` seller organization ([UC-003](UC-003-seller-organization-and-member-management.md)).

## Trigger

A seller member decides to offer a laptop model for sale and starts a new listing.

## Main Flow

1. **S1.** The member creates a listing draft, entering every required field (see Data / Validations), including the available quantity.
2. **S2.** The member may edit the draft any number of times. Drafts are visible only to members of the owning organization and to marketplace staff; buyers never see them.
3. **S3.** The member publishes the listing. Publishing re-validates that every required field is present and valid and that quantity ≥ 1.
4. **S4.** The listing becomes `Active`: it appears in the catalogue ([UC-006](UC-006-buyer-searches-the-catalogue.md)) and is orderable ([UC-001](UC-001-buyer-orders-refurbished-laptop.md) B2–B4). The publication time is recorded.
5. **S5.** The member sees the listing in the organization's listing list with its status, available stock, and price. The list shows every listing of the organization in every status (draft, active, archived).

## Alternate / Error Flows

### A1: Member views or edits an existing draft

- Condition: a draft exists and the member opens it from the organization's listing list.
- Steps: the member changes any fields and saves; the draft stays a draft.
- Outcome: the draft reflects the latest save. Buyers still see nothing.

### A2: Editing after publication

- Condition: the member tries to change buyer-visible content on an `Active` or `Archived` listing.
- Steps: rejected with a state conflict. The web app does not offer the edit action outside `Draft`.
- Outcome: no change. Published content is fixed so that orders placed against it keep matching what the buyer saw. Adding stock to an active listing is [P1-011](../product-backlog.md).

### A3: Publishing twice

- Condition: the listing is already `Active` (or `Archived`) when a publish is requested, for example from a stale page.
- Steps: rejected with a state conflict; the page shows the listing's current status.
- Outcome: no change.

### E1: Publish with missing or invalid fields

- Condition: at S3 one or more required fields are absent or invalid (quantity 0, price ≤ 0, battery health outside 1–100, inverted battery cycle range, empty known defects).
- Steps: publishing is rejected with field-level reasons; the listing stays `Draft`.
- Outcome: buyers never see an incomplete listing. (Today the same validation also runs at S1, so a draft cannot be saved incomplete — see Gaps.)

### E2: Unauthorized actions

- Condition: a signed-out user, a buyer with no organization, a viewer-role member, a member of another organization, or a platform administrator tries to create, edit, or publish a listing.
- Steps: rejected with an authorization error (sign-in prompt for the signed-out user). The web app shows no write actions to a viewer and shows the staff notice to an administrator.
- Outcome: no state change.

### E3: Deactivated organization

- Condition: the member's organization is `Deactivated` ([UC-003](UC-003-seller-organization-and-member-management.md) E6).
- Steps: every write is rejected; reads remain available. The web app shows the deactivation banner and no write actions.
- Outcome: the organization's listings are frozen and hidden from buyers; nothing is deleted.

## Postconditions

- An `Active` listing exists, owned by the organization, carrying the full disclosure set, a positive SEK price, and a total quantity ≥ 1 with nothing yet reserved or sold.
- The listing is discoverable in the catalogue and orderable.
- The publication is attributable to a member and timestamped.

## Data / Validations

### Listing — required fields to publish

| Field                    | Notes                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Title                    | 1–140 characters                                                                                                       |
| Description              | 1–5000 characters                                                                                                      |
| Brand and model          | e.g. "Lenovo" / "ThinkPad T14 Gen 3"; brand is free text with suggestions (scope decision 5)                           |
| CPU                      |                                                                                                                        |
| RAM                      | whole GB                                                                                                               |
| Storage                  | type (SSD, NVMe, HDD) and capacity in GB                                                                               |
| Screen size              | inches, 5–30                                                                                                           |
| Condition grade          | A/B/C with a plain-language definition shown to buyers (A "Like new", B "Light wear", C "Visible wear"; cosmetic only) |
| Condition guarantees     | minimum battery health 1–100 %; optional battery cycle range, not inverted                                             |
| Known defects            | free text; "none" is an explicit valid value                                                                           |
| Price                    | SEK; stored as integer öre; > 0                                                                                        |
| Available quantity       | integer, 1–10 000 at publish                                                                                           |
| Fulfillment expectations | what the seller will do and roughly when; 1–2000 characters                                                            |

Optional for MVP: operating system, GPU, ports, included accessories, warranty notes. Photos deferred.

### Rules

- State transitions in this use case: listing `Draft → Active`. `Active → Archived` is [UC-008](UC-008-seller-withdraws-a-listing-from-sale.md). There is no `Archived → Active`.
- Buyer-visible content is editable only while `Draft`.
- Total quantity can never be set below reserved plus sold units (relevant only once P1-011 allows editing an active listing's stock).
- All amounts are SEK minor units; any other currency is rejected.

### Outputs

- Listing detail for the owning organization (every status, with reserved, sold, and available counts).
- The organization's listing list, paginated, every status.

## Observability

- Logs: listing created, updated, published (actor, organization, listing IDs).
- Metrics: listings published; publish rejections by reason (E1).
- Audit: creation and publication are attributable to a member and timestamped.

## Security / Compliance

- Auth: every action requires a signed-in user.
- Authorization: membership in the owning organization with listing-write permission (owner or manager). Viewers read only. Platform administrators read any listing in any status but never write (UC-003 E7). A deactivated organization accepts no writes (E3).
- Audit: see Observability.

## Non-Goals (this use case)

- Archiving ([UC-008](UC-008-seller-withdraws-a-listing-from-sale.md)); re-publishing an archived listing.
- Changing stock on an active listing (P1-011); saving an incomplete draft (P1-012); controlled brand vocabulary (P1-017).
- Photos and media (P2-007), listing templates, bulk import, pricing tools.
- Buyer-side behavior: discovery ([UC-006](UC-006-buyer-searches-the-catalogue.md)), ordering ([UC-001](UC-001-buyer-orders-refurbished-laptop.md)).

## Success Metric

A new seller goes from "I own an organization" to "my listing is in the catalogue" in one sitting through the web app, and a buyer finds it by keyword.

## Gaps

- **Drafts require every field.** The backend validates the full disclosure set at S1 as well as S3, so a partially filled draft is rejected at save rather than at publish. [P1-012](../product-backlog.md) closes this; until then the web form requires every field to save and says so.

## Mapping to Architecture

- Commands: `Listings.CreateListingDraft`, `Listings.UpdateListingDraft`, `Listings.PublishListing`
- Queries: `Listings.GetListingDetail` (owner view), `Listings.ListOrganizationListings`
- Domain events: `ListingPublished` (not yet emitted; no subscriber)
- Integration events: none
- Persistence: `listings` (with stock counters and version)
