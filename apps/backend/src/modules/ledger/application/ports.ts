import type { AccountRef } from '../domain/account.ts';
import type { JournalEntry, JournalReference } from '../domain/journal-entry.ts';

export interface AccountBalance {
  readonly account: AccountRef;
  /** Non-negative from the owner's point of view (see `NORMAL_BALANCE`); SEK minor units. */
  readonly balanceMinor: number;
  readonly entryCount: number;
}

export interface LedgerRepository {
  findByIdempotencyKey(idempotencyKey: string): Promise<JournalEntry | null>;

  /**
   * Appends an entry and updates the balance projection of every account it touches, in one
   * ledger-internal transaction (ADR-003 §4). Throws `JournalEntryConflictError` when another
   * entry already holds the idempotency key, so the caller can re-read and compare.
   */
  append(entry: JournalEntry): Promise<void>;

  findByReference(reference: JournalReference): Promise<readonly JournalEntry[]>;

  getBalance(account: AccountRef): Promise<AccountBalance>;

  /** Recomputes every balance from the journal lines and returns the rebuilt projection. */
  rebuildBalances(): Promise<readonly AccountBalance[]>;
}
