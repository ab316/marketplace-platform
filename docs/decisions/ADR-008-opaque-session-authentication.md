# ADR-008: Opaque Server-Side Sessions for Authentication

Date: 2026-10-24
Status: Accepted
Owners: Platform Team

## Context

The Identity and Access Control phase (PD-0003, UC-002/UC-003) replaces the `x-actor-id` stub with real password authentication. The non-functional requirements (§4) name "token-based authentication (JWT)", written before any auth design existed.

Constraints that matter now:

- **Revocation must be immediate.** Removing a member, demoting a role, or deactivating an organization must take effect on the next request. Once money moves (Phase 4), a revoked member who can still act for minutes is an authorization hole, not an inconvenience. Self-contained JWTs cannot be revoked without an accompanying server-side denylist — which reintroduces the per-request lookup JWTs exist to avoid.
- **Single monolith, one database.** There is no service-to-service hop that needs a self-contained token, and stateless scaling (ADR-005) is preserved as long as session state lives in Postgres, not in process memory.
- **Role data must be fresh.** Authorization decisions depend on organization membership and role, which change at runtime. Baking them into a signed token makes every token a stale snapshot.

## Decision

1. **Opaque session tokens, stored server-side.** Sign-in creates a row in a `sessions` table (hashed token, user id, created/expires/revoked timestamps). The client holds only a random opaque token.
2. **Token transport: `Authorization: Bearer <token>`**, with an httpOnly secure cookie added when the web app (Phase 5) arrives. The API stays header-based so tests and the future generated client stay simple.
3. **Per-request actor resolution.** Each authenticated request resolves the session, then loads the user's platform role and organization membership from the database into an `ActorContext`. Role and membership changes therefore take effect immediately; no token re-issue needed.
4. **Immediate revocation events:** sign-out revokes the session; a password change revokes all of the user's sessions; organization deactivation does not revoke sessions but removes the membership from the resolved context, stripping seller permissions on the next request.
5. **Password hashing: Argon2id** via a maintained Node binding, parameters recorded in the identity module README. Hashes never leave the identity module.
6. **Sliding expiry** with an absolute cap (suggested: 30-day absolute, 7-day idle; tune later). Expired/revoked sessions answer 401 with the standard error envelope.
7. **NFR §4 is updated** to "token-based authentication (opaque server-side sessions; see ADR-008)" when this ADR is accepted.

## Consequences

### Positive

- Revocation and role changes are immediate and need no extra denylist machinery.
- No cryptographic token format to get wrong (alg confusion, key rotation, clock skew).
- Stateless app nodes (ADR-005) hold: session state is in Postgres.
- The session lookup joins naturally with the membership lookup every request needs anyway — one indexed query path.

### Negative / Trade-offs

- One database round-trip per authenticated request (mitigable later with a short-TTL cache if measured as a problem; Redis is already in the stack).
- A future extraction of modules into separate services would need either shared session storage or a token exchange — acceptable; ADR-001 defers distribution deliberately.
- Deviates from the literal "JWT" in the NFR document, which this ADR supersedes on acceptance.

## Alternatives considered

1. **Self-contained JWT access tokens (per NFR §4 as written)**
   - Pros: no per-request session lookup; industry-familiar.
   - Cons: revocation requires short TTLs plus refresh tokens plus a denylist — three mechanisms to equal what one sessions table does; roles in tokens go stale; key management surface.
2. **Short-lived JWT + server-side refresh token**
   - Pros: bounded staleness; fewer lookups.
   - Cons: "bounded" staleness is still staleness for authorization data on a money platform; roughly double the moving parts of plain sessions for no current benefit in a monolith. Reasonable future evolution if per-request lookups ever dominate latency.
3. **Third-party hosted auth (Auth0/Clerk/etc.)**
   - Pros: password handling, reset, verification outsourced.
   - Cons: external dependency and cost for a pre-release solo project; the org/membership/role model — the actual hard part here — stays ours regardless; conflicts with the local-first, no-external-dependency dev setup.

## Notes / Links

- Related PD: `../product/decisions/0003-identity-and-organization-access.md`
- Related use cases: UC-002, UC-003
- Related ADRs: ADR-001 (monolith), ADR-005 (stateless scaling), ADR-006 (Kysely/migrations)
- Updates on acceptance: `docs/architecture/non-functional-requirements.md` §4
