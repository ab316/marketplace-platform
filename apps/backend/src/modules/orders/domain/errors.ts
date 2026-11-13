import { DomainError, type ErrorDetails } from '@acme/core-domain';

export class OrderNotFoundError extends DomainError {
  constructor(orderId: string) {
    super('not_found', 'ORDER_NOT_FOUND', 'Order not found.', { orderId });
  }
}

export class OrderAccessDeniedError extends DomainError {
  constructor(orderId: string) {
    super('forbidden', 'ORDER_ACCESS_DENIED', 'You cannot access this order.', { orderId });
  }
}

/**
 * The caller may not place this order at all (buyer ordering spec D3, P1-021): marketplace staff
 * never order, and a selling organization's members cannot order their own listing.
 */
export class OrderNotAllowedError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super('forbidden', 'ORDER_NOT_ALLOWED', message, details);
  }
}

/** The order is in a status that does not permit the requested action. */
export class OrderStateError extends DomainError {
  constructor(message: string, details?: ErrorDetails) {
    super('conflict', 'ORDER_STATE_CONFLICT', message, details);
  }
}

/** The order changed between read and write; the caller should retry with fresh state. */
export class OrderConcurrencyError extends DomainError {
  constructor(orderId: string) {
    super('conflict', 'ORDER_CONCURRENCY_CONFLICT', 'Order was modified concurrently.', {
      orderId,
    });
  }
}
