# ADR-011: Cookie Session Transport and the Next.js BFF Boundary

Date: 2026-10-27
Status: Accepted
Owners: Platform Team

## Context

ADR-008 settled how authentication works: opaque session tokens, a `sessions` row per sign-in, per-request actor resolution, immediate revocation. It deliberately left one thing open — "token transport: `Authorization: Bearer <token>`, with an httpOnly secure cookie added when the web app (Phase 6) arrives."

Phase 6 has arrived, and Next.js makes the open question sharper than "header or cookie," because Next.js runs server code of its own. Without an explicit boundary, a Next.js application drifts into becoming a second backend: route handlers that hold session state, middleware trusted as an authorization gate, business rules duplicated to avoid a network hop. Each of those is a correctness or security problem on a platform that moves money.

Constraints:

- **The browser must never hold a session token in JavaScript-readable storage.** A token in `localStorage` is readable by any XSS, and the token here grants full session authority with no second factor.
- **Revocation must stay immediate** (ADR-008). Nothing added for the web app may cache authorization decisions past the current request.
- **The backend stays authoritative** (`REPO_MAP.md` §2, §9). Frontend guards are UX.
- **Next.js must stay stateless** so it scales and redeploys freely, matching ADR-005 for the backend.
- **`REPO_MAP.md` §13 requires an ADR before adding a BFF layer or using Next.js route handlers as a backend facade.** This is that ADR.
- **The monolith is not permanent** (ADR-001). The browser-facing contract should survive extracting identity into its own service.

## Decision

### 1. Next.js is a rendering and forwarding layer, never an authority

The split of responsibility is fixed:

| Concern                                                             | Owner               |
| ------------------------------------------------------------------- | ------------------- |
| Accounts, credentials, sessions, roles, memberships                 | Fastify backend     |
| Every authorization decision                                        | Fastify backend     |
| Holding the session cookie, forwarding it, rendering per auth state | Next.js server      |
| Anything security-relevant                                          | **Not the browser** |

The operative rule, to be applied in review: **a check performed in Next.js is user experience; the same check performed in Fastify is security.** Both exist; only the second is relied upon.

Next.js stores no session state of its own: no server-side session store, no user cache, no in-memory token map. It reads the cookie off the incoming request and forwards it.

### 2. Transport: httpOnly cookie between browser and Next.js, Bearer header between Next.js and Fastify

The opaque token from ADR-008 is unchanged. Only its carrier differs by hop.

```
browser  --( httpOnly cookie )-->  Next.js server  --( Authorization: Bearer )-->  Fastify
```

Cookie attributes: `httpOnly`, `Secure` (except on localhost `http`), `SameSite=Lax`, `Path=/`, and `Max-Age` matching the session's `expires_at`. `SameSite=Lax` blocks cross-site CSRF on state-changing requests while keeping ordinary inbound navigation working; `httpOnly` puts the token out of reach of any XSS.

Keeping the backend header-based — exactly as ADR-008 specified — means the API contract, its tests, and any future non-browser client stay unchanged. The cookie is purely the browser-facing encoding, applied at the Next.js edge.

Next.js is served on the same origin as the browser's requests, so there is no cross-origin cookie problem and no CORS configuration for the web app.

### 3. Sign-in and sign-out run through Server Actions

Credential submission and the `Set-Cookie` both happen server-side:

1. A Server Action posts credentials to `POST /api/auth/sign-in`.
2. The backend verifies them, inserts the session row, and returns the opaque token.
3. The Server Action writes the httpOnly cookie. The token is never serialized into HTML or passed to a Client Component.
4. Sign-out calls `POST /api/auth/sign-out` — which revokes the row server-side — and then clears the cookie.

Clearing the cookie is never the logout mechanism on its own; the row must be revoked, or the token stays valid for anyone who captured it.

### 4. Route protection is layered, and only the backend layer is trusted

1. **Middleware** redirects cookie-less requests away from protected route groups. Cheap, and purely to avoid rendering a shell the user cannot use.
2. **Server Components** fetch the current actor from `GET /api/auth/me` and render the correct navigation, hide unavailable actions, and show unauthorized states.
3. **Fastify** re-validates the session and re-checks platform role, organization membership, and resource ownership on every request. This is the only layer that makes a request safe.

Middleware is explicitly **not** an authorization gate. A 2025 Next.js advisory (CVE-2025-29927) allowed middleware to be bypassed entirely with a crafted header; applications that enforced authorization only in middleware were exposed, while applications that verified at the data source were not. Our layering is already resilient to that class of bug, and must stay that way.

### 5. Role data is never cached beyond the current request

`GET /api/auth/me` resolves platform role and organization membership from the database on each call (ADR-008 §3). Next.js may deduplicate it **within a single request render**, and must not cache it across requests. A revoked session, a demoted member, or a deactivated organization therefore takes effect on the next page load — preserving ADR-008's revocation guarantee through the new layer.

### 6. Next.js route handlers are not an API facade

Route handlers under `app/api/` are permitted only for browser-specific concerns that have no backend equivalent (health checks, cookie-only operations, OAuth redirect endpoints when §7 of ADR-012 lands). They must not proxy, aggregate, or re-shape marketplace endpoints, and must not contain business rules. Data access goes through `src/data/`, called from Server Components and Server Actions.

### 7. The contract survives the microservices split

If identity is later extracted into its own service, the migration is the standard token-exchange pattern: the edge validates the opaque session once, then issues a short-lived signed internal token carrying user id and roles, which downstream services verify locally. ADR-008 already names this as the expected evolution.

The browser-facing contract — httpOnly cookie, opaque token, server-side `sessions` rows — does not change. The frontend is unaffected by that migration, which is the main reason for choosing this boundary.

## Consequences

### Positive

- No session token is reachable from JavaScript, removing the highest-value XSS target.
- ADR-008's immediate revocation is preserved end to end; nothing in the web path caches authorization.
- Next.js stays stateless and horizontally scalable, matching ADR-005.
- The backend API is unchanged and stays header-based, so its tests and future clients are untouched.
- Same-origin serving removes CORS from the web path entirely.
- The authorization model is unaffected by a future service split.

### Negative / Trade-offs

- An extra network hop (browser → Next.js → Fastify) on every request. Acceptable: the hop is server-to-server on an internal network, and it is what keeps the token out of the browser.
- `GET /api/auth/me` runs on most authenticated page renders, adding a database round-trip per page. The mitigation, if measured as a problem, is the short-TTL cache ADR-008 already anticipates — not caching in Next.js.
- Two layers of route protection must be kept in agreement; a protected backend route without the matching UX guard produces a confusing dead end, and the reverse produces a false sense of security.
- `SameSite=Lax` alone is not sufficient if a state-changing `GET` endpoint is ever introduced. The existing convention — state changes use `POST`/`PATCH`/`DELETE` — must hold.
- The web app cannot be served from a different origin than its API path without revisiting the cookie strategy.

## Alternatives considered

1. **Bearer token in `localStorage`, called from Client Components**
   - Pros: simplest mental model; no cookie semantics; API unchanged.
   - Cons: any XSS exfiltrates a full session token; forces client-side data fetching, which forfeits SSR and the SEO requirement. Rejected outright.
2. **Cookie read directly by Fastify (no header translation)**
   - Pros: one transport end to end; Next.js forwards the request verbatim.
   - Cons: makes the API browser-coupled, complicates its tests and non-browser clients, and contradicts ADR-008 §2. The translation is a few lines in the data layer.
3. **A full BFF with per-user server-side session storage in Next.js (e.g. Redis-backed `iron-session`)**
   - Pros: can hide the backend token entirely, store derived UI state.
   - Cons: a second stateful tier with a second expiry and revocation story to keep consistent with the first. Pure duplication; ADR-008's sessions table already is the session store.
4. **Auth.js / NextAuth owning sessions in the Next.js layer**
   - Pros: large ecosystem, fast path to OAuth providers.
   - Cons: puts identity in the frontend tier while the backend already owns users, roles, memberships, and audit; produces two sources of truth and leaves non-browser clients unserved. Conflicts with ADR-008 and `REPO_MAP.md` §2.
5. **Middleware as the authorization gate**
   - Pros: one place to express route rules.
   - Cons: unsafe by construction — it never sees resource ownership, and CVE-2025-29927 demonstrated it can be skipped. Retained as UX only.

## Notes / Links

- Related ADRs: ADR-008 (opaque sessions — this ADR closes its open transport question), ADR-010 (frontend stack), ADR-012 (federated sign-in readiness), ADR-005 (stateless scaling), ADR-001 (modular monolith)
- Related use cases: UC-002, UC-003
- Architecture: `docs/architecture/web/REPO_MAP.md` §5, §6, §9
- Related backlog: P1-014 (active session and device management)
