# AI Agent System

This directory contains role definitions for AI agents working in this repository.

For system invariants, architectural constraints, and change control rules, all agents must first read [`docs/AGENT_GUIDELINES.md`](../docs/AGENT_GUIDELINES.md).

---

## How to Use

### In This IDE (Slash Commands)

Workflows are registered as slash commands under `.agents/workflows/`. Type the command at the start of a conversation:

| Slash Command    | Stage                | What It Does                                                           |
| ---------------- | -------------------- | ---------------------------------------------------------------------- |
| `/product-owner` | 📝 Defined           | Turns a rough idea into a scoped user story with acceptance criteria   |
| `/risk-review`   | 🧠 Risk Review       | Identifies financial, concurrency, and event risks; outputs guardrails |
| `/architect`     | 🏗 Architecture      | Produces a minimal, correct design aligned to repo architecture        |
| `/implement`     | 💻 Implementation    | Implements one vertical slice with tests and observability             |
| `/qa`            | 🔥 Break It          | Generates a destructive test matrix and automation plan                |
| `/review`        | 🚀 Production Review | PR preflight — checks correctness, safety, and completeness            |

Each workflow hands off to the next: at the end of each step, the agent will suggest which command to run next.

### In External Tools (Claude, Codex, ChatGPT)

Use the role files as system prompts or project instructions:

1. Start a new conversation or project.
2. Paste the contents of `agent/shared.md` as the base system prompt.
3. Add the relevant role file (`po.md`, `architect.md`, etc.) after it.
4. The role file will tell the agent which repo docs to read — provide those as context or attachments.

---

## Role Files

| File             | Role                           | Reads                                                                   |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------- |
| `shared.md`      | Base rules (all roles inherit) | `docs/AGENT_GUIDELINES.md`                                              |
| `po.md`          | Product Owner                  | `docs/product/vision.md`, `docs/product/non-functional-requirements.md` |
| `cto.md`         | CTO / Risk Reviewer            | `docs/AGENT_GUIDELINES.md` (invariants)                                 |
| `architect.md`   | Architect / Tech Lead          | `docs/architecture/manifest.json`, `backend/REPO_MAP.md`, catalogs      |
| `implementer.md` | Implementer                    | `docs/architecture/backend/REPO_MAP.md`, `docs/AGENT_GUIDELINES.md`     |
| `qa.md`          | QA / Test Designer             | `docs/AGENT_GUIDELINES.md` (invariants)                                 |
| `reviewer.md`    | Reviewer                       | `docs/AGENT_GUIDELINES.md`, `docs/architecture/backend/REPO_MAP.md`     |

---

## Pipeline Flow

```
/product-owner → /risk-review → /architect → /implement → /qa → /review → merge
```

Not every feature needs all stages. Simple CRUD with no financial impact can skip `/risk-review` and go straight from `/product-owner` to `/architect`.

---

## GitHub Issue Templates

When drafting issues, use the repository templates:

- Feature work: `.github/ISSUE_TEMPLATE/feature.md`
- Bug reports / hotfixes: `.github/ISSUE_TEMPLATE/bug.md`

---

## When to Skip Stages

| Change Type                                 | Recommended Path                                               |
| ------------------------------------------- | -------------------------------------------------------------- |
| New feature with financial impact           | Full pipeline: PO → Risk → Architect → Implement → QA → Review |
| New feature, no financial impact, no events | PO → Architect → Implement → Review                            |
| Bug fix in a single module                  | Implement → Review                                             |
| Refactor (no behavior change)               | Implement → Review                                             |
| New API endpoint (simple CRUD)              | PO → Architect → Implement → Review                            |
| Hotfix (critical production issue)          | Implement → Review (fast-track)                                |

When in doubt, run `/risk-review` — it takes 5 minutes and may catch something.
