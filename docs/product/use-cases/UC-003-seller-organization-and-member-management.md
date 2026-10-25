# UC-003: Seller Organization and Member Management

Owner: product (identity, access control; touches listings/orders authorization)
Status: Implemented
Last updated: 2026-10-24

Second slice of the Identity and Access Control phase ([PD-0003](../decisions/0003-identity-and-organization-access.md), [feature spec](../feature-specs/identity-and-access-control.md)). A signed-in user creates a seller organization and becomes its owner; the owner manages members with fixed roles; members act within their own organization only, graded by role; a platform administrator inspects across organizations and manages the organization lifecycle (deactivate/reactivate — never delete). Settles backlog items P0-001, P0-002, and the operator-inspection part of P0-013.

## Goal

Sellers work only inside their own organization with permissions matching their role, and marketplace staff can oversee all organizations without destroying history.

## Primary Actor

- Organization owner (creates the organization, manages members)

Supporting actors: organization members (manager, viewer), platform administrator.

## Stakeholders

- **Organization owner** — wants control over who on the team can do what.
- **Members** — want the access their job needs and no accidental damage beyond it.
- **Buyers** — rely on listings being managed only by the selling organization.
- **Marketplace operator** — needs cross-organization oversight and a safe way to retire an organization.

## Scope decisions (settled for this use case)

1. **Self-serve creation:** any signed-in user with no organization creates one and becomes its **owner** (PD-0003).
2. **Fixed roles:** `owner` (everything: profile, members, listings), `manager` (listings; later fulfillment), `viewer` (read-only). No custom roles.
3. **One organization per user.** Adding someone who already belongs to any organization is rejected.
4. **Members are added, not invited:** the owner adds an **already-registered** user by email. Email invitations to unregistered people require email infrastructure and are deferred.
5. **Lifecycle:** `Active ↔ Deactivated`, changed only by a platform administrator with a required reason. **No hard delete.** Deactivation hides listings from buyers, blocks new orders and all seller write actions, and preserves every record; existing orders are unaffected.
6. **One platform role:** `platform_admin`, manually provisioned, with cross-organization read access (including any order — the roadmap's operator order-inspection deliverable) plus organization lifecycle control. Admins do not hold seller roles.

## Preconditions

- Actors are signed-in users (UC-002). Members being added already have accounts.

## Trigger

A user chooses to create an organization; an owner manages members; an administrator manages or inspects organizations.

## Main Flow

Organization creation (C1–C3):

1. **C1.** A signed-in user with no organization submits an organization name (required) and profile basics (description optional).
2. **C2.** The system creates the organization as `Active` and records the creator as its owner.
3. **C3.** The creation is recorded in the organization's audit history. The user can now act as a seller (UC-001 seller flows) for this organization.

Member management (M1–M4, owner only):

1. **M1.** The owner looks up a registered user by email and adds them with a role (owner, manager, or viewer).
2. **M2.** The owner changes a member's role.
3. **M3.** The owner removes a member.
4. **M4.** Every change is recorded in the audit history (who, whom, old/new role, when) and takes effect on the affected user's next request.

Administrator oversight (A1–A3):

1. **A1.** A platform administrator lists all organizations and views any organization's profile, members, listings, and audit history.
2. **A2.** The administrator inspects any order with its timeline, regardless of organization.
3. **A3.** The administrator deactivates an `Active` organization (reason required) or reactivates a `Deactivated` one; the change is audited.

## Alternate / Error Flows

### E1: Creator already belongs to an organization

- Condition: at C1 the user already has a membership.
- Steps: creation is rejected (one organization per user).
- Outcome: no organization is created.

### E2: Adding an unavailable user

- Condition: at M1 the email matches no account, or the user already belongs to an organization.
- Steps: the action is rejected with the specific reason ("no such account" is acceptable here — the owner must know the person registered first).
- Outcome: no membership change.

### E3: Last-owner protection

- Condition: a role change or removal would leave the organization with zero owners — including two concurrent demotions of the final two owners.
- Steps: the action is rejected; under concurrency at most one of the competing changes succeeds.
- Outcome: every organization always has at least one owner.

### E4: Self-modification

- Condition: a member attempts to change or remove their own membership (including an owner demoting themselves).
- Steps: rejected; another owner must make the change. (Leaving an organization voluntarily is out of scope for this slice.)
- Outcome: no change; no self-escalation path exists.

### E5: Insufficient role

- Condition: a manager or viewer attempts member/profile management; a viewer attempts listing writes; any member acts on another organization's resources.
- Steps: rejected with an authorization error; the denial is logged with actor, action, and resource.
- Outcome: no state change. Cross-organization access is never possible for seller roles.

### E6: Acting in a deactivated organization

- Condition: a member performs a seller write action (listing create/update/publish/archive, member management) while the organization is `Deactivated`.
- Steps: rejected; reads remain available to members and administrators.
- Outcome: the organization is frozen, not erased; its active listings are hidden from buyers and cannot take new orders; existing orders and their timelines proceed untouched.

### E7: Administrator attempts seller actions

- Condition: a platform administrator tries to create/edit listings or manage members as if a member.
- Steps: rejected — admin privileges are oversight and lifecycle, not seller capabilities.
- Outcome: clear separation between operating the marketplace and selling on it.

## Postconditions

- The organization exists with ≥ 1 owner at all times; each member holds exactly one role; each user belongs to at most one organization.
- All membership and lifecycle changes are in the audit history with actor and timestamp.
- Listings/orders authorization (UC-001 E2) now derives from real memberships and roles instead of seed actors.

## Data / Validations

| Field             | Rules                                       |
| ----------------- | ------------------------------------------- |
| Organization name | Required, non-empty, trimmed                |
| Description       | Optional                                    |
| Member role       | One of `owner`, `manager`, `viewer`         |
| Lifecycle reason  | Required free text on deactivate/reactivate |

### Rules

- Role capabilities: owner ⊃ manager ⊃ viewer; see the permission table in the [feature spec](../feature-specs/identity-and-access-control.md#permissions).
- Membership uniqueness (one org per user) and the last-owner rule are enforced under concurrency.
- Audit history is append-only.
- Organization records, listings, orders, and audit history are never hard-deleted.

## Observability

- Logs: organization created/deactivated/reactivated; member added/role changed/removed; every authorization denial with actor, action, resource.
- Metrics: organizations created, active vs deactivated organizations, membership changes, authorization denials per route.
- Audit: the organization audit history is the user-visible record for owners (own org) and administrators (all orgs).

## Security / Compliance

- Authorization is enforced in the application layer per action (continuing the UC-001 pattern), not only at the route.
- Admin access is modeled as explicit scope ("all organizations"), not as skipped checks.
- Lifecycle actions require a reason and are audited (`business-rules-policies.md` operator rules).

## Non-Goals (this use case)

- Email invitations to unregistered users; voluntary leave; ownership transfer; multi-organization membership; custom roles; a read-only support role; organization verification/vetting; payout settings; admin UI (API only).

## Success Metric

A seeded demo can be replaced end to end by real flows: sign up → create organization → add a manager and a viewer → the manager publishes a listing, the viewer cannot → a buyer orders → a platform admin inspects the order and deactivates the organization, whose listings vanish from browse while the order and history survive.

## Mapping to Architecture

- Module: `identity` owns `User`, `Organization`, `Membership` and the role→permission mapping (one module per PD-0003; a future split is a documented seam, not a current need).
- Commands: `Identity.CreateOrganization`, `Identity.AddMember`, `Identity.ChangeMemberRole`, `Identity.RemoveMember`, `Identity.DeactivateOrganization`, `Identity.ReactivateOrganization`, `Identity.UpdateOrganizationProfile`
- Queries: `Identity.GetOrganization`, `Identity.ListMembers`, `Identity.ListOrganizations` (admin), `Identity.GetAuditHistory`, `Identity.ResolveActorContext`
- Consuming modules: `listings`/`orders` receive a resolved actor context (user id, platform role, membership + role/permissions) and keep making their own authorization decisions, generalizing `loadOwnedListing` / `GetOrder`.
- Integration events: none; all checks are synchronous on the request path.
- Persistence: `organizations`, `organization_memberships`, `membership_audit_entries`; follow-up migration adds foreign keys from `listings.organization_id` and `orders.buyer_user_id` to the new tables (pre-release database may be reset).
- Known deferral: multi-row changes (e.g. create organization + first membership) should share a transaction; the cross-module/transaction mechanism remains the open ADR-007 follow-up tracked in Phase 1. Until it lands, identity writes use the narrowest available consistency and this gap stays listed in `PROJECT_STATE.md`.
