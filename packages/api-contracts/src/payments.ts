import { z } from 'zod';

import { moneySchema } from './common.ts';

export const paymentAttemptStatusSchema = z.enum([
  'pending',
  'succeeded',
  'failed',
  'timed_out',
  'reversed',
]);
export type PaymentAttemptStatus = z.infer<typeof paymentAttemptStatusSchema>;

/**
 * What the simulated provider is asked to do (PD-0004 §9). Accepted only while the simulated
 * provider is configured; a real provider rejects the field.
 */
export const paymentScenarioSchema = z.enum(['success', 'failure', 'timeout', 'duplicate_success']);
export type PaymentScenario = z.infer<typeof paymentScenarioSchema>;

export const startPaymentRequestSchema = z.object({
  scenario: paymentScenarioSchema.optional(),
});
export type StartPaymentRequest = z.infer<typeof startPaymentRequestSchema>;

export const paymentAttemptSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  buyerUserId: z.string(),
  amount: moneySchema,
  status: paymentAttemptStatusSchema,
  provider: z.string(),
  scenario: paymentScenarioSchema.nullable(),
  providerReference: z.string().nullable(),
  /** Marketplace fee rate frozen at success, in basis points (PD-0004 §1). */
  feeRateBps: z.number().int().nullable(),
  failureReason: z.string().nullable(),
  startedAt: z.iso.datetime(),
  /** The payment hold ends here if the provider has not answered (PD-0004 §2). */
  timesOutAt: z.iso.datetime(),
  resolvedAt: z.iso.datetime().nullable(),
});
export type PaymentAttempt = z.infer<typeof paymentAttemptSchema>;

export const orderPaymentsResponseSchema = z.object({
  orderId: z.string(),
  attempts: z.array(paymentAttemptSchema),
});
export type OrderPaymentsResponse = z.infer<typeof orderPaymentsResponseSchema>;

/**
 * The provider webhook body (ADR-009 §2). Signed with HMAC-SHA256 over the raw body, carried in
 * the `x-provider-signature` header; unsigned or mis-signed bodies are rejected before parsing.
 */
export const providerCallbackSchema = z.object({
  provider: z.string().min(1),
  providerEventId: z.string().min(1),
  /** Our payment attempt id, passed to the provider at start and echoed back. */
  attemptId: z.string().min(1),
  providerReference: z.string().min(1),
  type: z.enum(['succeeded', 'failed']),
  amountMinor: z.number().int().positive(),
  currency: z.literal('SEK'),
  failureReason: z.string().nullable().default(null),
});
export type ProviderCallback = z.infer<typeof providerCallbackSchema>;

export const PROVIDER_SIGNATURE_HEADER = 'x-provider-signature';

export const providerCallbackResponseSchema = z.object({
  accepted: z.literal(true),
  result: z.enum(['paid', 'returned', 'failed', 'ignored']),
});
export type ProviderCallbackResponse = z.infer<typeof providerCallbackResponseSchema>;

// --- Ledger (operator view, PD-0004 §8) -----------------------------------------------------

export const ledgerAccountKindSchema = z.enum([
  'provider_clearing',
  'order_escrow',
  'seller_balance',
  'platform_fee_revenue',
]);
export type LedgerAccountKind = z.infer<typeof ledgerAccountKindSchema>;

export const journalEntryKindSchema = z.enum([
  'payment_captured',
  'payment_reversed',
  'funds_released',
]);
export type JournalEntryKind = z.infer<typeof journalEntryKindSchema>;

export const journalLineSchema = z.object({
  account: z.object({ kind: ledgerAccountKindSchema, ownerId: z.string() }),
  side: z.enum(['debit', 'credit']),
  amount: moneySchema,
});
export type JournalLine = z.infer<typeof journalLineSchema>;

export const journalEntrySchema = z.object({
  id: z.string(),
  kind: journalEntryKindSchema,
  description: z.string(),
  total: moneySchema,
  lines: z.array(journalLineSchema),
  occurredAt: z.iso.datetime(),
});
export type JournalEntry = z.infer<typeof journalEntrySchema>;

export const orderFinancialHistoryResponseSchema = z.object({
  orderId: z.string(),
  /** What the order's escrow currently holds. */
  escrowBalance: moneySchema,
  entries: z.array(journalEntrySchema),
});
export type OrderFinancialHistoryResponse = z.infer<typeof orderFinancialHistoryResponseSchema>;
