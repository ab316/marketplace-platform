# Design: Seller organization setup (create an organization, seller home)

- **Status:** approved (1 November 2026) — build from this spec; the mockup round was skipped (see Open questions)
- **Figma:** none; whether this slice gets an in-repo mockup round first (as the auth pages and
  catalogue did) is an open question below
- **Related use case:** `docs/product/use-cases/UC-003-seller-organization-and-member-management.md`
  (C1–C3 creation, E1 already a member, E5 insufficient role, E6 deactivated, E7 admin)
- **Related decisions:** PD-0003 (self-serve creation, one organization per user, admins never
  sell), ADR-011 (cookie session, Server Actions), ADR-013 (thin async pages)
- **Roles affected:** seller (a signed-in user becoming an owner); buyer and platform admin only
  in what they must _not_ see

## Why this slice

The backend half of UC-003 is implemented and tested: `POST /api/organizations` makes the caller
the owner of a new, active organization and records the creation in the audit history. Nothing in
the web app reaches it. The sign-up form already promises "you set up your seller organization
right after", and the footer's "Sell on Acme Tech" link ends at an FAQ. This slice closes that
loop: a person can go from "I want to sell" to "I own an organization" in the browser. It is also
the first protected seller surface, so it creates the `(seller)` route group and the first
`PROTECTED_PREFIXES` entry that `proxy.ts` has been waiting for.

Scope is **creation and the landing after it**. Member management, profile editing, and listing
publication over the web are later slices; this page must be honest that they are not here yet.

## Route & entry points

- Routes (both inside the new `app/(seller)/` route group; `/seller` becomes the first entry in
  `PROTECTED_PREFIXES`):
  - `/seller/setup` — the create-organization form.
  - `/seller` — the seller home: the organization summary a member lands on. In this slice it is
    deliberately small; later slices (members, listings, orders needing attention — P0-015) grow
    it rather than adding new landing pages.
- How the user arrives:
  - **Header, signed in, no organization:** nothing extra — just the display name. Decided
    2026-11-01: buyers are the vast majority and a header call to action to sell is noise for
    them. The path to selling is the discreet footer link "Sell on Acme Tech" → `/seller/setup`
    (protected, so a visitor goes through sign-in/sign-up with `next` preserved).
  - **Header, member of an organization:** the organization name (truncated) as a link →
    `/seller`. Replaces the bare display-name text for members.
  - **Header, platform admin:** neither link. Admins do not sell (UC-003 E7); their surface is a
    later operator slice.
  - **Anonymous:** the same footer link, plus a "Create your seller organization" call to action
    in the FAQ's selling section. Because the route is protected, `proxy.ts` bounces to
    `/sign-in?next=/seller/setup`; the sign-in ↔ sign-up cross-links already carry `next`, so a
    brand-new seller signs up, is signed straight in, and lands on the form.
- After a successful creation the user is redirected to `/seller`.
- **Sign-in landing (interim, decided 2026-11-01):** a member of a seller organization who signs
  in without an explicit `next` lands on `/seller`; everyone else lands on the storefront. The
  roadmap's dashboards (P0-014 buyer, P0-015 seller) replace this rule with role-aware homes.

## User states

### `/seller/setup`

- **Anonymous:** redirected to sign-in with `next` preserved (proxy, cookie presence only; the
  backend still authorizes the actual call).
- **Already a member (any role, active or deactivated organization):** redirected to `/seller`.
  The form is never shown to someone who cannot use it (UC-003 E1 made visible, not an error).
- **Platform admin:** a forbidden notice in place of the form — "Marketplace staff accounts
  don't sell on Acme Tech" — with a link home. No form, no submit.
- **Default (signed in, no organization):** the form, with a short explanation panel beside or
  above it (see Key components).
- **Validation error:** field-level, from the shared `createOrganizationRequestSchema`: name
  required (trimmed, 1–140 characters); description optional, at most 2000 characters. Errors
  sit on their fields; the submit stays enabled.
- **Conflict (backend answers `409 ALREADY_IN_ORGANIZATION`):** the user already belongs to an
  organization that this page's check did not see — for example created moments ago in another
  tab. Redirect to `/seller`; the truth is "you have an organization", not an error.
- **Rate limited (429):** banner "Too many attempts. Wait a minute, then try again." (same copy as
  the auth pages).
- **Recoverable failure (backend unreachable, 5xx, contract mismatch):** generic banner
  "Something went wrong. Please try again."; the typed values stay in the form.
- **Pending:** controls disabled, submit reads "Creating organization…", `aria-busy` set.
- **Success:** no UI on this page — redirect to `/seller`. The header now shows the organization
  name.

### `/seller`

- **Anonymous:** redirected to sign-in with `next=/seller`.
- **Signed in, no organization:** redirected to `/seller/setup`. (One place to create, no empty
  dashboard to explain.)
- **Platform admin:** the same forbidden notice as above.
- **Member, organization active:** the organization summary (below) and the "what's next" block.
- **Member, organization deactivated:** a status banner above the summary — "Your organization
  was deactivated by marketplace staff on <date>. Its listings are hidden from buyers and seller
  actions are paused; existing orders continue. Contact support if you believe this is a
  mistake." Nothing on the page offers a write action (UC-003 E6). Reads stay available.
- **Loading:** a skeleton of the summary card via `loading.tsx`.
- **Recoverable failure:** the route's `error.tsx` boundary with a retry; the header still
  renders because it fetches the actor independently.

## Key components

- **`features/seller-organization/`** (new feature module; public surface through `index.ts`):
  - `components/create-organization-form.tsx` — Client Component; React Hook Form over the shared
    contract schema (same pattern as `sign-up-form.tsx`); the Server Action arrives as a prop so
    the form is component-testable.
  - `components/organization-summary.tsx` — synchronous presentational component: name,
    description (or "No description yet"), status badge (`Active` / `Deactivated`), "Your role:
    Owner", member count, "Created <date>". Receives a plain view model.
  - `components/seller-next-steps.tsx` — the "what's next" block (see Interaction notes).
  - `actions.ts` — `createOrganizationAction` Server Action: re-parses input with the contract
    schema, calls `POST /api/organizations` through `src/data/api-client.ts`, maps 409 → redirect,
    429 and failures → banner, success → `redirect('/seller')`.
  - `types.ts` — the action's failure shape, mirroring `AuthActionFailure`.
- **`data/server/organization.ts`** — server-only read of `GET /api/organizations/:id` for the
  seller home, validated with `organizationSchema`. The id comes from the actor's `membership`
  (already on `CurrentUser`), so the page makes one extra round-trip, not a search.
- **Pages** (`app/(seller)/seller/page.tsx`, `app/(seller)/seller/setup/page.tsx`) — thin async
  shells per ADR-013: read the actor, branch (redirect / forbidden / render), pass view models.
- **Header** (`components/layout/site-header.tsx`) — the role-aware link described under entry
  points. It already fetches the actor per request, so membership appears on the very next page
  load after creation (ADR-011 §5).
- **Reused primitives:** `Field`, `Input`, a `Textarea` primitive (new in `components/ui/`, the
  first form in the product that needs one), `Button`, `Badge`, `FormErrorBanner`, `EmptyState`,
  `Card`, `Skeleton`.

## Interaction notes

- **The explanation panel says what the user is committing to**, in product language only:
  you become the organization's owner; one organization per account; the organization's name is
  what buyers see on every listing and order; you can add team members later. It must not claim
  verification or vetting — PD-0003 makes creation self-serve and unvetted; seller verification
  is backlog P2-018.
- **Description hint:** "Optional. A line or two about your business; buyers will see it on your
  listings later." Keep it a plain `<textarea>`, no rich text.
- **No "organization type", no VAT/registration number, no payout details.** UC-003's data
  model is name plus optional description; anything else is a product change, not a form field.
- **"What's next" is honest about what exists.** Two cards: "Publish your first listing" and
  "Add your team". Both are marked as not yet available in the web app, with one sentence each
  (listing publication arrives with the UC-001 seller web slice; member management is the next
  organization slice). The same rule the auth pages applied to "forgot password": an honest
  note beats a dead link. When those slices ship, the cards become links.
- **Creation is a POST via Server Action**; never a GET with query parameters (SameSite=Lax
  CSRF posture, ADR-011).
- **No optimistic UI.** The redirect happens only after the backend confirms; membership is
  re-read on the next request rather than patched client-side.
- **Deactivated organizations** show no edit, member, or listing affordances anywhere on the
  page — not disabled buttons, absent ones — so the UI cannot invite a request the backend will
  refuse (UC-003 E6).

## Accessibility requirements

- Every control through the `Field` primitive: programmatic label, hint and error associated via
  `aria-describedby`, `aria-invalid` on the control, `role="alert"` on error text.
- Banners use `role="alert"` with icon plus text; the status badge pairs colour with the word.
- On a failed submit, focus moves to the form-level banner, or to the first invalid field when the
  failure is field-level.
- One `h1` per page ("Set up your seller organization"; on the home, the organization name).
- The organization-name input uses `autocomplete="organization"`.
- Skeletons are `aria-hidden`; the loading state announces "Loading your organization".
- The header's organization link has an accessible name that includes the organization name
  even when visually truncated.

## Acceptance criteria (for this slice)

Behaviour is UC-003's; these criteria cover the web surface only.

- [x] A signed-in user with no organization can reach `/seller/setup` from the footer, submit a
      name (and optional description), and land on `/seller` showing that organization as
      `Active` with "Your role: Owner". The header shows the organization name on that page.
- [x] An anonymous visitor following "Create your seller organization" from the FAQ is sent
      through sign-in (or sign-up) and arrives on `/seller/setup` afterwards.
- [x] A member of any organization visiting `/seller/setup` is redirected to `/seller`; a user
      with no organization visiting `/seller` is redirected to `/seller/setup`.
- [x] A platform admin sees the forbidden notice on both routes.
- [x] An empty or over-long name, or an over-long description, shows a field-level error and
      makes no request.
- [x] A `409 ALREADY_IN_ORGANIZATION` response redirects to `/seller`; a 429 and a 5xx each show
      their banner with the typed values preserved.
- [x] A member of a deactivated organization sees the deactivation banner and no write actions.
- [x] The `(seller)` route group exists and `/seller` is in `PROTECTED_PREFIXES`.
- [x] Tests: component tests for the form and summary states; an MSW integration test for the
      Server Action (request body shape, 409 → redirect, 429, failure, success → redirect); a
      Playwright journey — sign up, enter via the footer link, create the organization, land on
      `/seller`, header shows the name, `/seller/setup` now redirects.
- [x] Docs in the same PR: UC-003 gains a line naming the web surface and this design contract
      (as UC-002 did for the auth pages); the use-case index row and `CHANGELOG.md` are updated;
      `test/e2e/README.md` lists the new journey.

## Backend findings to settle alongside (not web work)

- **Platform admins can create organizations today.** `CreateOrganization` checks only for an
  existing membership; `POST /api/organizations` is absent from the authorization-matrix test.
  UC-003 E7 and PD-0003 say admins never hold seller roles. Recommendation: reject in the
  application layer (an authorization error) and add the route to the matrix in this slice, so
  the web's forbidden notice mirrors a real backend rule rather than papering over a gap.
- **FAQ copy contradicts PD-0003.** The "Who can sell?" answer says "every seller is verified
  before their first listing". Creation is self-serve and unvetted until P2-018 ships.
  Recommendation: reword in this slice to what is true (registered businesses trade under their
  company name; every payment is held in escrow; a published record builds from completed
  orders).

## Open questions

- **Mockup round first, or build from this spec?** The auth pages and catalogue each had a
  `/mocks/*` exploration before implementation. This surface is one short form plus a summary
  card, and the split-panel auth shell already settled the "form beside an explanation" layout.
  Recommendation: skip the mockup round and reuse the auth shell's structure; revisit if the
  seller home grows in P0-015.
- **Header treatment for members.** Showing the organization name in place of the display name
  is proposed above. The alternative is keeping the display name and adding a "Seller" link.
  Recommendation: organization name — it is the identity the person acts under on this site.
- **Mobile.** As with every surface so far, no mobile design exists (see
  `docs/design/catalogue-search.md`). The form is single-column and degrades acceptably; the
  product-wide mobile pass remains the real answer.
