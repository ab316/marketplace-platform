# GitHub Automation Policy (Guarded Direct Writes)

This policy governs GitHub operations by AI agents.

## Modes

- `dry-run`: produce planned operations only
- `apply`: execute permitted operations and log results

## Allowed Operations

- create/update issues
- update labels/assignees/milestones/project fields
- transition board stages
- comment on issues/PRs
- post PR review findings
- close duplicate issues with traceable canonical link
- close completed issues when merge + post-merge docs gates are done
- prepare release drafts

## Disallowed Operations

- merge PRs
- delete branches
- publish tags/releases without explicit human approval
- modify repository settings or security policies

## Idempotency

Use operation key format:

`<repo>:<resource_type>:<resource_id>:<action>:<target_state>`

If key already exists with success result, do not repeat write.

## Audit Requirement

Every write operation must append an entry to `docs/ops/audit-log.md`.

## Fallback

Preferred integration: GitHub MCP.
Fallback: `gh` CLI.
Emergency fallback: draft-only output for human execution.
