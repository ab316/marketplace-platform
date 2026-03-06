# AI Agent System

This directory contains role definitions for AI agents working in this repository.

For system invariants, architectural constraints, and change control rules, all agents must first read [`docs/AGENT_GUIDELINES.md`](../docs/AGENT_GUIDELINES.md).

---

## How to Use

### In This IDE (Slash Commands)

Workflows are registered as slash commands under `.agents/workflows/`. Type the command at the start of a conversation:

| Slash Command      | Stage                | What It Does                                                                  |
| ------------------ | -------------------- | ----------------------------------------------------------------------------- |
| `/scrum-master`    | 💡 Intake / Ops      | Triage, dedupe, issue/project operations, and stage synchronization           |
| `/product-owner`   | 📝 Defined           | Turns a rough idea into a scoped user story with acceptance criteria          |
| `/risk-review`     | 🧠 Risk Review       | Identifies financial, concurrency, and event risks; outputs guardrails        |
| `/architect`       | 🏗 Architecture      | Produces a minimal, correct design aligned to repo architecture               |
| `/implement`       | 💻 Implementation    | Implements one vertical slice with tests and observability                    |
| `/qa`              | 🔥 Break It          | Generates a destructive test matrix and automation plan                       |
| `/review`          | 🚀 Production Review | PR preflight — checks correctness, safety, completeness, and optional PR post |
| `/tech-writer`     | 🧾 Docs Sync         | Updates changelog/catalog docs after merge (or preview mode)                  |
| `/chronicler`      | 🗂 Memory            | Maintains bounded project memory (`PROJECT_STATE`, worklog, summaries)        |
| `/release-manager` | 🚢 Release           | Drives release checklist, semver rationale, and release draft prep            |

Each workflow hands off to the next: at the end of each step, the agent suggests the next command.

### In External Tools (Claude, Codex, ChatGPT)

Use the role files as system prompts or project instructions:

1. Start a new conversation or project.
2. Paste `agent/shared.md` as the base system prompt.
3. Add the relevant role file (`po.md`, `architect.md`, etc.) after it.
4. Provide referenced repo docs as context.

---

## Role Files

| File                 | Role                           | Reads                                                                          |
| -------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `shared.md`          | Base rules (all roles inherit) | `docs/AGENT_GUIDELINES.md`, `TESTING_STRATEGY.md`, `docs/PROJECT_STATE.md`     |
| `po.md`              | Product Owner                  | `docs/product/vision.md`, `docs/product/non-functional-requirements.md`        |
| `cto.md`             | CTO / Risk Reviewer            | `docs/AGENT_GUIDELINES.md`                                                     |
| `architect.md`       | Architect / Tech Lead          | `docs/architecture/manifest.json`, backend architecture catalogs               |
| `implementer.md`     | Implementer                    | `docs/architecture/backend/REPO_MAP.md`, `docs/AGENT_GUIDELINES.md`            |
| `qa.md`              | QA / Test Designer             | `docs/AGENT_GUIDELINES.md`, `TESTING_STRATEGY.md`                              |
| `reviewer.md`        | Reviewer                       | `docs/AGENT_GUIDELINES.md`, `docs/architecture/backend/REPO_MAP.md`            |
| `scrum-master.md`    | Scrum Master                   | `docs/product/development-workflow.md`, `docs/ops/github-automation-policy.md` |
| `tech-writer.md`     | Technical Writer               | `CHANGELOG.md`, architecture catalogs, use-cases                               |
| `chronicler.md`      | Chronicler                     | `docs/PROJECT_STATE.md`, `docs/ops/worklog/*`, `docs/ops/summaries/*`          |
| `release-manager.md` | Release Manager                | `docs/RELEASE_CHECKLIST.md`, `CHANGELOG.md`, ops policy                        |

---

## Pipeline Flow

Delivery path:

`/scrum-master (intake) → /product-owner → /scrum-master (stage-sync) → /risk-review → /architect → /implement → /qa → /review → merge`

Post-merge path:

`/tech-writer → /chronicler`

Release path:

`/release-manager`

Not every feature needs all stages. Simple non-financial changes can skip `/risk-review`.

---

## GitHub Operations

Agents use guarded direct writes under `docs/ops/github-automation-policy.md`.

Preferred integration: GitHub MCP. Fallback: `gh` CLI. Emergency fallback: draft-only outputs for human execution.

---

## Issue Templates

- Feature work: `.github/ISSUE_TEMPLATE/feature.md`
- Bug reports / hotfixes: `.github/ISSUE_TEMPLATE/bug.md`

---

## Stage Skipping Guidance

| Change Type                                 | Recommended Path                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| New feature with financial impact           | Scrum Master → PO → Risk → Architect → Implement → QA → Review → Tech Writer → Chronicler |
| New feature, no financial impact, no events | Scrum Master → PO → Architect → Implement → Review → Tech Writer → Chronicler             |
| Bug fix in a single module                  | Scrum Master → Implement → Review → Tech Writer → Chronicler                              |
| Refactor (no behavior change)               | Scrum Master → Implement → Review                                                         |
| Hotfix                                      | Scrum Master → Implement → Review → Tech Writer → Chronicler                              |

When in doubt, run `/risk-review`.
