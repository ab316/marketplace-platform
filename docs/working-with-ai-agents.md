# Working with the AI Agents

A practical, human-facing guide to driving this repo with AI. For the full picture (loop, rules, where everything lives) read [`AGENTS.md`](../AGENTS.md); this file focuses on _how you actually use the agents day to day_, with worked examples.

## The idea in one minute

The agent "roles" in `agent/*.md` are **lenses, not a team you must assemble**. Most of the time you open an AI session, describe what you want, and it runs the whole loop. You reach for a specific role only when you want a focused pass — a risk review before building something around money, a design review of boundaries, a destructive QA matrix.

Roles are defined **once** in `agent/*.md` (with shared base rules in `agent/shared.md`) so every tool behaves the same. The slash commands below are thin shortcuts that just tell the agent "act as this role."

## Invoking a role

Each role has a slash command. They map to the role files like this:

| Command            | Role file            | For                                                      |
| ------------------ | -------------------- | -------------------------------------------------------- |
| `/product-owner`   | `po.md`              | Scope a rough idea into a story with acceptance criteria |
| `/risk-review`     | `cto.md`             | Surface financial / concurrency / event / auth risks     |
| `/architect`       | `architect.md`       | Module boundaries and a minimal correct design           |
| `/implement`       | `implementer.md`     | Build one vertical slice with tests                      |
| `/qa`              | `qa.md`              | Destructive test matrix and exit criteria                |
| `/review`          | `reviewer.md`        | PR preflight: correctness, safety, completeness          |
| `/scrum-master`    | `scrum-master.md`    | Issue intake, triage, dedup, closeout                    |
| `/tech-writer`     | `tech-writer.md`     | Post-merge changelog / catalog updates                   |
| `/chronicler`      | `chronicler.md`      | Keep project memory bounded                              |
| `/release-manager` | `release-manager.md` | Release checklist and semver rationale                   |

**By tool:**

- **Claude Code** — works out of the box: type `/architect build the listing form`.
- **Gemini CLI** — works out of the box (commands live in `.gemini/commands/`): `/architect`.
- **Codex** — run `make codex-commands` once (Codex only loads prompts from `~/.codex/prompts`), then use `/architect` (or `/prompts:architect`).
- **Any tool / external chat** — the portable fallback always works: _"Act as the role in `agent/architect.md` (and `agent/shared.md`). Task: …"_

Everything after the command is passed to the agent as the task, e.g. `/implement seller can edit a draft listing`.

## How much process? (the only rule that matters)

- **Money / concurrency / event code** — payments, ledger, settlement, refunds, outbox/messaging, idempotency, concurrency-sensitive state transitions: **go slow.** Put invariants in the domain, add destructive tests, update the event catalog. When unsure if something is in this bucket, assume it is.
- **Everything else:** just build it with focused tests.

You don't need to memorize tiers. If it doesn't touch money or shared state under concurrency, treat it as light.

---

## Example 1 — a simple change (the common case)

> _"Make the empty-state copy on the seller dashboard friendlier."_

This touches no money and no shared state. One pass, one session:

1. Open an AI session and just ask: _"Update the seller dashboard empty-state copy to be friendlier, and fix the affected component test."_
2. (Optional) `/review` for a second pair of eyes on the diff.
3. Merge. If it's user-visible, add one line to `CHANGELOG.md`.

No issue, no risk review, no ADR, no use case — in product terms this is a Level 1 improvement (see `docs/product/product-operating-model.md`): acceptance criteria are the handoff, and you only amend a use case if one documents the behavior you changed. That's the default path — don't add ceremony it doesn't need.

---

## Example 2 — a higher-risk feature (money involved)

> _"Sellers can withdraw their available balance to a bank account."_

This moves money, so it earns the fuller flow. You chain a few roles, but you're still driving — each step is a quick focused session, not a committee.

1. **Scope it.** `/product-owner sellers can withdraw available balance to a bank account` → a story with acceptance criteria ("withdrawal can't exceed available balance", "a failed transfer never loses funds"). A feature this size (Level 2+) lands as a feature spec in `docs/product/feature-specs/`, then gets distilled into one or more use cases in `docs/product/use-cases/` once behavior settles — the use case is the implementation gate (`docs/product/product-operating-model.md`).
2. **Risk review.** `/risk-review` on that story → failure modes (double-withdrawal under concurrency, duplicate provider callbacks, partial failures) and guardrails (idempotency key per withdrawal, optimistic lock on balance, outbox for `WithdrawalRequested.v1`).
3. **Design the boundaries.** `/architect` → which module owns withdrawals, command/query split, transaction boundaries, the versioned event.
4. **(If there's UI)** capture the Figma design under `docs/design/seller-withdrawal.md` and have the story reference it.
5. **Build.** `/implement` → the vertical slice: invariant inside the aggregate, idempotent handler, outbox publish, UI against the design spec, with unit + integration (real DB, asserts outbox rows) + API tests.
6. **Break it.** `/qa` → the destructive matrix: concurrent withdrawals, duplicate callback, transfer failure + retry, replay safety.
7. **Review.** `/review` → PR preflight (P0/P1/P2). Fix the P0s, then merge.
8. **Record.** `/tech-writer` updates `CHANGELOG.md` + `EVENT_CATALOG.md`; `/chronicler` trims `PROJECT_STATE.md`.

You can skip steps when the answer is already obvious — the chain is the _maximum_ for high-risk work, not a mandatory checklist for every feature.

---

## Tips

- **Start small.** One vertical slice per pass beats a big-bang change the agent can't reason about.
- **Let it read first.** Each role reads its own file plus `agent/shared.md` and the docs they reference — point it at the relevant use case or REPO_MAP if you have one.
- **Keep decisions in docs, not chat.** Durable choices belong in a use case, a product decision (`docs/product/decisions/`, PDs), or an ADR (`docs/decisions/`) — not buried in an issue comment or a transcript.
- **Memory stays small.** `docs/product/roadmap.md` (direction), `docs/PROJECT_STATE.md` (state), `CHANGELOG.md` (changes), and git history. That's it.
- **The board is yours, not the agent's.** The GitHub Project board is for you and stakeholders to track status; agents don't drive it. They'll open or update a plain issue if you ask.
