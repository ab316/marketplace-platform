import type { ProviderCallback as ProviderCallbackBody } from '@acme/api-contracts';

import type { BackgroundTasks } from '../../../../shared/infrastructure/background-tasks.ts';
import type { HandleProviderCallback } from '../../application/commands/handle-provider-callback.ts';
import type { PaymentProvider, StartPaymentRequest } from '../../application/ports.ts';
import type { ProviderCallbackCodec } from './provider-callback-codec.ts';

export const SIMULATED_PROVIDER_NAME = 'simulated';

/**
 * Stands in for a payment provider (PD-0004 §9, ADR-009 §2). `startPayment` answers at once with
 * a reference; the outcome is delivered afterwards as a signed callback through the same handler
 * the webhook route uses, so signature verification and deduplication are exercised too.
 *
 * Delivery is a background task, so it runs after the caller has recorded the attempt; tests
 * `drain()` the tasks to observe the outcome deterministically.
 */
export class SimulatedPaymentProvider implements PaymentProvider {
  readonly name = SIMULATED_PROVIDER_NAME;
  readonly supportsScenarios = true;

  readonly #codec: ProviderCallbackCodec;
  readonly #tasks: BackgroundTasks;
  readonly #handler: () => HandleProviderCallback;
  #sequence = 0;

  /** `handler` is a thunk because the handler and the provider are built in the same module root. */
  constructor(
    codec: ProviderCallbackCodec,
    tasks: BackgroundTasks,
    handler: () => HandleProviderCallback
  ) {
    this.#codec = codec;
    this.#tasks = tasks;
    this.#handler = handler;
  }

  startPayment(request: StartPaymentRequest): Promise<{ providerReference: string }> {
    const providerReference = `sim_${request.attemptId}`;
    const scenario = request.scenario ?? 'success';

    const base = {
      provider: this.name,
      attemptId: request.attemptId,
      providerReference,
      amountMinor: request.amount.amountMinor,
      currency: request.amount.currency,
    } as const;

    switch (scenario) {
      case 'success':
        this.#deliver({
          ...base,
          providerEventId: this.#nextEventId(),
          type: 'succeeded',
          failureReason: null,
        });
        break;
      case 'failure':
        this.#deliver({
          ...base,
          providerEventId: this.#nextEventId(),
          type: 'failed',
          failureReason: 'card_declined',
        });
        break;
      case 'duplicate_success': {
        // Same event id twice: the second delivery must be recognised as a replay (UC-004 A3).
        const event = {
          ...base,
          providerEventId: this.#nextEventId(),
          type: 'succeeded' as const,
          failureReason: null,
        };
        this.#deliver(event);
        this.#deliver(event);
        break;
      }
      case 'timeout':
        // The provider never answers; the attempt times out (UC-004 A2).
        break;
    }

    return Promise.resolve({ providerReference });
  }

  /** Builds a signed callback for an attempt, for tests that hand-deliver late or forged reports. */
  callbackFor(body: ProviderCallbackBody): { rawBody: string; signature: string } {
    return this.#codec.encode(body);
  }

  #deliver(body: ProviderCallbackBody): void {
    this.#tasks.run(`simulated-payment-callback:${body.attemptId}`, async () => {
      const { rawBody, signature } = this.#codec.encode(body);
      await this.#handler().execute(this.#codec.decode(rawBody, signature));
    });
  }

  #nextEventId(): string {
    this.#sequence += 1;
    return `sim_evt_${Date.now()}_${this.#sequence}`;
  }
}
