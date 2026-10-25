import type { Currency } from '@acme/core-domain';

import type {
  PaymentAttempt,
  PaymentAttemptStatus,
  PaymentScenario,
} from '../domain/payment-attempt.ts';

/** Plain read model returned across the module boundary. */
export interface PaymentAttemptView {
  readonly id: string;
  readonly orderId: string;
  readonly buyerUserId: string;
  readonly amount: { readonly amountMinor: number; readonly currency: Currency };
  readonly status: PaymentAttemptStatus;
  readonly provider: string;
  readonly scenario: PaymentScenario | null;
  readonly providerReference: string | null;
  readonly feeRateBps: number | null;
  readonly failureReason: string | null;
  readonly startedAt: Date;
  readonly timesOutAt: Date;
  readonly resolvedAt: Date | null;
}

export const toPaymentAttemptView = (attempt: PaymentAttempt): PaymentAttemptView => {
  const state = attempt.state;
  return {
    id: state.id,
    orderId: state.orderId,
    buyerUserId: state.buyerUserId,
    amount: state.amount.toJSON(),
    status: state.status,
    provider: state.provider,
    scenario: state.scenario,
    providerReference: state.providerReference,
    feeRateBps: state.feeRateBps,
    failureReason: state.failureReason,
    startedAt: state.startedAt,
    timesOutAt: state.timesOutAt,
    resolvedAt: state.resolvedAt,
  };
};
