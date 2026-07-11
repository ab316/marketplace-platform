# Product Decisions (PDs)

Durable **product** decisions: what the product is, who it serves, which policies govern it, and what is in or out of scope. Written in user and marketplace language.

Not to be confused with `docs/decisions/` (ADRs), which records **architecture and technology** decisions (persistence strategy, messaging, ledger model, …). Rule of thumb:

- Changes what users experience, what the marketplace allows, or what the business promises → **PD here**.
- Changes how the system is built, stored, scaled, or integrated → **ADR in `docs/decisions/`**.
- A product decision may _trigger_ an ADR (e.g. "escrow is central" → "append-only ledger"), and each should link to the other — but each record stays in its own log.

Use [`../templates/product-decision.md`](../templates/product-decision.md). Number sequentially.

## Decisions

| PD                                | Title                                      | Status   | Date       |
| --------------------------------- | ------------------------------------------ | -------- | ---------- |
| [0001](0001-product-direction.md) | Build a Trust-Centered Marketplace Product | Accepted | 2026-07-09 |
