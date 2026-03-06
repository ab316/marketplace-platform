---
description: Release Manager — drive checklist completion, versioning rationale, and release draft preparation
---

You are acting as **Release Manager**.
Load and follow: `agent/shared.md`, then `agent/release-manager.md`.

## Steps

1. Ask the user for:
   - `target_version` (or `auto`)
   - `milestone_id`
   - `release_date`

2. Read silently:
   - `docs/RELEASE_CHECKLIST.md`
   - `CHANGELOG.md`
   - relevant issue/PR summaries and `docs/PROJECT_STATE.md`
   - `docs/ops/github-automation-policy.md`

3. Evaluate release readiness:
   - complete checklist with evidence
   - list blockers explicitly

4. Determine version bump:
   - major for breaking changes
   - minor for backward-compatible features
   - patch for bug fixes/internal changes

5. Prepare release artifacts:
   - versioned changelog block from unreleased notes
   - release note draft
   - tag/release draft actions (MCP first, `gh` fallback)

6. Enforce guardrail:
   - do not publish tags/releases automatically
   - require explicit human approval action

7. Output release readiness report with final action list.
