import { type JournalEntryView, toJournalEntryView } from '../journal-entry-view.ts';
import type { LedgerRepository } from '../ports.ts';

export interface GetOrderFinancialHistoryQuery {
  readonly orderId: string;
}

export interface OrderFinancialHistory {
  readonly orderId: string;
  readonly entries: readonly JournalEntryView[];
  /** What the order's escrow account currently holds. */
  readonly escrowBalanceMinor: number;
}

/**
 * Every money movement recorded against an order, oldest first, plus what its escrow holds now.
 * Authorization (platform admin only, PD-0004 §8) is enforced by the route; the ledger itself has
 * no notion of who is asking.
 */
export class GetOrderFinancialHistory {
  readonly #ledger: LedgerRepository;

  constructor(ledger: LedgerRepository) {
    this.#ledger = ledger;
  }

  async execute(query: GetOrderFinancialHistoryQuery): Promise<OrderFinancialHistory> {
    const entries = await this.#ledger.findByReference({ type: 'order', id: query.orderId });
    const escrow = await this.#ledger.getBalance({ kind: 'order_escrow', ownerId: query.orderId });

    return {
      orderId: query.orderId,
      entries: entries.map(toJournalEntryView),
      escrowBalanceMinor: escrow.balanceMinor,
    };
  }
}
