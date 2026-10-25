import type { Currency } from '@acme/core-domain';

import { type AccountRef, parseAccountId } from '../domain/account.ts';
import type { JournalEntry, JournalEntryKind, JournalReference } from '../domain/journal-entry.ts';

export interface JournalLineView {
  readonly account: AccountRef;
  readonly side: 'debit' | 'credit';
  readonly amount: { readonly amountMinor: number; readonly currency: Currency };
}

/** Plain read model returned across the module boundary. */
export interface JournalEntryView {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly kind: JournalEntryKind;
  readonly reference: JournalReference;
  readonly description: string;
  readonly total: { readonly amountMinor: number; readonly currency: Currency };
  readonly lines: readonly JournalLineView[];
  readonly occurredAt: Date;
}

export const toJournalEntryView = (entry: JournalEntry): JournalEntryView => {
  const state = entry.state;
  return {
    id: state.id,
    idempotencyKey: state.idempotencyKey,
    kind: state.kind,
    reference: state.reference,
    description: state.description,
    total: entry.total.toJSON(),
    lines: state.lines.map((line) => ({
      account: parseAccountId(line.accountId),
      side: line.side,
      amount: line.amount.toJSON(),
    })),
    occurredAt: state.occurredAt,
  };
};
