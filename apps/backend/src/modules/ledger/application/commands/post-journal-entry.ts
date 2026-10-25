import type { Clock, IdGenerator } from '@acme/core-contracts';

import { JournalEntryConflictError } from '../../domain/errors.ts';
import {
  JournalEntry,
  type JournalEntryKind,
  type JournalLineInput,
  type JournalReference,
} from '../../domain/journal-entry.ts';
import { type JournalEntryView, toJournalEntryView } from '../journal-entry-view.ts';
import type { LedgerRepository } from '../ports.ts';

export interface PostJournalEntryCommand {
  /** Chosen by the caller from its own business key, e.g. `payment:<attemptId>:captured`. */
  readonly idempotencyKey: string;
  readonly kind: JournalEntryKind;
  readonly reference: JournalReference;
  readonly description: string;
  readonly lines: readonly JournalLineInput[];
}

export interface PostJournalEntryResult {
  readonly entry: JournalEntryView;
  /** `false` when the key had already been posted and nothing was written. */
  readonly posted: boolean;
}

/**
 * The only way money moves (ADR-009 §1). Posting is idempotent by key: the first posting wins and
 * every later one returns it unchanged, so a retried caller can never move money twice. A key
 * reused for a *different* posting is a conflict, never a silent overwrite.
 */
export class PostJournalEntry {
  readonly #ledger: LedgerRepository;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;

  constructor(ledger: LedgerRepository, clock: Clock, ids: IdGenerator) {
    this.#ledger = ledger;
    this.#clock = clock;
    this.#ids = ids;
  }

  async execute(command: PostJournalEntryCommand): Promise<PostJournalEntryResult> {
    const existing = await this.#ledger.findByIdempotencyKey(command.idempotencyKey);
    if (existing !== null) {
      return { entry: this.#assertSamePosting(existing, command), posted: false };
    }

    const entry = JournalEntry.create({
      id: this.#ids.next(),
      idempotencyKey: command.idempotencyKey,
      kind: command.kind,
      reference: command.reference,
      description: command.description,
      lines: command.lines,
      occurredAt: this.#clock.now(),
    });

    try {
      await this.#ledger.append(entry);
    } catch (error) {
      // Two writers raced on a new key; the database kept exactly one. Return it.
      if (error instanceof JournalEntryConflictError) {
        const winner = await this.#ledger.findByIdempotencyKey(command.idempotencyKey);
        if (winner !== null) {
          return { entry: this.#assertSamePosting(winner, command), posted: false };
        }
      }
      throw error;
    }

    return { entry: toJournalEntryView(entry), posted: true };
  }

  #assertSamePosting(existing: JournalEntry, command: PostJournalEntryCommand): JournalEntryView {
    const view = toJournalEntryView(existing);
    const sameShape =
      view.kind === command.kind &&
      view.reference.id === command.reference.id &&
      view.lines.length === command.lines.length &&
      command.lines.every((line) =>
        view.lines.some(
          (stored) =>
            stored.account.kind === line.account.kind &&
            stored.account.ownerId === line.account.ownerId &&
            stored.side === line.side &&
            stored.amount.amountMinor === line.amount.amountMinor
        )
      );

    if (!sameShape) {
      throw new JournalEntryConflictError(command.idempotencyKey);
    }
    return view;
  }
}
