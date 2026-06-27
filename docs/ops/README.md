# Ops Memory and Automation Docs

This folder stores lightweight operational memory and GitHub automation governance.

## Structure

- `docs/ops/worklog/` — significant merged changes, complex debugging notes, or decisions worth preserving
- `docs/ops/summaries/` — optional compressed summaries when worklog volume grows
- `docs/ops/audit-log.md` — GitHub automation audit trail
- `docs/ops/github-automation-policy.md` — allowed/disallowed automation actions

## Read Order for Agents

1. `docs/PROJECT_STATE.md`
2. relevant canonical docs (architecture/product/changelog)
3. only then related worklogs/summaries

## Purpose

Keep context bounded and durable so agents do not need full issue/chat history for every task.

Do not create memory entries for trivial edits. Prefer updating canonical docs directly when that is enough.
