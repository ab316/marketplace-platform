import type { Clock, IdGenerator } from '@acme/core-contracts';
import type { Kysely } from 'kysely';

import type { Database } from '../../shared/infrastructure/database/schema.ts';
import { PostJournalEntry } from './application/commands/post-journal-entry.ts';
import { RebuildAccountBalances } from './application/commands/rebuild-account-balances.ts';
import type { LedgerRepository } from './application/ports.ts';
import { GetAccountBalance } from './application/queries/get-account-balance.ts';
import { GetJournalEntryByKey } from './application/queries/get-journal-entry-by-key.ts';
import { GetOrderFinancialHistory } from './application/queries/get-order-financial-history.ts';
import { InMemoryLedgerRepository } from './infrastructure/persistence/in-memory-ledger-repository.ts';
import { PgLedgerRepository } from './infrastructure/persistence/pg-ledger-repository.ts';
import type { LedgerModuleApi } from './ledger.api.ts';

export interface LedgerModuleDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  /** Omitted in `memory` persistence mode. */
  readonly db?: Kysely<Database> | undefined;
}

/** Composition root for the ledger module (ADR-007): the only place its infrastructure is built. */
export const createLedgerModule = (deps: LedgerModuleDependencies): LedgerModuleApi => {
  const ledger: LedgerRepository =
    deps.db === undefined ? new InMemoryLedgerRepository() : new PgLedgerRepository(deps.db);

  return {
    postJournalEntry: new PostJournalEntry(ledger, deps.clock, deps.ids),
    rebuildAccountBalances: new RebuildAccountBalances(ledger),
    getAccountBalance: new GetAccountBalance(ledger),
    getJournalEntryByKey: new GetJournalEntryByKey(ledger),
    getOrderFinancialHistory: new GetOrderFinancialHistory(ledger),
  };
};
