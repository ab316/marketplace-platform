import { DomainError, type ErrorDetails } from '@acme/core-domain';

export class PaymentAttemptNotFoundError extends DomainError {
  constructor(attemptId: string) {
    super('not_found', 'PAYMENT_ATTEMPT_NOT_FOUND', 'Payment attempt not found.', { attemptId });
  }
}

/** UC-004 A6: a second start while one attempt is still pending. */
export class PaymentInProgressError extends DomainError {
  constructor(orderId: string) {
    super('conflict', 'PAYMENT_IN_PROGRESS', 'A payment is already in progress for this order.', {
      orderId,
    });
  }
}

/** UC-004 E1: only the order's buyer may pay for it. */
export class PaymentAccessDeniedError extends DomainError {
  constructor(orderId: string) {
    super('forbidden', 'PAYMENT_ACCESS_DENIED', 'Only the buyer of this order can pay for it.', {
      orderId,
    });
  }
}

/** UC-004 A7: the order is paid, cancelled, or past its expiry time. */
export class OrderNotPayableError extends DomainError {
  constructor(orderId: string, details?: ErrorDetails) {
    super('conflict', 'ORDER_NOT_PAYABLE', 'This order cannot be paid.', { orderId, ...details });
  }
}

/** The attempt is in a status that does not permit the requested transition. */
export class PaymentStateError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super('conflict', 'PAYMENT_STATE_CONFLICT', message, details);
  }
}

export class PaymentConcurrencyError extends DomainError {
  constructor(attemptId: string) {
    super(
      'conflict',
      'PAYMENT_CONCURRENCY_CONFLICT',
      'Payment attempt was modified concurrently.',
      { attemptId }
    );
  }
}

/** UC-004 E2: a provider report that does not match what we asked the provider to collect. */
export class ProviderCallbackRejectedError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super('validation', 'PROVIDER_CALLBACK_REJECTED', message, details);
  }
}

/** PD-0004 §9: the scenario field exists only for the simulated provider. */
export class ScenarioNotSupportedError extends DomainError {
  constructor() {
    super(
      'validation',
      'PAYMENT_SCENARIO_NOT_SUPPORTED',
      'Payment scenarios are only available with the simulated payment provider.'
    );
  }
}
