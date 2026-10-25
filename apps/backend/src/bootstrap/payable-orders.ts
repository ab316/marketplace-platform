import { Money } from '@acme/core-domain';

import type { OrdersModuleApi } from '../modules/orders/orders.api.ts';
import type { PayableOrders } from '../modules/payments/application/ports.ts';

/**
 * Connects the payments module's view of orders to the orders module's public API (ADR-009 §1).
 * Wired here so neither module imports the other.
 */
export const createPayableOrders = (orders: OrdersModuleApi): PayableOrders => ({
  load: async (orderId, viewerUserId) => {
    // `GetOrder` enforces who may see the order; the payments module additionally insists the
    // viewer is the buyer.
    const view = await orders.getOrder.execute({ orderId, viewerUserId });
    return {
      id: view.id,
      buyerUserId: view.buyerUserId,
      total: Money.fromMinor(view.total.amountMinor, view.total.currency),
      status: view.status,
      expiresAt: view.expiresAt,
    };
  },

  hold: async (orderId, attemptId, holdUntil) => {
    await orders.holdOrderForPayment.execute({ orderId, attemptId, holdUntil });
  },

  markPaid: async (orderId, attemptId, feeRateBps) => {
    const result = await orders.markOrderPaid.execute({ orderId, attemptId, feeRateBps });
    return result.outcome;
  },

  recordFailed: async (orderId, attemptId, reason) => {
    await orders.recordPaymentFailed.execute({ orderId, attemptId, reason });
  },

  recordReturned: async (orderId, attemptId, reason) => {
    await orders.recordPaymentReturned.execute({ orderId, attemptId, reason });
  },
});
