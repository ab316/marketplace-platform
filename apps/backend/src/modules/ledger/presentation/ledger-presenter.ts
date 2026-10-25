import type {
  JournalEntry as JournalEntryResponse,
  OrderFinancialHistoryResponse,
} from '@acme/api-contracts';

import type { JournalEntryView } from '../application/journal-entry-view.ts';
import type { OrderFinancialHistory } from '../application/queries/get-order-financial-history.ts';

const toJournalEntryResponse = (view: JournalEntryView): JournalEntryResponse => ({
  id: view.id,
  kind: view.kind,
  description: view.description,
  total: view.total,
  lines: view.lines.map((line) => ({
    account: line.account,
    side: line.side,
    amount: line.amount,
  })),
  occurredAt: view.occurredAt.toISOString(),
});

export const toOrderFinancialHistoryResponse = (
  history: OrderFinancialHistory
): OrderFinancialHistoryResponse => ({
  orderId: history.orderId,
  escrowBalance: { amountMinor: history.escrowBalanceMinor, currency: 'SEK' },
  entries: history.entries.map(toJournalEntryResponse),
});
