# Working with the AI Agents

Start with [`AGENTS.md`](../AGENTS.md). Most tasks need one session: describe the outcome, let the agent inspect the relevant code, implement, verify, and update affected docs. Roles are optional lenses for a focused pass, not a mandatory team.

## Shared instructions and skills

- `AGENTS.md` contains the shared repository instructions. Codex reads it directly; `CLAUDE.md` imports it with `@AGENTS.md`, and `GEMINI.md` imports it with `@./AGENTS.md`.
- `agent/*.md` contains the canonical role guidance; `agent/shared.md` adds common scope and evidence rules.
- `.agents/skills/<name>/SKILL.md` makes each role discoverable in Codex and Gemini.
- `.claude/skills/<name>/SKILL.md` provides a Claude adapter referencing the same role files. Keep skill names, descriptions, and reference targets aligned across the two directories; edit behavior in `agent/`, not in the adapters.

Skills load role details on demand. They may activate when a request matches their description, or you can explicitly select one. Activation does not authorize a larger task, external posting, or a team of subagents. These skills belong to this repository; they are not standalone packages to copy to a global skills directory.

## Invoking a role

| Skill                         | Role file                  | Use it for                                                   |
| ----------------------------- | -------------------------- | ------------------------------------------------------------ |
| `marketplace-product-owner`   | `agent/po.md`              | Scope behavior and acceptance criteria                       |
| `marketplace-risk-review`     | `agent/cto.md`             | Financial, concurrency, event, auth, and architectural risks |
| `marketplace-architect`       | `agent/architect.md`       | Boundaries, contracts, and a minimal design                  |
| `marketplace-implement`       | `agent/implementer.md`     | Build a scoped change with verification                      |
| `marketplace-qa`              | `agent/qa.md`              | Plan or execute risk-based verification                      |
| `marketplace-review`          | `agent/reviewer.md`        | Find actionable defects in a diff                            |
| `marketplace-scrum-master`    | `agent/scrum-master.md`    | Requested issue triage or closeout                           |
| `marketplace-tech-writer`     | `agent/tech-writer.md`     | Synchronize affected documentation in the change PR          |
| `marketplace-chronicler`      | `agent/chronicler.md`      | Refresh current focus, decisions, and risks                  |
| `marketplace-release-manager` | `agent/release-manager.md` | Prepare release evidence and notes for human publication     |

**Claude Code:** `/marketplace-review review the current diff`. Project skills are under `.claude/skills/`.

**Codex CLI / IDE:** `$marketplace-review review the current diff`; use `/skills` or the `$` picker to discover skills. No `make` installation step is needed.

**Gemini CLI:** ask “Use the marketplace-review skill to review the current diff.” Use `/skills list` to inspect discovery and `/skills reload` after adding skills. Trust the workspace before expecting workspace skills to load; Gemini may request consent when activating a skill. Skill names are not custom slash commands.

**Portable fallback:** “Read `agent/reviewer.md` and `agent/shared.md`, then review the current diff.” In an external chat, provide the referenced content if that tool cannot read the repo.

## How much process?

- **Money, concurrency, and events:** identify invariants and transaction ownership, exercise relevant failure/retry/duplicate/replay/concurrency scenarios, and update event documentation with the code. Assume higher risk when uncertain.
- **Everything else:** complete the scoped change with focused verification. Omit irrelevant role sections and unnecessary process artifacts.

Outputs should distinguish proposed work, implemented changes, and verified outcomes. Report commands actually executed, failures, and unrun checks. A test command that finds no tests does not prove behavior.

## Example: a simple change

Once the seller dashboard exists, ask: “Improve the dashboard empty-state copy and verify the affected UI behavior.”

One session can inspect, edit, verify, and update relevant documentation. An optional `marketplace-review` pass checks the diff. No issue, ADR, or feature spec is needed unless the change introduces new behavior or a decision that merits one. The human merges the PR.

## Example: a money feature

“Sellers can withdraw their available balance to a bank account” warrants more deliberate work:

1. Use `marketplace-product-owner` to define scope and failure behavior. For Level 2+ work, record a feature spec and settle behavior in a use case before implementation, per `docs/product/product-operating-model.md`.
2. Use `marketplace-risk-review` and, when needed, `marketplace-architect` to resolve double-withdrawal, duplicate callback, transfer failure, transaction, and replay risks.
3. If UI is involved, reference the finished design in `docs/design/`.
4. Use `marketplace-implement` to build the slice and its primary owning tests. Update the use case and its index row, remove the completed backlog items, and update the event catalog, producer/consumer READMEs, and relevant changelog entries in the same PR. `marketplace-tech-writer` can help with that work before merge.
5. Use `marketplace-qa` for destructive verification and `marketplace-review` for actionable defects. Resolve blockers before human merge.
6. Reconcile status after merge only where needed; use `marketplace-chronicler` if current focus, durable decisions, or risks changed.

These are optional focused passes in the same session or separate sessions. A role recommendation is not release authorization. Humans create/push release tags and publish releases.

## Checking a fresh setup

1. Start in the repo root. Inspect Claude `/memory` for the instruction import and Gemini `/memory show` for the shared instructions. In Codex, ask it to identify the loaded repository instructions and summarize the human release boundary.
2. Confirm all ten `marketplace-` skills appear in the tool's skill discovery UI (`/skills` in Codex/Claude; `/skills list` in Gemini).
3. Invoke `marketplace-review` on a small diff. Confirm it reads `agent/reviewer.md` and `agent/shared.md`, reports actionable findings or none, and distinguishes executed checks from suggestions.
4. Repeat discovery from `apps/backend` if that is where you normally launch sessions. Use the portable fallback if a tool/version does not discover the root skills there.
5. For implementation changes, run `pnpm run check` and the task-relevant behavior checks. Record the installed tool version and any unavailable checks when reporting setup problems.

No live AI smoke test should be reported as passed merely because its Markdown parsed. Skill metadata/reference validation and actual tool discovery are separate checks.

## Official references

Reviewed 2026-10-09; consult these when upgrading a tool:

- [Claude instruction loading and AGENTS.md support](https://code.claude.com/docs/en/memory): direct AGENTS.md loading starts at v2.1.277; a prose-only CLAUDE.md stub can prevent it. An explicit import remains compatible.
- [Claude skills](https://code.claude.com/docs/en/skills): `.claude/skills/` discovery and invocation.
- [Codex skills](https://learn.chatgpt.com/docs/build-skills): `.agents/skills/` discovery and explicit/implicit activation.
- [Codex custom prompts](https://learn.chatgpt.com/docs/custom-prompts): deprecated in favor of skills.
- [Gemini context files](https://geminicli.com/docs/cli/gemini-md/): imports and context filename configuration.
- [Gemini skills](https://geminicli.com/docs/cli/skills/): `.agents/skills/` alias and activation.
