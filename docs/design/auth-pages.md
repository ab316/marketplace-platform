# Design: Sign-in and sign-up pages

- **Status:** approved — the **split panel** direction was chosen and implemented (31 October 2026)
- **Figma:** none; the in-repo mockups were the design input (kept browsable at `/mocks/auth`)
- **Related use case:** `docs/product/use-cases/UC-002-user-signs-up-and-signs-in.md`
- **Related decisions:** ADR-011 (cookie transport, Server Actions), ADR-012 (no social sign-in yet), PD-0003 (no seller account type)
- **Roles affected:** buyer, seller (one shared account; operator accounts are provisioned, never signed up)

## Route & entry points

- Routes: `/sign-in`, `/sign-up`, implemented in `apps/web/src/features/auth/` and composed by
  `app/sign-in/page.tsx` / `app/sign-up/page.tsx`.
- How the user arrives: header buttons ("Sign in", "Create account"), footer links, the
  cross-links between the two pages, and `proxy.ts` redirecting cookie-less visitors of protected
  routes to `/sign-in?next=<path>`.
- A signed-in user visiting either page is redirected home; after sign-in/sign-up the user lands
  on `next` (same-site paths only — anything else falls back to `/`, so the pages cannot
  open-redirect) or home.
- **Auto sign-in after sign-up (decided):** the backend's sign-up response carries no session, so
  the Server Action chains a sign-in with the same credentials. If the chained call fails, the
  user lands on `/sign-in` — the account exists.

## Layout

The split panel: the form beside a trust panel restating the escrow promise (money moves only on
confirmation, sellers are registered organizations, every order keeps its timeline; sign-up adds
the seller path). On small screens the panel collapses to its headline so the form is never
buried. Rationale and the rejected alternative are preserved in the mockups at `/mocks/auth`.

## User states

Reference renderings for every state live at `/mocks/auth/states`.

- **Validation error:** client-side, from the same `@acme/api-contracts` Zod schemas the backend
  parses (email shape, password ≥ 10, display name non-empty); errors sit on their fields.
- **Sign-in failure:** one generic banner — "Invalid email or password." — identical for unknown
  email and wrong password (UC-002 E2), never a field error.
- **Rate limited:** distinct banner ("Too many attempts. Wait a minute, then try again."), because
  the fix is waiting, not retyping (UC-002 E3).
- **Email already registered (sign-up):** field error on email pointing to sign-in (UC-002 E1) —
  unlike sign-in, confirming existence is fine here.
- **Recoverable failure:** backend unreachable or 5xx → generic banner, nothing leaked.
- **Pending:** controls disabled, submit button renames ("Signing in…" / "Creating account…");
  on sign-up the state spans both chained calls.
- **Success:** no UI — redirect with the httpOnly cookie set; the header shows the signed-in user.

## Key components

- `features/auth/components/split-auth-shell.tsx` — the layout; Server Component.
- `features/auth/components/sign-in-form.tsx`, `sign-up-form.tsx` — Client Components; React Hook
  Form over the shared schemas; the Server Action arrives as a prop so the forms are testable.
- `features/auth/actions.ts` — Server Actions per ADR-011 §3: credentials and `Set-Cookie` stay
  server-side; sign-out revokes the backend session row _before_ clearing the cookie.
- `components/feedback/form-error-banner.tsx` — reusable form-level failure banner.
- Site chrome: the header fetches the actor per request (never cached across requests, ADR-011 §5)
  and shows Sign in / Create account, or the display name with a POST sign-out.

## Interaction notes

- **One sign-up for buyers and sellers** (PD-0003): no account-type choice; the form carries a
  note telling sellers to create a personal account first, then an organization.
- **No social sign-in buttons** (ADR-012, P2-021): a provider button is additive later.
- **No "forgot password?" link** (P1-009 pending): the password hint names support as the interim
  path — an honest hint beats a dead link.
- The `next` parameter is carried through the sign-in ↔ sign-up cross-links so switching forms
  does not lose the destination.

## Accessibility requirements

- Every control is wired through the `Field` primitive: programmatic label, hint/error associated
  via `aria-describedby`, `role="alert"` on errors, `aria-invalid` on the control.
- Banners use `role="alert"` with an icon plus text — color is never the only signal.
- `autocomplete`: `email`, `name`, `current-password` (sign-in), `new-password` (sign-up).
- One `h1` per page; the trust panel's headline is decorative `p` text.

## Mockups (kept)

The exploration round remains browsable: gallery at `/mocks/auth`, the rejected focused-card
direction at `/mocks/auth/focused/*`, the states board at `/mocks/auth/states`
(`features/auth-mocks/`). They are static exhibits; the shipped pages live at `/sign-in` and
`/sign-up`.
