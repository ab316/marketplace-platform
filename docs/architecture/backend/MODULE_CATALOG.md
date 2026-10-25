# Backend Module Catalog

Each module is a bounded context under: apps/backend/src/modules/<module>/

For each module include:

- Responsibilities
- Owned aggregates/entities
- Public commands/queries
- Publishes/Consumes integration events
- Required ports

## Modules

### identity

- Responsibilities: accounts and opaque sessions (UC-002); seller organizations, membership, the
  fixed role set (`owner`/`manager`/`viewer`), the `platform_admin` platform role, organization
  `active ↔ deactivated` lifecycle, and the append-only organization audit trail (UC-003). Resolves
  the `ActorContext` every other module authorizes against. Scope fixed by PD-0003; session
  strategy by ADR-008.
- Owned aggregates/entities: `User`, `Organization` (owning `Membership` and
  `OrganizationAuditEntry`), `Session`.
- Public commands: `SignUp`, `SignIn`, `SignOut`, `ChangePassword`, `CreateOrganization`,
  `UpdateOrganizationProfile`, `AddMember`, `ChangeMemberRole`, `RemoveMember`,
  `DeactivateOrganization`, `ReactivateOrganization`, `ProvisionPlatformAdmin` (no HTTP route).
- Public queries: `ResolveActorContext`, `GetOrganization`, `ListOrganizationMembers`,
  `GetOrganizationAudit`, `ListOrganizations`, `OrganizationDirectory` (internal, for other
  modules).
- Publishes/Consumes integration events: none; all checks are synchronous on the request path.
- Required ports: `UserRepository`, `OrganizationRepository`, `SessionRepository`,
  `PasswordHasher`, `SessionTokenFactory`.
- Tables: `users`, `user_credentials`, `sessions`, `organizations`, `organization_memberships`,
  `organization_audit_entries`.
- README: `apps/backend/src/modules/identity/README.md`

### listings

- Responsibilities: refurbished-laptop listings, their required disclosures, the
  `draft → active → archived` lifecycle, pooled stock, and unit reservation/release. Owns the
  buyer-facing catalogue. Implements the seller side of UC-001. Authorization decisions stay here;
  identity only supplies the caller's role and membership.
- Owned aggregates/entities: `Listing` (including its stock).
- Public commands: `CreateListingDraft`, `UpdateListingDraft`, `PublishListing`, `ArchiveListing`,
  `ReserveListingUnit`, `ReleaseListingUnit`.
- Public queries: `BrowseActiveListings`, `GetListingDetail`, `ListOrganizationListings`.
- Publishes/Consumes integration events: none.
- Required ports: `ListingRepository`, `OrganizationDirectory` (adapted over the identity module's
  public API in `src/bootstrap/organization-directory.ts`, so a deactivated seller leaves the
  catalogue and stops taking orders).
- Tables: `listings`.
- README: `apps/backend/src/modules/listings/README.md`

### orders

- Responsibilities: single-unit orders, the immutable listing snapshot, the 24-hour reservation
  window and its expiry, buyer cancellation, and the order timeline. Implements the buyer side of
  UC-001.
- Owned aggregates/entities: `Order`, `TimelineEntry`, `ListingSnapshot`.
- Public commands: `CreateOrder`, `CancelOrder`, `ExpireOverdueOrders`.
- Public queries: `GetOrder`, `ListBuyerOrders`.
- Publishes/Consumes integration events: none yet. `OrderPlaced.v1` becomes necessary when
  payments react to orders (Phase 4).
- Required ports: `OrderRepository`, `ListingReservations` (adapted over the listings module's
  public API in `src/bootstrap/listing-reservations.ts`).
- Tables: `orders`, `order_timeline_entries`.
- README: `apps/backend/src/modules/orders/README.md`

## Not yet implemented

- **payments / ledger / fulfillment** — Phases 3–4.
