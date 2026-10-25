import type { Currency, Money } from '@acme/core-domain';

import type { PaymentAttempt, PaymentScenario } from '../domain/payment-attempt.ts';

export interface PaymentAttemptRepository {
  findById(attemptId: string): Promise<PaymentAttempt | null>;

  /** Throws `PaymentInProgressError` when another attempt for the order is still pending. */
  insert(attempt: PaymentAttempt): Promise<void>;

  /** Optimistically guarded write; throws `PaymentConcurrencyError` when the stored version moved. */
  save(attempt: PaymentAttempt): Promise<void>;

  findByOrder(orderId: string): Promise<readonly PaymentAttempt[]>;

  /** Pending attempts whose timeout has passed, oldest first. */
  findOverdue(now: Date, limit: number): Promise<readonly PaymentAttempt[]>;

  /**
   * Records a provider event id for deduplication (UC-004 A3). Returns `false` when the event was
   * already recorded, in which case the caller treats the delivery as a replay.
   */
  recordProviderEvent(event: ProviderEventRecord): Promise<boolean>;
}

export interface ProviderEventRecord {
  readonly provider: string;
  readonly providerEventId: string;
  readonly attemptId: string;
  readonly type: ProviderCallbackType;
  readonly receivedAt: Date;
}

export type ProviderCallbackType = 'succeeded' | 'failed';

/** A provider's report about an attempt, already signature-verified and parsed at the boundary. */
export interface ProviderCallback {
  readonly provider: string;
  readonly providerEventId: string;
  /** Our attempt id, handed to the provider at start and echoed back. */
  readonly attemptId: string;
  readonly providerReference: string;
  readonly type: ProviderCallbackType;
  readonly amountMinor: number;
  readonly currency: Currency;
  readonly failureReason: string | null;
}

export interface StartPaymentRequest {
  readonly attemptId: string;
  readonly orderId: string;
  readonly amount: Money;
  readonly scenario: PaymentScenario | null;
}

/**
 * The payment provider boundary (ADR-009 §2). Starting a payment returns the provider's reference
 * at once; the outcome always arrives later as a callback, so the code path is the same for the
 * simulated provider and a real one.
 */
export interface PaymentProvider {
  readonly name: string;
  /** Whether this provider honours the `scenario` request field (PD-0004 §9). */
  readonly supportsScenarios: boolean;
  startPayment(request: StartPaymentRequest): Promise<{ readonly providerReference: string }>;
}

/** What the payments module needs to know about an order before taking money for it. */
export interface PayableOrder {
  readonly id: string;
  readonly buyerUserId: string;
  readonly total: Money;
  readonly status: string;
  readonly expiresAt: Date;
}

export type MarkPaidOutcome =
  | { readonly outcome: 'paid' }
  | { readonly outcome: 'already_paid'; readonly byAttemptId: string }
  | { readonly outcome: 'not_payable'; readonly status: string };

/**
 * The payments module's view of orders, adapted in `src/bootstrap/` over the orders module's
 * public API (ADR-009 §1). Every operation is idempotent per attempt.
 */
export interface PayableOrders {
  load(orderId: string, viewerUserId: string): Promise<PayableOrder>;
  hold(orderId: string, attemptId: string, holdUntil: Date): Promise<void>;
  markPaid(orderId: string, attemptId: string, feeRateBps: number): Promise<MarkPaidOutcome>;
  recordFailed(orderId: string, attemptId: string, reason: string): Promise<void>;
  recordReturned(
    orderId: string,
    attemptId: string,
    reason: 'order_cancelled' | 'order_already_paid'
  ): Promise<void>;
}

export interface LedgerPostingRequest {
  readonly attemptId: string;
  readonly orderId: string;
  readonly provider: string;
  readonly amount: Money;
}

/**
 * The two Phase 4 money movements, adapted over the ledger module's public API. Both are
 * idempotent per attempt, keyed `payment:<attemptId>:captured|reversed`.
 */
export interface LedgerPostings {
  captureIntoEscrow(request: LedgerPostingRequest): Promise<void>;
  returnToBuyer(request: LedgerPostingRequest): Promise<void>;
  /** Whether the capture for an attempt was already posted (recovery after a partial failure). */
  hasCapture(attemptId: string): Promise<boolean>;
}

/** Tunables fixed by configuration (PD-0004 §1, §2). */
export interface PaymentPolicy {
  readonly platformFeeBps: number;
  readonly attemptTimeoutMs: number;
}
