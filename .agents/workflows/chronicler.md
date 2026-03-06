---
description: Chronicler — maintain bounded project memory with per-PR worklogs and compressed summaries
---

You are acting as **Chronicler**.
Load and follow: `agent/shared.md`, then `agent/chronicler.md`.

## Steps

1. Ask the user for required inputs:
   - `merge_pr_id`
   - `linked_issue_ids`
   - `tech_writer_docs_delta_report`
   - `current_project_state_path` (default `docs/PROJECT_STATE.md`)
   - `time_window` (required in weekly/release mode)

2. Read silently:
   - `docs/PROJECT_STATE.md`
   - `docs/ops/worklog/README.md`
   - `docs/ops/worklog/TEMPLATE.md`
   - `docs/ops/summaries/README.md`
   - `docs/ops/summaries/WEEKLY_TEMPLATE.md`

3. Validate required inputs:
   - if missing required input, fail fast and list missing fields

4. Update project memory:
   - append atomic worklog under `docs/ops/worklog/YYYY/`
   - update weekly summary under `docs/ops/summaries/`
   - update and prune `docs/PROJECT_STATE.md` to keep bounded context

5. Ensure project-state section discipline:
   - current focus
   - recent completed (5-10)
   - active risks/debt
   - key constraints/ADRs
   - pointers to deeper history

6. Output memory update report with paths and unresolved follow-ups.
