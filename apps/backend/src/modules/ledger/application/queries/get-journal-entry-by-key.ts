import { type JournalEntryView, toJournalEntryView } from '../journal-entry-view.ts';
import type { LedgerRepository } from '../ports.ts';

/** Whether (and what) a given business key has already posted. Used by callers recovering from a partial failure. */
export class GetJournalEntryByKey {
  readonly #ledger: LedgerRepository;

  constructor(ledger: LedgerRepository) {
    this.#ledger = ledger;
  }

  async execute(idempotencyKey: string): Promise<JournalEntryView | null> {
    const entry = await this.#ledger.findByIdempotencyKey(idempotencyKey);
    return entry === null ? null : toJournalEntryView(entry);
  }
}
