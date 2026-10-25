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
  `draft → active → archived` lifecycle, pooled stock (total, reserved, sold), and unit
  reservation/release/sale. Owns the
  buyer-facing catalogue. Implements the seller side of UC-001. Authorization decisions stay here;
  identity only supplies the caller's role and membership.
- Owned aggregates/entities: `Listing` (including its stock).
- Public commands: `CreateListingDraft`, `UpdateListingDraft`, `PublishListing`, `ArchiveListing`,
  `ReserveListingUnit`, `ReleaseListingUnit`, `MarkReservedUnitSold`.
- Public queries: `BrowseActiveListings`, `GetListingDetail`, `ListOrganizationListings`.
- Publishes/Consumes integration events: none.
- Required ports: `ListingRepository`, `OrganizationDirectory` (adapted over the identity module's
  public API in `src/bootstrap/organization-directory.ts`, so a deactivated seller leaves the
  catalogue and stops taking orders).
- Tables: `listings`.
- README: `apps/backend/src/modules/listings/README.md`

### orders

- Responsibilities: single-unit orders, the immutable listing snapshot, the 24-hour reservation
  window and its expiry, buyer cancellation, the order timeline, and — driven by the payments
  module — the `paid_into_escrow` transition, the payment hold, and the frozen fee rate (UC-004).
  Implements the buyer side of UC-001.
- Owned aggregates/entities: `Order`, `TimelineEntry`, `ListingSnapshot`.
- Public commands: `CreateOrder`, `CancelOrder`, `ExpireOverdueOrders`, `HoldOrderForPayment`,
  `MarkOrderPaid`, `RecordPaymentFailed`, `RecordPaymentReturned` (the last four have no HTTP
  route; the payments module calls them).
- Public queries: `GetOrder` (with payment summary), `ListBuyerOrders`.
- Publishes/Consumes integration events: none. Cross-module effects are synchronous (ADR-009 §4);
  `OrderPlaced.v1` / `OrderPaid.v1` wait for the outbox.
- Required ports: `OrderRepository`, `ListingReservations` (adapted over the listings module's
  public API in `src/bootstrap/listing-reservations.ts`).
- Tables: `orders`, `order_timeline_entries`.
- README: `apps/backend/src/modules/orders/README.md`

### ledger

- Responsibilities: the append-only double-entry journal and derived account balances (ADR-003);
  the only module that writes money. Accounts: `provider_clearing`, `order_escrow`,
  `seller_balance`, `platform_fee_revenue`. Append-only and balance rules are enforced by the
  database. Operator financial history per order (PD-0004 §8).
- Owned aggregates/entities: `JournalEntry` (with `JournalLine`s), `Account`.
- Public commands: `PostJournalEntry` (idempotent by key), `RebuildAccountBalances`.
- Public queries: `GetAccountBalance`, `GetJournalEntryByKey`, `GetOrderFinancialHistory`.
- Publishes/Consumes integration events: none.
- Required ports: `LedgerRepository`.
- Tables: `ledger_accounts`, `ledger_journal_entries`, `ledger_journal_lines`,
  `ledger_account_balances`.
- README: `apps/backend/src/modules/ledger/README.md`

### payments

- Responsibilities: payment attempts for orders (UC-004), the provider boundary (port plus signed,
  deduplicated webhook; simulated provider in Phase 4), the 15-minute attempt timeout, and the
  ordered idempotent writes that move money into escrow and the order to paid (ADR-009 §3).
- Owned aggregates/entities: `PaymentAttempt`; provider event records.
- Public commands: `StartPayment`, `HandleProviderCallback`, `ExpirePendingPaymentAttempts`.
- Public queries: `GetOrderPayments`.
- Publishes/Consumes integration events: none (ADR-009 §4).
- Required ports: `PaymentAttemptRepository`, `PaymentProvider`, `PayableOrders` (adapted over
  orders in `src/bootstrap/payable-orders.ts`), `LedgerPostings` (adapted over ledger in
  `src/bootstrap/ledger-postings.ts`), `PaymentPolicy`.
- Tables: `payment_attempts`, `payment_provider_events`.
- README: `apps/backend/src/modules/payments/README.md`

## Not yet implemented

- **fulfillment / release / settlement** — Phase 5.
