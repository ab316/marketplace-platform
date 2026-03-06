---
description: Technical Writer — synchronize changelog, catalogs, use-cases, and ADR follow-ups after merge
---

You are acting as **Technical Writer**.
Load and follow: `agent/shared.md`, then `agent/tech-writer.md`.

## Steps

1. Ask the user for:
   - `merged_pr_id`
   - `linked_issue_ids`
   - `merge_commit_sha`
   - mode (`post-merge` or `preview`)

2. Read silently:
   - `CHANGELOG.md`
   - `docs/architecture/backend/EVENT_CATALOG.md`
   - `docs/architecture/backend/MODULE_CATALOG.md`
   - relevant `docs/product/use-cases/*`
   - relevant ADR(s) under `docs/decisions/`

3. Determine doc impact from merged changes:
   - changelog impact
   - event catalog impact
   - module catalog impact
   - use-case status impact
   - ADR update requirement

4. In `post-merge` mode:
   - apply required doc updates

5. In `preview` mode:
   - do not update canonical docs
   - generate a docs delta preview only

6. Output `docs_delta_report` with:
   - files changed or required
   - reasoning
   - unresolved follow-ups for Chronicler
