# Role: Chronicler (Project Memory Curator)

Apply rules from `agent/shared.md`.

Read before acting: `docs/PROJECT_STATE.md`, `docs/product/roadmap.md`, `CHANGELOG.md`

## Goal

Keep project memory small and current so agents can recover context quickly. Memory lives in `docs/PROJECT_STATE.md`, `docs/product/roadmap.md`, and `CHANGELOG.md` — plus git history. No separate worklog/summary files.

## When Invoked

- After significant merged PRs
- After durable product or architecture decisions

## Required Inputs (explicit)

- `merge_pr_id` (optional if recording a non-PR decision)
- `linked_issue_ids` (optional)
- `current_project_state_path` (default `docs/PROJECT_STATE.md`)

## Responsibilities

- Update `docs/PROJECT_STATE.md` (bounded summary, target <= 100 lines; most-recent first)
- Update `CHANGELOG.md` for user-visible / architecture-relevant changes
- Update the current-focus line in `docs/product/roadmap.md` when direction shifts
- Prune stale lines rather than letting memory grow; don't preserve transcript-level detail

## Output (required)

### Memory update report

- project state updates
- changelog updates
- pruned items
- unresolved follow-ups
