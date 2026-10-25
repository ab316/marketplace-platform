import { Money } from '@acme/core-domain';

import { type AccountRef, type BalanceSide, accountId } from './account.ts';
import { UnbalancedJournalEntryError } from './errors.ts';

/** What kind of money movement an entry records. Phase 5 adds `funds_released`. */
export type JournalEntryKind = 'payment_captured' | 'payment_reversed' | 'funds_released';

export const JOURNAL_ENTRY_KINDS: readonly JournalEntryKind[] = [
  'payment_captured',
  'payment_reversed',
  'funds_released',
];

/** The business object an entry is about; the financial history of an order is every entry that references it. */
export interface JournalReference {
  readonly type: 'order';
  readonly id: string;
}

export interface JournalLine {
  readonly accountId: string;
  readonly side: BalanceSide;
  readonly amount: Money;
}

export interface JournalLineInput {
  readonly account: AccountRef;
  readonly side: BalanceSide;
  readonly amount: Money;
}

export interface JournalEntryState {
  readonly id: string;
  /** Caller-chosen key; posting it twice returns the first entry and writes nothing. */
  readonly idempotencyKey: string;
  readonly kind: JournalEntryKind;
  readonly reference: JournalReference;
  readonly description: string;
  readonly lines: readonly JournalLine[];
  readonly occurredAt: Date;
}

export interface CreateJournalEntryInput {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly kind: JournalEntryKind;
  readonly reference: JournalReference;
  readonly description: string;
  readonly lines: readonly JournalLineInput[];
  readonly occurredAt: Date;
}

/**
 * One balanced, immutable movement of money (ADR-003).
 *
 * Invariants:
 * - At least two lines, every amount strictly positive, one currency.
 * - Total debits equal total credits — the double-entry rule, checked here and again by the
 *   database at commit.
 * - An entry is never modified after creation; corrections are new reversing entries.
 */
export class JournalEntry {
  readonly #state: JournalEntryState;

  private constructor(state: JournalEntryState) {
    this.#state = state;
  }

  static create(input: CreateJournalEntryInput): JournalEntry {
    if (input.idempotencyKey.trim().length === 0) {
      throw new UnbalancedJournalEntryError('A journal entry needs an idempotency key.');
    }
    if (input.lines.length < 2) {
      throw new UnbalancedJournalEntryError('A journal entry needs at least two lines.', {
        lines: input.lines.length,
      });
    }

    const currency = input.lines[0]?.amount.currency;
    let debits = Money.zero(currency);
    let credits = Money.zero(currency);

    for (const line of input.lines) {
      if (!line.amount.isPositive()) {
        throw new UnbalancedJournalEntryError('Every journal line must carry a positive amount.', {
          account: accountId(line.account),
        });
      }
      // `add` rejects a mixed currency, which is the check we want here.
      if (line.side === 'debit') {
        debits = debits.add(line.amount);
      } else {
        credits = credits.add(line.amount);
      }
    }

    if (!debits.equals(credits)) {
      throw new UnbalancedJournalEntryError('Journal entry does not balance.', {
        debitsMinor: debits.amountMinor,
        creditsMinor: credits.amountMinor,
      });
    }

    return new JournalEntry({
      id: input.id,
      idempotencyKey: input.idempotencyKey,
      kind: input.kind,
      reference: input.reference,
      description: input.description,
      lines: input.lines.map((line) => ({
        accountId: accountId(line.account),
        side: line.side,
        amount: line.amount,
      })),
      occurredAt: input.occurredAt,
    });
  }

  /** Rehydrates a persisted entry; the database already guaranteed it balances. */
  static restore(state: JournalEntryState): JournalEntry {
    return new JournalEntry(state);
  }

  get state(): JournalEntryState {
    return this.#state;
  }

  get id(): string {
    return this.#state.id;
  }

  get idempotencyKey(): string {
    return this.#state.idempotencyKey;
  }

  /** Total moved through the entry (the debit side; the credit side is equal by construction). */
  get total(): Money {
    return this.#state.lines
      .filter((line) => line.side === 'debit')
      .reduce((sum, line) => sum.add(line.amount), Money.zero(this.currency));
  }

  get currency(): string {
    return this.#state.lines[0]?.amount.currency ?? 'SEK';
  }
}
