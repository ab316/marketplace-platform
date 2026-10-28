# ADR-012: Federated Sign-In Readiness (Google, Facebook)

Date: 2026-10-27
Status: Accepted
Owners: Platform Team

## Context

Social sign-in ("Continue with Google", "Continue with Facebook") is wanted, but not now — no notification infrastructure, email verification, or password reset exists yet (backlog P1-007 – P1-009), and Phase 6 is about exposing the existing workflow through the web.

The decision worth making today is not _whether_ to build it, but whether the current identity model can absorb it later without a disruptive migration, and what to avoid doing in the meantime. Two facts shape the answer:

- **Authentication and session management are already separate.** ADR-008 establishes that sign-in verifies a credential and then issues an opaque session row. A federated provider replaces only the verification step; everything downstream — sessions, revocation, roles, memberships, the ActorContext — is independent of how the user proved identity.
- **The schema is half-ready.** The `1792923600000_identity-and-access-control` migration already keeps password digests in a separate `user_credentials` table rather than a column on `users`, so no user read selects a digest. But that table is strictly one-to-one with a user and models exactly one authentication method. It has no room for a second.

The risk of deciding nothing is that a feature, test, or admin tool quietly assumes "every user has a password," which is what makes federated sign-in expensive to add later.

## Decision

### 1. Federated sign-in is deferred, and the backend will own it when it lands

The OAuth 2.0 / OpenID Connect client role belongs to the Fastify identity module, not to Next.js. The authorization-code exchange is server-to-server and involves a client secret; the provider's response ends in exactly the same place every other sign-in does — a `sessions` row and the cookie from ADR-011. Next.js contributes only the redirect entry point and the button.

This follows directly from ADR-011: Next.js is a rendering and forwarding layer, and identity is backend-owned.

### 2. One user, many login methods — `user_identities` replaces the one-credential assumption

When federated sign-in is implemented, a table is added:

```
user_identities
  user_id          -> users(id)
  provider         'password' | 'google' | 'facebook'
  provider_subject  -- the provider's stable subject claim (`sub`)
  linked_at
  UNIQUE (provider, provider_subject)
  UNIQUE (user_id, provider)
```

`user_credentials` keeps the Argon2id digest; it becomes the detail table for the `password` provider rather than the sole notion of a credential. A user may hold several identities — a Google login and a password — resolving to one account, one seller organization, and one order history.

This migration is **not** written now. What is decided now is that it is the shape we will adopt, and the invariant below protects the option.

### 3. Until then: no new code may assume a user has a password

Specifically, for any work landing before federated sign-in:

- Do not add a `password_hash` column, field, or required property to `users` or to any user-facing DTO.
- Treat "has a password" as a property of a credential record, not of a user — a missing `user_credentials` row must mean "no password set", never "corrupt user".
- Keep password concerns inside the identity module's credential path. Nothing outside it reads or reasons about digests.
- Admin and operator tooling must not present password existence as a user attribute.

### 4. Account-linking rules, fixed now because they are a security decision

These are settled in advance because getting them wrong is an account-takeover vulnerability, and the pressure to "just match on email" arrives during implementation:

1. **Returning users are matched on `(provider, provider_subject)`, never on email.** Email addresses change and are recycled; the provider's subject claim is stable.
2. **Automatic linking to an existing local account by email is permitted only when the provider asserts the email is verified _and_ the local account's email is verified.** Until email verification exists (P1-008), automatic linking is therefore **forbidden**: a new federated sign-in whose email matches an existing account must require the user to sign in with their existing method first and link explicitly.
3. **Unlinking must leave at least one usable login method.** Removing the last identity is rejected.
4. **Every federated sign-in produces an ordinary session row** (ADR-008), so revocation, expiry, and — once P1-014 lands — the active-session list treat it identically to a password sign-in.

### 5. Implementation constraints for when it is built

- Use a maintained OIDC client library (for example `openid-client`) rather than hand-rolling the protocol. Authorization Code flow with PKCE, `state` validated against the session, and ID-token signature and issuer verified against the provider's JWKS.
- Provider client secrets live in backend configuration only, never in `apps/web`, and never in anything prefixed `NEXT_PUBLIC_`.
- Facebook is additive: a new `provider` value and a provider adapter, not a schema change.

## Consequences

### Positive

- Federated sign-in becomes an additive feature — one table, one module adapter, one route pair, one button — with no change to sessions, roles, authorization, or the frontend's auth contract.
- The dangerous part (account linking) is decided while it is cheap to reason about, rather than under implementation pressure.
- Keeping the OIDC client in the backend means non-browser clients can use federated sign-in too, and the client secret never approaches the frontend tier.
- The existing separation of `user_credentials` from `users` means no data migration of digests is required when `user_identities` arrives.

### Negative / Trade-offs

- A constraint is imposed on all identity work in the interim (§3) for a feature that is not scheduled. The cost is low and the alternative is a disruptive refactor.
- Introducing `user_identities` later requires backfilling one `password` row per existing user with credentials — trivial at current scale, and a reason not to defer it indefinitely.
- Until email verification (P1-008) exists, a user signing in with Google using an email that already has a local account hits an explicit linking step instead of a seamless path. That friction is deliberate; the seamless version is the vulnerability.
- Provider outages become a sign-in failure mode for affected users, mitigated by every account being able to hold a password as well.

## Alternatives considered

1. **Build federated sign-in now, alongside Phase 6**
   - Pros: avoids the later migration; good demo value.
   - Cons: expands Phase 6 beyond exposing existing behavior, and the safe linking rules depend on email verification, which does not exist yet. Sequencing it after P1-008 is strictly cheaper.
2. **Do nothing until it is scheduled**
   - Pros: no constraints on interim work.
   - Cons: the "every user has a password" assumption spreads by default, which is precisely what makes this feature expensive later. The constraint in §3 costs nothing today.
3. **Delegate federated sign-in to Next.js via Auth.js**
   - Pros: fastest path to many providers.
   - Cons: splits identity across two tiers while the backend owns users, roles, memberships, and audit; leaves non-browser clients unserved. Rejected for the same reasons as in ADR-011.
4. **Adopt a hosted identity provider (Auth0/Clerk) for social login**
   - Pros: providers, MFA, and account linking handled.
   - Cons: the organization/membership/role model — the hard part here — stays ours regardless, so the saving is small relative to the external dependency. Consistent with ADR-008's rejection of the same option.
5. **Add `user_identities` now, ahead of the feature**
   - Pros: removes the interim constraint and the later backfill.
   - Cons: an unused table and an unexercised code path; the constraint in §3 achieves the same protection at no schema cost.

## Notes / Links

- Related ADRs: ADR-008 (opaque sessions, Argon2id, `user_credentials`), ADR-011 (cookie transport and the BFF boundary), ADR-010 (frontend stack)
- Related use cases: UC-002
- Related backlog: P2-021 (sign in with Google and Facebook), P1-008 (email verification — prerequisite for automatic account linking), P1-014 (active session and device management)
- Migration that established the current identity schema: `apps/backend/migrations/1792923600000_identity-and-access-control.ts`
