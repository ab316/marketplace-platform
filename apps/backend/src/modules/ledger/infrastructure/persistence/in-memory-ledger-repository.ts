import type { AccountBalance, LedgerRepository } from '../../application/ports.ts';
import { type AccountRef, accountId, balanceDelta, parseAccountId } from '../../domain/account.ts';
import { JournalEntryConflictError } from '../../domain/errors.ts';
import type { JournalEntry, JournalReference } from '../../domain/journal-entry.ts';

/**
 * Process-local ledger for the `memory` persistence mode and unit/property tests. Reproduces the
 * append-only and idempotency semantics; the database-enforced guarantees (mutation triggers,
 * commit-time balance check) are proven against Postgres only.
 */
export class InMemoryLedgerRepository implements LedgerRepository {
  readonly #entries: JournalEntry[] = [];
  readonly #byKey = new Map<string, JournalEntry>();
  readonly #balances = new Map<string, { balanceMinor: number; entryCount: number }>();

  findByIdempotencyKey(idempotencyKey: string): Promise<JournalEntry | null> {
    return Promise.resolve(this.#byKey.get(idempotencyKey) ?? null);
  }

  append(entry: JournalEntry): Promise<void> {
    if (this.#byKey.has(entry.idempotencyKey)) {
      return Promise.reject(new JournalEntryConflictError(entry.idempotencyKey));
    }

    this.#entries.push(entry);
    this.#byKey.set(entry.idempotencyKey, entry);

    const touched = new Set<string>();
    for (const line of entry.state.lines) {
      const ref = parseAccountId(line.accountId);
      const current = this.#balances.get(line.accountId) ?? { balanceMinor: 0, entryCount: 0 };
      current.balanceMinor += balanceDelta(ref.kind, line.side, line.amount.amountMinor);
      this.#balances.set(line.accountId, current);
      touched.add(line.accountId);
    }
    for (const id of touched) {
      const current = this.#balances.get(id);
      if (current !== undefined) {
        current.entryCount += 1;
      }
    }

    return Promise.resolve();
  }

  findByReference(reference: JournalReference): Promise<readonly JournalEntry[]> {
    return Promise.resolve(
      this.#entries.filter((entry) => entry.state.reference.id === reference.id)
    );
  }

  getBalance(account: AccountRef): Promise<AccountBalance> {
    const current = this.#balances.get(accountId(account)) ?? { balanceMinor: 0, entryCount: 0 };
    return Promise.resolve({ account, ...current });
  }

  rebuildBalances(): Promise<readonly AccountBalance[]> {
    const rebuilt = new Map<string, { balanceMinor: number; entryCount: number }>();

    for (const entry of this.#entries) {
      const touched = new Set<string>();
      for (const line of entry.state.lines) {
        const ref = parseAccountId(line.accountId);
        const current = rebuilt.get(line.accountId) ?? { balanceMinor: 0, entryCount: 0 };
        current.balanceMinor += balanceDelta(ref.kind, line.side, line.amount.amountMinor);
        rebuilt.set(line.accountId, current);
        touched.add(line.accountId);
      }
      for (const id of touched) {
        const current = rebuilt.get(id);
        if (current !== undefined) {
          current.entryCount += 1;
        }
      }
    }

    this.#balances.clear();
    for (const [id, value] of rebuilt) {
      this.#balances.set(id, value);
    }

    return Promise.resolve(toBalances(rebuilt));
  }

  /** Test hook: the current projection without rebuilding it. */
  snapshotBalances(): readonly AccountBalance[] {
    return toBalances(this.#balances);
  }
}

const toBalances = (
  balances: ReadonlyMap<string, { balanceMinor: number; entryCount: number }>
): AccountBalance[] =>
  [...balances.entries()]
    .map(([id, value]): AccountBalance => {
      return {
        account: parseAccountId(id),
        balanceMinor: value.balanceMinor,
        entryCount: value.entryCount,
      };
    })
    .toSorted((left, right) => accountId(left.account).localeCompare(accountId(right.account)));
