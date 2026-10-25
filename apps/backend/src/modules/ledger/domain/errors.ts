import { DomainError, type ErrorDetails } from '@acme/core-domain';

/** The entry would break double-entry integrity: unbalanced, empty, or otherwise malformed. */
export class UnbalancedJournalEntryError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super('validation', 'LEDGER_ENTRY_INVALID', message, details);
  }
}

/** The same idempotency key was reused for a different posting; money must never move twice. */
export class JournalEntryConflictError extends DomainError {
  constructor(idempotencyKey: string) {
    super(
      'conflict',
      'LEDGER_ENTRY_CONFLICT',
      'A different journal entry was already posted with this idempotency key.',
      { idempotencyKey }
    );
  }
}
