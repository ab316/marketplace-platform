# Ledger Module

Location: `apps/backend/src/modules/ledger/`

Bounded context: where the money is. An append-only double-entry journal and a derived balance per
account (ADR-003), owned by no business flow in particular: payments, release, refunds, and
settlement all post to it through one command. Introduced for
[UC-004](../../../../../docs/product/use-cases/UC-004-buyer-pays-into-escrow.md) under
[ADR-009](../../../../../docs/decisions/ADR-009-payments-and-ledger-modules.md).

---

# 1. Responsibilities

This module is responsible for:

- The chart of accounts: `provider_clearing` (asset, one per provider), `order_escrow` (liability,
  one per order), `seller_balance` (liability, one per organization), `platform_fee_revenue`
  (revenue, one).
- Recording every money movement as a balanced, immutable journal entry, idempotent by a
  caller-chosen key.
- The balance projection and its rebuild from the journal.
- The per-order financial history operators read (PD-0004 §8).

This module is NOT responsible for:

- Deciding _when_ money moves (payments, orders, Phase 5 release), or knowing what an order or a
  payment attempt is — it sees opaque reference and owner identifiers only.

Single source of truth for: **JournalEntry**, **Account**, and account balances.

---

# 2. Public API

Declared in `ledger.api.ts` and built by `ledger.module.ts`.

## Commands

- `PostJournalEntry` — the only write path for money. Balanced lines, an entry kind, a reference,
  and an idempotency key; posting the same key again returns the first entry and writes nothing; a
  different posting under an existing key is refused (`LEDGER_ENTRY_CONFLICT`).
- `RebuildAccountBalances` — recompute every balance from the journal lines. Recovery tool and the
  oracle the live projection is tested against.

## Queries

- `GetAccountBalance`, `GetJournalEntryByKey`, `GetOrderFinancialHistory` (every entry referencing
  an order plus its escrow balance; served to platform admins at
  `GET /api/orders/:orderId/financial-history`).

---

# 3. Domain Model

- `JournalEntry` (`domain/journal-entry.ts`) — invariants: at least two lines, every amount
  positive, one currency, debits equal credits, never modified after creation. Kinds:
  `payment_captured`, `payment_reversed`, `funds_released` (Phase 5).
- `Account` (`domain/account.ts`) — account identity is derived (`<kind>:<ownerId>`) so any writer
  can create an account on first use without a race. `balanceDelta` is the one rule turning a line
  into a balance change; both the live projection and the rebuild use it.

Money arithmetic (`add`, `subtract`, `percentageBps` with round-half-up) lives in
`@acme/core-domain`.

---

# 4. Events

None. Phase 4 ships no integration events (ADR-009 §4); `MoneyCaptured.v1`-style events wait for
the outbox.

---

# 5. Ports

- `LedgerRepository` (`application/ports.ts`) — find by key, append (entry + lines + balance deltas
  in one ledger-internal transaction), find by reference, balance, rebuild.

---

# 6. Persistence

Tables: `ledger_accounts`, `ledger_journal_entries`, `ledger_journal_lines`,
`ledger_account_balances`.

The database enforces what the domain promises (migration `1793000000000_payments-and-ledger`):

- `UPDATE`/`DELETE` on entries or lines raise (append-only).
- A deferred constraint trigger rejects, at commit, any entry with fewer than two lines or whose
  debits and credits differ.
- `idempotency_key` is unique; `sequence` (bigserial) is the posting order the history is read in,
  independent of the injectable clock.

`InMemoryLedgerRepository` serves the `memory` persistence mode and the property tests; the
database-enforced guarantees are proven against Postgres only.

---

# 7. Transactions & Concurrency

An `append` writes the entry, its lines, any new accounts, and the balance upserts in one
transaction, so the projection can never disagree with the journal. Two writers racing on a new key
are resolved by the unique index; the loser re-reads and returns the winner. `RebuildAccountBalances`
takes an exclusive lock on the balances table for the duration of the rebuild.

---

# 8. Cross-Module Collaboration

### payments

Mechanism: the payments module's `LedgerPostings` port, adapted in `src/bootstrap/ledger-postings.ts`
over `PostJournalEntry` and `GetJournalEntryByKey`. Keys: `payment:<attemptId>:captured|reversed`.

---

# 9. Testing

- Domain: `test/unit/ledger/journal-entry.unit.spec.ts`
- Properties (fast-check): `test/unit/ledger/ledger-balances.property.unit.spec.ts` — any posting
  sequence keeps the live projection equal to a rebuild; every balance equals the independently
  summed lines; posting is idempotent by key.
- Database guarantees: `test/integration/persistence/ledger.persistence.int.spec.ts`

---

# 10. Known Gaps

- No cross-module transaction: a caller that posts and then fails to update its own state leaves
  money in escrow without the matching order state until it retries (ADR-009 §3; roadmap "Backend
  reliability").
- No archival; the journal grows indefinitely (ADR-003).
