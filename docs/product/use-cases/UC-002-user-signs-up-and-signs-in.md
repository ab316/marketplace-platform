# UC-002: User Signs Up and Signs In

Owner: product (identity)
Status: Implemented
Last updated: 2026-10-31

First slice of the Identity and Access Control phase ([PD-0003](../decisions/0003-identity-and-organization-access.md), [feature spec](../feature-specs/identity-and-access-control.md)). A visitor creates an account with email and password and signs in to get an authenticated session; every authenticated API action is attributed to that user. Replaces the `x-actor-id` stub. No SSO, no email verification, no password reset in this slice (the latter two are backlog P1-008/P1-009). The web sign-in/sign-up pages are implemented per ADR-011; the design contract is [`docs/design/auth-pages.md`](../../design/auth-pages.md).

## Goal

A person can create an account and prove who they are, so the marketplace can attribute and authorize every action.

## Primary Actor

- Visitor / registered user (buyers and future sellers alike — sign-up creates a plain user; seller capability comes from organization membership, UC-003).

## Stakeholders

- **User** — wants simple account creation and safe credential handling.
- **Marketplace operator** — wants every action attributable to a real account.
- **Platform** — wants the authentication base all later authorization builds on.

## Scope decisions (settled for this use case)

1. **Credentials:** email + password only. Email is the unique login identifier (case-insensitive).
2. **No verification:** the account is usable immediately after sign-up. Email verification is deferred (P1-008).
3. **No recovery:** password reset is deferred (P1-009); a user may change their password while signed in.
4. **Sessions:** signing in issues an opaque session token (ADR-008, proposed); signing out revokes it; changing the password revokes all of the user's sessions.
5. **Platform admins are never created via sign-up**; they are provisioned manually.

## Preconditions

- None for sign-up. A registered account for sign-in.

## Trigger

A visitor chooses to create an account, or a registered user signs in.

## Main Flow

1. **M1.** The visitor submits email, password, and display name.
2. **M2.** The system validates the input (well-formed email; password meets the minimum policy — at least 10 characters; display name non-empty) and that the email is not already registered.
3. **M3.** The account is created as an active, unverified user with no organization membership.
4. **M4.** The user signs in with email and password; the system verifies the credentials and issues a session token with a bounded lifetime.
5. **M5.** Subsequent requests presenting the session act as that user; the user can view their own account profile.
6. **M6.** The user signs out; the session is revoked immediately.

## Alternate / Error Flows

### E1: Email already registered

- Condition: at M2 the email matches an existing account (case-insensitive).
- Steps: sign-up is rejected with a validation error on the email field.
- Outcome: no account is created or modified.

### E2: Invalid credentials at sign-in

- Condition: unknown email or wrong password.
- Steps: sign-in fails with one generic "invalid email or password" error — identical for both causes, with no timing or wording difference that reveals whether the email exists.
- Outcome: no session is issued.

### E3: Repeated failed sign-ins

- Condition: repeated failures for the same account or source.
- Steps: further attempts are rate-limited/temporarily rejected.
- Outcome: brute-force attempts are slowed; legitimate sign-in works after the window passes.

### E4: Expired or revoked session

- Condition: a request presents a session that has expired, was signed out, or was revoked by a password change.
- Steps: the request is rejected as unauthenticated (standard error envelope); the user must sign in again.
- Outcome: no action is performed.

### E5: Password change

- Condition: a signed-in user changes their password, providing the current password.
- Steps: with a wrong current password the change is rejected; on success all the user's sessions are revoked and the user signs in again.
- Outcome: stolen sessions die with the old password.

## Postconditions

- An active user account exists with a uniquely owned email, a securely hashed password, and no organization membership.
- Signed-in requests are attributed to the user; signed-out/expired sessions are unusable.

## Data / Validations

| Field        | Rules                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- |
| Email        | Required, well-formed, unique case-insensitively; stored normalized                    |
| Password     | Required, ≥ 10 characters; stored only as a strong hash (never logged, never returned) |
| Display name | Required, non-empty, trimmed                                                           |

### Rules

- One account per email. Sign-up is atomic: concurrent sign-ups with the same email create exactly one account.
- Passwords are hashed with a modern memory-hard algorithm (ADR-008); plaintext never persisted or logged.
- Session tokens are opaque and unguessable; only a hash is stored server-side.
- Anonymous browsing of active listings remains allowed (UC-001 unchanged); creating orders and all seller actions require a session.

## Observability

- Logs: account created; sign-in success/failure (by user id where known — never the password); sign-out; password changed; rate-limit triggered. No credentials or session tokens in logs.
- Metrics: sign-ups, sign-in success/failure counts, rate-limit activations, active sessions.
- Audit: account creation and password changes are attributable and timestamped.

## Security / Compliance

- Generic failure messages and uniform handling prevent account enumeration (E2).
- Rate limiting on sign-in (E3).
- Session revocation on sign-out and password change (M6, E5).
- Transport security (HTTPS) assumed at deployment; no sensitive data in logs per `ENGINEERING_STANDARDS.md` §6.

## Non-Goals (this use case)

- SSO/social sign-in; email verification (P1-008); password reset (P1-009); MFA; account deletion; profile pictures; organization concerns (UC-003).

## Success Metric

A new user can sign up, sign in, place a UC-001 order attributed to their real account, and sign out — with the `x-actor-id` stub removed from the API.

## Mapping to Architecture

- Module: new `identity` module (reserved in `MODULE_CATALOG.md`).
- Commands: `Identity.SignUp`, `Identity.SignIn`, `Identity.SignOut`, `Identity.ChangePassword`
- Queries: `Identity.GetOwnProfile`, `Identity.ResolveActorContext` (per-request)
- Integration events: none (synchronous request-path behavior only).
- Persistence: `users`, `user_credentials`, `sessions`.
- Session strategy: ADR-008 (proposed).
