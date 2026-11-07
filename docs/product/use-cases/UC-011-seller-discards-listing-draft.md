# UC-011: Seller Discards a Listing Draft

Owner: product (listings)
Status: Draft
Surfaces: API, Web
Last updated: 2026-11-07

Part of [seller listing management](../feature-specs/seller-listing-management.md) (decisions D3 and D9). Settles backlog item [P1-018](../product-backlog.md).

**Current behavior vs this use case:** not built. A draft cannot be removed today, by API or web.

## Goal

A seller removes a draft the organization no longer wants, so the organization's listings show only work that matters.

## Primary Actor

- Seller organization member with listing permission (owner or manager)

## Stakeholders

- **Seller organization** — wants a tidy list without abandoned or mistaken drafts.
- **Marketplace operator** — relies on listings never being hard-deleted, so the record survives.
- **Buyer** — never saw the draft, so is unaffected.

## Preconditions

- The actor is signed in and is an owner or manager of an active seller organization.
- A `Draft` listing of that organization exists.

## Trigger

The seller chooses to discard a draft.

## Main Flow

1. The seller chooses to discard a draft.
2. The product explains that a discarded draft cannot be recovered, edited, or published. The seller confirms.
3. The product checks that the listing is still a draft.
4. The listing becomes `Discarded` and the time is recorded. It is kept, never deleted.
5. It no longer appears in the organization's listings ([UC-010](UC-010-member-reviews-organization-listings.md)), and opening it directly behaves as if it does not exist.
6. The seller is returned to the organization's listings.

## Alternate / Error Flows

### E1: The listing is not a draft

- Condition: the listing is `Active` or `Archived`.
- Steps: refused. An active listing is archived instead ([UC-009](UC-009-seller-archives-listing.md)).
- Outcome: nothing changes.

### E2: Already discarded

- Condition: the draft was already discarded, for example after a double click or another member discarding it first.
- Steps: the product answers as for a listing that does not exist.
- Outcome: nothing changes. No second discard time is recorded.

### E3: Not allowed

- Condition: the actor is signed out, is a viewer, belongs to a different organization, or is a platform admin.
- Steps: the action is refused. A listing of another organization is not revealed.
- Outcome: nothing changes.

### E4: Organization deactivated

- Condition: the actor's organization has been deactivated.
- Steps: the action is refused (UC-003 E6).
- Outcome: nothing changes.

## Postconditions

- The listing is `Discarded` permanently and kept on record.
- No seller or buyer view shows it. Operators can still inspect it.

## Data / Validations

- Inputs: none.
- Rules: only a `Draft` can be discarded. Discarded is terminal and never shown outside operator inspection.
- Outputs: none beyond confirmation.

## Observability

- Logs: draft discarded (actor, organization, listing).
- Metrics: drafts discarded; age of drafts at discard.

## Security / Compliance

- Auth: signed in.
- Authorization: owner or manager of the organization owning the listing, which must be active.
- Audit: the discard time is recorded. Which member discarded it waits for P1-019.

## Non-Goals (this use case)

- Restoring a discarded draft; discarding several drafts at once; automatic clean-up of old drafts.
- Removing active or archived listings.

## Success Metric

A seller removes an unwanted draft in two clicks, and it never reappears for anyone in the organization.

## Mapping to Architecture

- Commands: `Listings.DiscardListingDraft` (new)
- Persistence: a `discarded` listing status with its timestamp; no row is deleted
