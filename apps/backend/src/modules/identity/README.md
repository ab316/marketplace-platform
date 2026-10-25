# Identity Module

Location: `apps/backend/src/modules/identity/`

Bounded context: who the caller is and what they may do. Accounts and sessions
([UC-002](../../../../../docs/product/use-cases/UC-002-user-signs-up-and-signs-in.md)), plus seller
organizations, membership, and roles
([UC-003](../../../../../docs/product/use-cases/UC-003-seller-organization-and-member-management.md)).
Scope and roles are fixed by
[PD-0003](../../../../../docs/product/decisions/0003-identity-and-organization-access.md); the
session strategy by [ADR-008](../../../../../docs/decisions/ADR-008-opaque-session-authentication.md).

---

# 1. Responsibilities

This module is responsible for:

- Accounts: sign-up, sign-in, sign-out, password change.
- Sessions: issuing opaque bearer tokens, resolving them, and revoking them.
- Seller organizations and their `active ↔ deactivated` lifecycle.
- Membership and the fixed role set (`owner`, `manager`, `viewer`) plus the `platform_admin`
  platform role.
- Resolving the `ActorContext` every other module authorizes against.
- The append-only organization audit trail.

This module is NOT responsible for:

- Deciding whether a _listing_ or an _order_ may be touched. It reports role and membership;
  the owning module makes its own decision. That keeps authorization next to the data it guards.
- Email delivery. Email verification and password reset are deliberately deferred
  (backlog P1-008/P1-009), so there is no mail dependency.

Single source of truth for: **User**, **Organization** (with its membership and audit trail), and
**Session**.

---

# 2. Public API

Declared in `identity.api.ts` and built by `identity.module.ts`. Nothing else is public.

## Commands

- `SignUp` — create an account. Always starts with no organization and no platform role.
- `SignIn` — exchange credentials for an opaque session token.
- `SignOut` — revoke the presented session.
- `ChangePassword` — re-hash and revoke every session the user holds.
- `CreateOrganization` — self-serve; the creator becomes its first owner.
- `UpdateOrganizationProfile` — owners only.
- `AddMember`, `ChangeMemberRole`, `RemoveMember` — owners only.
- `DeactivateOrganization`, `ReactivateOrganization` — marketplace staff only.
- `ProvisionPlatformAdmin` — **not exposed over HTTP**; grants staff standing out of band, so no
  request can escalate a user to admin.

## Queries

- `ResolveActorContext` — the per-request lookup that turns a bearer token into identity, platform
  role, and membership.
- `GetOrganization`, `ListOrganizationMembers`, `GetOrganizationAudit` — members and staff.
- `ListOrganizations` — staff only.
- `OrganizationDirectory` — internal lookup for other modules; takes no actor because it answers a
  structural question ("may this organization transact?"), not a user-facing one.

---

# 3. Domain Model

## Aggregates

- `Organization` (`domain/organization.ts`)
  - Root entity: Organization; owns its `Membership` list and `OrganizationAuditEntry` trail, so
    rules spanning members are enforced in one place under one version guard.
  - Invariants:
    - At least one `owner` at all times; the last owner can be neither demoted nor removed.
    - A user appears at most once in the member list.
    - Nobody may change or remove their own membership (no privilege self-escalation).
    - A deactivated organization accepts no writes other than reactivation.
    - Every change appends an audit entry, so history is always complete.
  - Lifecycle states: `active`, `deactivated`. **Never deleted** (PD-0003).

- `User` (`domain/user.ts`)
  - Invariants: email stored normalized so uniqueness is case-insensitive; a display name is
    always present; platform-admin standing is only ever set by `grantPlatformAdmin`.

- `Session` (`domain/session.ts`)
  - Invariants: usable only while neither expired nor revoked; revocation is terminal.

## Value objects

- `OrganizationRole` and `Permission` (`domain/roles.ts`) — the whole authorization vocabulary.
  Capability is nested: `owner ⊇ manager ⊇ viewer`.

---

# 4. Events

## Domain events

None. Every check is synchronous on the request path.

## Integration events

### Publishes

None. See `docs/architecture/backend/EVENT_CATALOG.md`.

### Consumes

None.

---

# 5. Ports

Declared in `application/ports.ts`, implemented in `infrastructure/`:

- `UserRepository`, `OrganizationRepository`, `SessionRepository` — persistence.
- `PasswordHasher` — hashing behind a port so the algorithm stays an infrastructure choice.
- `SessionTokenFactory` — opaque token generation and digesting.

---

# 6. Persistence

Tables owned by this module:

- `users`, `user_credentials`, `sessions`
- `organizations`, `organization_memberships`, `organization_audit_entries`

Implementations in `infrastructure/persistence/`:

- `PgUserRepository`, `PgOrganizationRepository`, `PgSessionRepository` — Kysely over the migrated
  schema (ADR-006).
- `InMemory*` equivalents for the `memory` persistence mode and tests. They reproduce the
  uniqueness and optimistic-locking guarantees the Postgres versions get from constraints.

Credentials live in their own table so an ordinary user read never selects a password digest.

Database-enforced invariants: unique `users.email`, unique `organization_memberships.user_id`
(one organization per user), unique `(organization_id, sequence)` on the audit trail, and
`RESTRICT` foreign keys from `listings` and `orders` so nothing a record depends on can be deleted.

---

# 7. Transactions & Concurrency

`organizations` carries a `version`. `OrganizationRepository.save` updates only when the stored
version still matches the loaded one and raises `OrganizationConcurrencyError` otherwise. That
guard is what makes the last-owner rule hold under concurrency: two owners demoting each other
simultaneously serialize, and at most one succeeds.

The organization, its members, and its audit entries are written in one transaction, as are a user
and their credentials. These are single-aggregate writes, not the general cross-module transaction
strategy, which ADR-007 still leaves open.

---

# 8. Cross-Module Collaboration

### listings

Mechanism: listings declares its own `OrganizationDirectory` port; the adapter over this module's
`organizationDirectory` is built in `src/bootstrap/organization-directory.ts`, so neither module
imports the other. It lets the catalogue hide a deactivated seller and refuse new reservations.

### every HTTP route

Mechanism: `registerActorResolution` (`src/shared/presentation/request-actor.ts`) runs
`ResolveActorContext` once per request and puts the result on `request.actor`. Reading membership
per request is what makes revocation immediate — no token re-issue, no staleness window.

---

# 9. Testing

- Domain invariants: `test/unit/identity/organization.unit.spec.ts`
- Role/permission mapping: `test/unit/identity/roles.unit.spec.ts`
- Real credential handling: `test/unit/identity/password-hashing.unit.spec.ts`
- Accounts and sessions: `test/integration/api/auth.api.int.spec.ts`
- Organizations and membership: `test/integration/api/organizations.api.int.spec.ts`
- **Authorization matrix** (every route × every caller, allow _and_ deny):
  `test/integration/api/authorization-matrix.api.int.spec.ts`

API suites substitute a fast password hasher, because Argon2id is slow by design; the real hasher
is covered directly by the unit test above.

---

# 10. Known Gaps

- No email verification or password reset (backlog P1-008/P1-009): accounts are created unverified
  and a forgotten password needs manual intervention. Both need email infrastructure.
- Members must already have an account; invitations to an unregistered address are deferred.
- A user belongs to at most one organization, and there is no voluntary "leave" or ownership
  transfer.
- One platform role. A read-only support role is deferred.
- Sessions have a fixed lifetime with no sliding renewal yet; `SESSION_TTL_HOURS` configures it.
