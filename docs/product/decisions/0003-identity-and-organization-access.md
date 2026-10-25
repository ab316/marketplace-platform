# Product Decision: Identity, Organization Lifecycle, and Access Roles

## Status

Accepted

## Date

2026-10-24

## Context

The platform has no real identity: the API trusts an `x-actor-id` header matching fixed seed actors, and there are no user or organization records. The next phase introduces sign-up/sign-in and access control, which forces product decisions about who creates organizations, how organizations end, how many organizations a user can act for, and which roles exist. The MVP scope already includes account and organization setup and excludes advanced role customization (`../mvp-scope.md` §1); the backlog already assumes seller self-serve organization creation (P0-001).

## Decision

1. **Sellers create their own organizations (self-serve).** Any signed-in user without an organization can create one; the creator becomes its **owner**. Platform administrators do not create organizations on sellers' behalf.
2. **No hard deletes for organizations.** An organization is **deactivated**, never deleted. Deactivation hides its listings from buyers, blocks new orders and member write actions, and preserves all listings, orders, and history for audit. A platform administrator performs deactivation (and may reactivate).
3. **One organization per user (for now).** A user belongs to at most one organization. A buyer is simply a user with no organization membership. Multi-organization membership is deferred; the data model may allow it, but the product does not.
4. **Fixed seller roles, no custom roles:**
   - **Owner** — full control: organization profile, members and roles, listings. Every organization always has at least one owner.
   - **Manager** — manages listings (and later fulfillment); cannot manage members or the organization profile.
   - **Viewer** — read-only access to the organization's listings and orders.
5. **One platform administrator role.** `platform_admin` can inspect data across all organizations, deactivate/reactivate organizations, and inspect orders (the operator inspection the roadmap already promises). Administrators are provisioned manually (seeded), not via sign-up. A split read-only operator/support role is deferred.
6. **Deferred, tracked on the backlog:** email verification (P1-008), password reset (P1-009), SSO / social sign-in, and multi-organization membership.

## Options considered

### Option A: Admin-curated organizations (operator creates and deletes organizations)

Pros:

- Fits a vetted, curated supply model; stronger trust control at the gate.

Cons:

- Contradicts the existing backlog (P0-001) and MVP scope; adds operator workload before there is an operator UI; hard deletes would destroy order audit history.

### Option B: Seller self-serve creation, deactivate-only lifecycle, fixed roles (chosen)

Pros:

- Matches the documented MVP scope and backlog; preserves auditability (nothing financial or historical is ever destroyed); fixed roles keep access control testable and small.

Cons:

- Unvetted organizations can appear on the marketplace (acceptable pre-launch; verification is a later trust feature); fixed roles may not fit every team shape.

## Reasoning

The repository's product docs are the source of truth, and they already chose self-serve organization setup. A trust-centered marketplace with "always auditable" as a core promise cannot hard-delete the party on one side of historical orders. One-organization-per-user and a fixed three-role set are the smallest model that satisfies the real requirement — sellers only touch their own organization, with graded permissions — without building role administration tooling the MVP excludes.

## Consequences

- Engineering can build identity as one module with a small, enumerable authorization matrix (roles × actions), testable exhaustively.
- Organization "deletion" UX must communicate deactivation honestly; listings and orders survive.
- A future multi-org or custom-role feature is a product change (new PD), not a quiet extension.
- Email verification and password reset are explicit backlog debt; until they ship, accounts are created unverified and a lost password requires manual intervention.

## Affected documents

- `docs/product/roadmap.md` — new Identity and Access Control phase
- `docs/product/mvp-scope.md` — unchanged (this decision implements its §1)
- `docs/product/product-backlog.md` — P0-001/P0-002 amended; P1-008/P1-009 added
- `docs/product/business-rules-policies.md` — account and organization access rules added
- `docs/product/feature-specs/identity-and-access-control.md`
- `docs/product/use-cases/UC-002`, `UC-003`

## Review date

Revisit when preparing the first public release, or earlier if a seller needs multiple organizations or finer-grained roles.
