import type { Clock, IdGenerator } from '@acme/core-contracts';
import type { Kysely } from 'kysely';

import type { BackgroundTasks } from '../../shared/infrastructure/background-tasks.ts';
import type { Database } from '../../shared/infrastructure/database/schema.ts';
import { ExpirePendingPaymentAttempts } from './application/commands/expire-pending-payment-attempts.ts';
import { HandleProviderCallback } from './application/commands/handle-provider-callback.ts';
import { StartPayment } from './application/commands/start-payment.ts';
import type {
  LedgerPostings,
  PayableOrders,
  PaymentAttemptRepository,
  PaymentPolicy,
  PaymentProvider,
} from './application/ports.ts';
import { GetOrderPayments } from './application/queries/get-order-payments.ts';
import { SettleCapturedPayment } from './application/settle-captured-payment.ts';
import { InMemoryPaymentAttemptRepository } from './infrastructure/persistence/in-memory-payment-attempt-repository.ts';
import { PgPaymentAttemptRepository } from './infrastructure/persistence/pg-payment-attempt-repository.ts';
import { ProviderCallbackCodec } from './infrastructure/provider/provider-callback-codec.ts';
import { SimulatedPaymentProvider } from './infrastructure/provider/simulated-payment-provider.ts';
import type { PaymentsModuleApi } from './payments.api.ts';
import type { ProviderCallbackDecoder } from './presentation/payment-routes.ts';

export interface PaymentsModuleDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  /** Omitted in `memory` persistence mode. */
  readonly db?: Kysely<Database> | undefined;
  /** Adapted over the orders module's public API in `src/bootstrap/`. */
  readonly orders: PayableOrders;
  /** Adapted over the ledger module's public API in `src/bootstrap/`. */
  readonly ledger: LedgerPostings;
  readonly policy: PaymentPolicy;
  readonly provider: 'simulated';
  readonly webhookSecret: string;
  readonly backgroundTasks: BackgroundTasks;
}

export interface PaymentsModule {
  readonly api: PaymentsModuleApi;
  /** For the webhook route: verifies and parses a raw callback body. */
  readonly callbackDecoder: ProviderCallbackDecoder;
  /** Exposed so tests can hand-deliver signed callbacks (late success, duplicates, forgeries). */
  readonly simulatedProvider: SimulatedPaymentProvider;
}

/** Composition root for the payments module (ADR-007): the only place its infrastructure is built. */
export const createPaymentsModule = (deps: PaymentsModuleDependencies): PaymentsModule => {
  const attempts: PaymentAttemptRepository =
    deps.db === undefined
      ? new InMemoryPaymentAttemptRepository()
      : new PgPaymentAttemptRepository(deps.db);

  const codec = new ProviderCallbackCodec(deps.webhookSecret);
  const settle = new SettleCapturedPayment(
    attempts,
    deps.orders,
    deps.ledger,
    deps.policy,
    deps.clock
  );
  const handleProviderCallback = new HandleProviderCallback(
    attempts,
    deps.orders,
    deps.ledger,
    settle,
    deps.clock
  );

  // The simulated provider delivers its callbacks to the handler built just above.
  const simulatedProvider = new SimulatedPaymentProvider(
    codec,
    deps.backgroundTasks,
    () => handleProviderCallback
  );
  const provider: PaymentProvider = simulatedProvider;

  return {
    api: {
      startPayment: new StartPayment(
        attempts,
        deps.orders,
        provider,
        deps.policy,
        deps.clock,
        deps.ids
      ),
      handleProviderCallback,
      expirePendingPaymentAttempts: new ExpirePendingPaymentAttempts(
        attempts,
        deps.orders,
        deps.ledger,
        settle,
        deps.clock
      ),
      getOrderPayments: new GetOrderPayments(attempts),
    },
    callbackDecoder: codec,
    simulatedProvider,
  };
};
