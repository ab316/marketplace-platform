import { type PaymentAttemptView, toPaymentAttemptView } from '../payment-attempt-view.ts';
import type { PaymentAttemptRepository } from '../ports.ts';

export interface GetOrderPaymentsQuery {
  readonly orderId: string;
}

/**
 * Every payment attempt for an order, oldest first. Operator detail (PD-0004 §8); authorization is
 * enforced by the route.
 */
export class GetOrderPayments {
  readonly #attempts: PaymentAttemptRepository;

  constructor(attempts: PaymentAttemptRepository) {
    this.#attempts = attempts;
  }

  async execute(query: GetOrderPaymentsQuery): Promise<readonly PaymentAttemptView[]> {
    const attempts = await this.#attempts.findByOrder(query.orderId);
    return attempts.map(toPaymentAttemptView);
  }
}
