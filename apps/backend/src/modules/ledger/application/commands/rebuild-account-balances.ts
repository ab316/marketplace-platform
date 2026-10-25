import type { AccountBalance, LedgerRepository } from '../ports.ts';

/**
 * Recomputes the balance projection from the journal (ADR-003 §2). The journal is the source of
 * truth; this is both the recovery tool and the oracle the live projection is tested against.
 */
export class RebuildAccountBalances {
  readonly #ledger: LedgerRepository;

  constructor(ledger: LedgerRepository) {
    this.#ledger = ledger;
  }

  execute(): Promise<readonly AccountBalance[]> {
    return this.#ledger.rebuildBalances();
  }
}
