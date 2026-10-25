# Feature Spec: Identity and Access Control

## Status

Done — shipped as roadmap Phase 2. Follow-ups tracked as backlog P1-008 (email verification) and P1-009 (password reset).

## Summary

Real accounts replace the stubbed identity: users sign up with email and password and sign in to act as buyers; a seller creates an organization and manages its members with fixed roles (owner, manager, viewer); a platform administrator inspects across organizations and manages the organization lifecycle. Decided by [PD-0003](../decisions/0003-identity-and-organization-access.md); behavior is settled in [UC-002](../use-cases/UC-002-user-signs-up-and-signs-in.md) and [UC-003](../use-cases/UC-003-seller-organization-and-member-management.md).

## Problem

Every API caller today is a seed actor identified by an unauthenticated header. Nothing real protects seller data from other sellers, there is no operator access at all, and no later phase (operator inspection, payments, settlement) can attribute actions to a real, authenticated person.

## Target users

- Buyer — wants an account to order and track orders.
- Seller organization member — wants to act only within their own organization, with permissions matching their job.
- Organization owner — wants to control who on their team can do what.
- Marketplace operator (platform administrator) — wants cross-organization inspection and organization lifecycle control.

## Goals

- A visitor can sign up with email and password, and sign in/out.
- Every API action is attributed to an authenticated user; the `x-actor-id` stub is removed.
- Seller actions are confined to the member's own organization, graded by role.
- A platform administrator can inspect any organization's listings and orders and deactivate/reactivate organizations.
- Membership changes (add, role change, removal) are recorded and take effect immediately.

## Non-goals

- SSO / social sign-in (explicitly excluded for this phase).
- Email verification (deferred — backlog P1-008).
- Password reset (deferred — backlog P1-009).
- Custom or per-organization roles; more than one platform role.
- Multi-organization membership; organization transfer; invitations by email to unregistered people.
- Any UI (web work remains deferred to the web phase).

## User journey

```text
Visitor signs up (email, password, name)
→ signs in, receives a session
→ orders as a buyer, or creates an organization and becomes its owner
→ owner adds registered users as members with a role
→ members act within the organization per their role
→ platform admin inspects across organizations and deactivates an organization when needed
```

## Main flow

1. A visitor signs up with email, password, and display name; the account is created immediately (no verification email).
2. The user signs in; the product issues a session and all subsequent actions are attributed to them.
3. A user without an organization creates one, entering its name and profile basics; they become its owner.
4. The owner adds an already-registered user (looked up by email) as manager or viewer, or another owner.
5. Members act according to role: owners manage everything, managers manage listings, viewers only read.
6. A platform administrator lists organizations, inspects any organization's listings and orders, and can deactivate or reactivate an organization.
7. Every membership and organization lifecycle change is recorded in an audit history visible to owners (their org) and administrators (all orgs).

## Edge cases

- Sign-up with an email that already exists → rejected without revealing whether the email is registered beyond the necessary validation message.
- Sign-in with wrong password or unknown email → identical generic failure; repeated failures are rate-limited.
- Adding a user who already belongs to an organization (including this one) → rejected (one organization per user).
- Removing or demoting the last owner → rejected; every organization always has at least one owner, including under two simultaneous demotions.
- A member changing their own role → rejected (no self-escalation or self-demotion).
- Acting in a deactivated organization → seller write actions rejected; reads remain for members and admins; buyers no longer see its listings; existing orders are untouched.
- A removed member with a live session → loses organization permissions on their next request.

## States and status changes

| Current state              | Action                       | New state                            | Notes                                                             |
| -------------------------- | ---------------------------- | ------------------------------------ | ----------------------------------------------------------------- |
| (no account)               | Sign up                      | Active user                          | Unverified; verification deferred                                 |
| Active user, no org        | Create organization          | Organization `Active`, user is owner | One org per user                                                  |
| Organization `Active`      | Admin deactivates            | Organization `Deactivated`           | Listings hidden, no new orders, no member writes; nothing deleted |
| Organization `Deactivated` | Admin reactivates            | Organization `Active`                |                                                                   |
| Member (any role)          | Owner changes role / removes | New role / no membership             | Last-owner rule applies                                           |

## Permissions

| Action                                                                    | Allowed users                         |
| ------------------------------------------------------------------------- | ------------------------------------- |
| Browse active listings                                                    | Anyone (unchanged, anonymous allowed) |
| Sign up / sign in                                                         | Anyone                                |
| Create order, cancel own order, view own orders                           | Any signed-in user                    |
| Create organization                                                       | Signed-in user with no organization   |
| Edit organization profile                                                 | Owner                                 |
| Add member, change role, remove member                                    | Owner                                 |
| Create/edit/publish/archive listings                                      | Owner, manager                        |
| View organization listings, orders, members, audit history                | Owner, manager, viewer                |
| List all organizations; inspect any org's listings/orders; view any order | Platform admin                        |
| Deactivate / reactivate organization                                      | Platform admin                        |
| Become platform admin                                                     | Nobody via API (manually provisioned) |

## Timeline entries

Orders keep their existing timeline. Organization and membership changes get **audit entries** (organization-scoped, not order timelines):

| Event                                  | User-visible text                                           | Actor          | Notes           |
| -------------------------------------- | ----------------------------------------------------------- | -------------- | --------------- |
| Organization created                   | "Organization created"                                      | Creating user  |                 |
| Member added                           | "\<name> added as \<role>"                                  | Owner          |                 |
| Role changed                           | "\<name> changed from \<role> to \<role>"                   | Owner          |                 |
| Member removed                         | "\<name> removed"                                           | Owner          |                 |
| Organization deactivated / reactivated | "Organization deactivated/reactivated by marketplace staff" | Platform admin | Reason required |

## Notifications

None in this phase (no email infrastructure; notifications remain a later backlog item).

## Business rules

- See "Account and organization access" in [`business-rules-policies.md`](../business-rules-policies.md).
- Fixed roles: owner, manager, viewer; one platform admin role (PD-0003).
- One organization per user; buyers hold no membership.
- Organizations are deactivated, never deleted; history is preserved.
- Every organization has at least one owner at all times.
- No user can change or remove their own membership role.
- Membership/role/lifecycle changes take effect on the next request.

## Acceptance criteria

- [x] A visitor can sign up and sign in; wrong credentials fail generically; duplicate email is rejected.
- [x] All existing listing and order endpoints require a session instead of `x-actor-id` (anonymous browse excepted) and enforce the permission table above, with deny cases tested per role.
- [x] A seller in organization A can never read or write organization B's listings, orders, or members, under any role.
- [x] Last-owner removal/demotion is impossible, including under concurrent attempts.
- [x] A platform admin can list organizations, inspect any order (fulfils the roadmap's operator order-inspection deliverable), and deactivate an organization; deactivation hides listings, blocks new orders and seller writes, and deletes nothing.
- [x] Password change and sign-out invalidate sessions; removal/demotion strips permissions on the next request.
- [x] Membership and lifecycle changes appear in the organization audit history with actor and timestamp.

## Success metrics

- The seeded-actor stub (`x-actor-id`) is deleted from the codebase.
- 100% of the authorization matrix (route × role × own/other/no org) covered by automated allow **and** deny tests.
- Authorization denials are logged with actor, action, and resource.

## Product risks

- Unverified emails until P1-008: accounts can be created with addresses the user doesn't own. Accepted pre-release.
- No password reset until P1-009: lockouts need manual intervention. Accepted pre-release.
- Cross-organization leakage via admin code paths — mitigated by scope-resolution design and matrix tests (see ADR-008 context and the risk constraints in the phase definition).

## Follow-up ideas

- Email verification (P1-008), password reset (P1-009), SSO, member email invitations, multi-organization membership, read-only support role, organization ownership transfer, seller verification/vetting as a trust signal.
