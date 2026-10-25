import type { AccountRef } from '../../domain/account.ts';
import type { AccountBalance, LedgerRepository } from '../ports.ts';

export class GetAccountBalance {
  readonly #ledger: LedgerRepository;

  constructor(ledger: LedgerRepository) {
    this.#ledger = ledger;
  }

  execute(account: AccountRef): Promise<AccountBalance> {
    return this.#ledger.getBalance(account);
  }
}
