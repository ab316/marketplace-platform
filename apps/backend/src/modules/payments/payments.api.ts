import type { ExpirePendingPaymentAttempts } from './application/commands/expire-pending-payment-attempts.ts';
import type { HandleProviderCallback } from './application/commands/handle-provider-callback.ts';
import type { StartPayment } from './application/commands/start-payment.ts';
import type { GetOrderPayments } from './application/queries/get-order-payments.ts';

/** Everything other modules, the HTTP layer, and jobs may use from this module. */
export interface PaymentsModuleApi {
  readonly startPayment: StartPayment;
  /** Driven by the provider webhook route and, in-process, by the simulated provider. */
  readonly handleProviderCallback: HandleProviderCallback;
  /** Driven by the payment-timeout job rather than by HTTP. */
  readonly expirePendingPaymentAttempts: ExpirePendingPaymentAttempts;
  readonly getOrderPayments: GetOrderPayments;
}
