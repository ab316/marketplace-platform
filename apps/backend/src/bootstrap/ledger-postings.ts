import type { LedgerModuleApi } from '../modules/ledger/ledger.api.ts';
import type { LedgerPostings } from '../modules/payments/application/ports.ts';

const captureKey = (attemptId: string): string => `payment:${attemptId}:captured`;
const reversalKey = (attemptId: string): string => `payment:${attemptId}:reversed`;

/**
 * The two Phase 4 money movements (ADR-009 §1), expressed as balanced journal entries over the
 * ledger module's public API. Keys are derived from the attempt, so a retried caller cannot post
 * twice.
 */
export const createLedgerPostings = (ledger: LedgerModuleApi): LedgerPostings => ({
  captureIntoEscrow: async ({ attemptId, orderId, provider, amount }) => {
    await ledger.postJournalEntry.execute({
      idempotencyKey: captureKey(attemptId),
      kind: 'payment_captured',
      reference: { type: 'order', id: orderId },
      description: 'Payment captured into escrow',
      lines: [
        { account: { kind: 'provider_clearing', ownerId: provider }, side: 'debit', amount },
        { account: { kind: 'order_escrow', ownerId: orderId }, side: 'credit', amount },
      ],
    });
  },

  returnToBuyer: async ({ attemptId, orderId, provider, amount }) => {
    await ledger.postJournalEntry.execute({
      idempotencyKey: reversalKey(attemptId),
      kind: 'payment_reversed',
      reference: { type: 'order', id: orderId },
      description: 'Payment returned to buyer',
      lines: [
        { account: { kind: 'order_escrow', ownerId: orderId }, side: 'debit', amount },
        { account: { kind: 'provider_clearing', ownerId: provider }, side: 'credit', amount },
      ],
    });
  },

  hasCapture: async (attemptId) =>
    (await ledger.getJournalEntryByKey.execute(captureKey(attemptId))) !== null,
});
