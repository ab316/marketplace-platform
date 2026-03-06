# Ops Memory and Automation Docs

This folder stores bounded operational memory and GitHub automation governance.

## Structure

- `docs/ops/worklog/` — atomic per-PR records
- `docs/ops/summaries/` — compressed weekly/release summaries
- `docs/ops/audit-log.md` — GitHub automation audit trail
- `docs/ops/github-automation-policy.md` — allowed/disallowed automation actions

## Read Order for Agents

1. `docs/PROJECT_STATE.md`
2. relevant canonical docs (architecture/product/changelog)
3. only then related worklogs/summaries

## Purpose

Keep context bounded and durable so agents do not need full issue/chat history for every task.
