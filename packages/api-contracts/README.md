# api-contracts

Role: Shared API contracts (request/response schemas and inferred types) used by backend and frontend.

This package is for transport-level contracts only.

Examples:

- Zod request schemas
- Zod response schemas
- Shared API DTO types inferred from schemas

---

## Hard Rules

- Keep contracts backward compatible when possible.
- Do not include business/domain logic.
- Do not include infrastructure code.
- Keep module ownership clear; avoid dumping unrelated schemas here.

---

## Usage

- Backend presentation layer validates HTTP input/output against schemas from this package.
- Frontend consumes the same schemas/types to prevent API drift.
