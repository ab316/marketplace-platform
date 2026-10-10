# Changelog

Nothing has been released. This repository is in initial development; the entries below summarize the current baseline. Setup changes and internal tooling history live in git.

## [Unreleased]

### Changed

- Moved to Node 26 and pnpm 12; shared packages are consumed as TypeScript source, and strict type-aware checking now covers tests and tooling.
- Replaced ESLint and Prettier with Oxlint and Oxfmt across workspace checks, Git hooks, and editor settings, retaining the lint rules and standardizing line endings to LF.
- Replaced Mocha, Chai, Sinon, and c8 with Vitest for backend tests and coverage.

### Added

- pnpm monorepo scaffold with a backend workspace, placeholder web app, and shared packages.
- Product direction and MVP scope for a trust-centered marketplace, with a roadmap toward the first visible workflow.
- Architecture decisions and engineering standards for module boundaries, financial invariants, transactional outbox events, and interface-first testing.
- Shared AI development instructions and optional role skills for Claude Code, Codex, and Gemini.

Future entries should describe notable product or architecture changes. Update `[Unreleased]` with the relevant implementation PR; use [the release checklist](docs/RELEASE_CHECKLIST.md) when preparing the first release.
