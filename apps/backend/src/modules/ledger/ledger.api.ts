import type { PostJournalEntry } from './application/commands/post-journal-entry.ts';
import type { RebuildAccountBalances } from './application/commands/rebuild-account-balances.ts';
import type { GetAccountBalance } from './application/queries/get-account-balance.ts';
import type { GetJournalEntryByKey } from './application/queries/get-journal-entry-by-key.ts';
import type { GetOrderFinancialHistory } from './application/queries/get-order-financial-history.ts';

/** Everything other modules and the HTTP layer may use from the ledger. */
export interface LedgerModuleApi {
  /** The single write path for money (ADR-009). */
  readonly postJournalEntry: PostJournalEntry;
  readonly rebuildAccountBalances: RebuildAccountBalances;
  readonly getAccountBalance: GetAccountBalance;
  readonly getJournalEntryByKey: GetJournalEntryByKey;
  readonly getOrderFinancialHistory: GetOrderFinancialHistory;
}
