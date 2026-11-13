# UC-007: Seller Edits a Listing Draft

Owner: product (listings)
Status: Implemented
Surfaces: API, Web
Last updated: 2026-11-07

Part of [seller listing management](../feature-specs/seller-listing-management.md). Takes over step S2 of [UC-001](UC-001-buyer-places-an-order.md).

**Current behavior vs this use case:** implemented on the API and the web (2026-11-07). An edit sets, changes, or clears any field (`null` clears; nested fields merge) and only well-formedness is checked; brand comes from the curated list (P1-017). On the web, the draft editor at `/seller/listings/[id]` saves the whole form ([design](../../design/seller-listing-management.md)).

## Goal

A seller brings a draft closer to publishable by adding, changing, or clearing its details.

## Primary Actor

- Seller organization member with listing permission (owner or manager)

## Stakeholders

- **Seller organization** — wants drafts to hold accurate work in progress.
- **Buyer** — never sees a draft, so edits to one never affect them.

## Preconditions

- The actor is signed in and is an owner or manager of an active seller organization.
- A `Draft` listing of that organization exists ([UC-005](UC-005-seller-creates-listing-draft.md)).

## Trigger

The seller opens a draft and saves changes to it.

## Main Flow

1. The seller opens a draft. They see its current values and its readiness.
2. The seller adds, changes, or clears any fields.
3. The seller saves.
4. The product checks that the listing is still a draft and that every value present is well-formed (same rules as [UC-005](UC-005-seller-creates-listing-draft.md#rules-well-formedness-checked-whenever-a-value-is-present)).
5. The draft is updated and its update time recorded. Fields the seller did not touch keep their values.
6. The seller sees the updated draft and its readiness.

## Alternate / Error Flows

### A1: Clearing a field

- Condition: the seller removes a value that was set.
- Steps: the field becomes empty.
- Outcome: the draft is saved and its readiness lists that field as missing again.

### A2: Two members edit the same draft

- Condition: another member saved the draft after this seller opened it.
- Steps: the later save is applied over the earlier one.
- Outcome: the last save wins (spec D11). Two saves landing at the same instant are refused one at a time: the second gets a conflict and can be retried. Optimistic locking at the edit itself (the save carries the version the seller opened) is the planned follow-up.

### E1: Malformed value

- Condition: a value present breaks a well-formedness rule.
- Steps: the save is refused with a reason on each offending field.
- Outcome: the draft is unchanged. The web form keeps what the seller typed.

### E2: The listing is no longer a draft

- Condition: the listing is `Active` or `Archived`. Another member may have published it after this seller opened it.
- Steps: the save is refused with the explanation that a published listing's content cannot change (spec D2). The seller sees the listing's current state.
- Outcome: nothing changes.

### E3: Not allowed

- Condition: the actor is signed out, is a viewer, belongs to a different organization, or is a platform admin.
- Steps: the action is refused. A listing of another organization is not revealed.
- Outcome: nothing changes.

### E4: Organization deactivated

- Condition: the actor's organization has been deactivated.
- Steps: the action is refused (UC-003 E6).
- Outcome: nothing changes.

## Postconditions

- The draft holds the saved values, still `Draft`, still invisible to buyers.

## Data / Validations

- Inputs: any subset of the listing fields; each field can be set, changed, or cleared.
- Rules: the well-formedness rules of UC-005. Completeness is not checked.
- Outputs: the updated draft with its readiness.

## Observability

- Logs: draft updated (actor, organization, listing).
- Metrics: edits per draft before publish.

## Security / Compliance

- Auth: signed in.
- Authorization: owner or manager of the organization owning the listing, which must be active.
- Audit: the update time is recorded. Who changed which field is not recorded yet (P1-019).

## Non-Goals (this use case)

- Changing a published listing ([idea 003](../ideas/003-correcting-published-listings.md), P2-023) and restocking (P1-011).
- Discarding (P1-018), change history (P1-019), simultaneous-edit merging.

## Success Metric

A seller completes a draft across several sessions, including correcting and clearing values, without ever being blocked by fields they have not reached yet.

## Mapping to Architecture

- Commands: `Listings.UpdateListingDraft`, accepting cleared fields and checking only well-formedness
- Domain events: none required
