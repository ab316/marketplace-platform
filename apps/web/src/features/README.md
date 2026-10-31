# Feature modules

Workflow-specific UI and behavior lives here, one directory per product capability. Routes under
`src/app/` compose these modules; they do not accumulate business logic themselves.

Current modules: `auth/` (UC-002 over the web — sign-up, sign-in, sign-out per ADR-011), plus the
disposable mockup galleries `home-mocks/` and `auth-mocks/`.

Shape of a feature (see `docs/architecture/web/REPO_MAP.md` §4):

```text
features/listings/
  api/          calls into src/data/, never fetch() directly
  components/   workflow UI for this feature only
  hooks/
  schemas/      form schemas, derived from @acme/api-contracts
  types.ts
  index.ts      the feature's small public surface
```

Rules that matter most:

- A feature is imported through its `index.ts`, not by reaching into its internals.
- Anything reusable across features belongs in `src/components/`, not in a feature.
- Backend access goes through `src/data/`. Features do not call `fetch` themselves.
- Do not duplicate backend business rules here. UI validation improves usability; the backend
  remains authoritative.
- Each feature owns its loading, empty, error, unauthorized, and success states.

Route groups (`app/(buyer)/`, `app/(seller)/`, `app/(operator)/`) are created alongside the first
route that needs them, together with the matching `PROTECTED_PREFIXES` entry in
`src/proxy.ts` and the backend authorization the page relies on.
