import type {
  OrderPaymentsResponse,
  PaymentAttempt as PaymentAttemptResponse,
} from '@acme/api-contracts';

import type { PaymentAttemptView } from '../application/payment-attempt-view.ts';

export const toPaymentAttemptResponse = (view: PaymentAttemptView): PaymentAttemptResponse => ({
  id: view.id,
  orderId: view.orderId,
  buyerUserId: view.buyerUserId,
  amount: view.amount,
  status: view.status,
  provider: view.provider,
  scenario: view.scenario,
  providerReference: view.providerReference,
  feeRateBps: view.feeRateBps,
  failureReason: view.failureReason,
  startedAt: view.startedAt.toISOString(),
  timesOutAt: view.timesOutAt.toISOString(),
  resolvedAt: view.resolvedAt?.toISOString() ?? null,
});

export const toOrderPaymentsResponse = (
  orderId: string,
  attempts: readonly PaymentAttemptView[]
): OrderPaymentsResponse => ({
  orderId,
  attempts: attempts.map(toPaymentAttemptResponse),
});
