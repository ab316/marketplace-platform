import type { CancelOrder } from './application/commands/cancel-order.ts';
import type { CreateOrder } from './application/commands/create-order.ts';
import type { ExpireOverdueOrders } from './application/commands/expire-overdue-orders.ts';
import type {
  HoldOrderForPayment,
  MarkOrderPaid,
  RecordPaymentFailed,
  RecordPaymentReturned,
} from './application/commands/payment-outcomes.ts';
import type { GetOrder } from './application/queries/get-order.ts';
import type { ListBuyerOrders } from './application/queries/list-buyer-orders.ts';

/** Everything other modules, the HTTP layer, and jobs may use from this module. */
export interface OrdersModuleApi {
  readonly createOrder: CreateOrder;
  readonly cancelOrder: CancelOrder;
  /** Driven by the reservation-expiry job rather than by HTTP. */
  readonly expireOverdueOrders: ExpireOverdueOrders;
  /** Driven by the payments module (ADR-009 §3), never by HTTP. */
  readonly holdOrderForPayment: HoldOrderForPayment;
  readonly markOrderPaid: MarkOrderPaid;
  readonly recordPaymentFailed: RecordPaymentFailed;
  readonly recordPaymentReturned: RecordPaymentReturned;
  readonly getOrder: GetOrder;
  readonly listBuyerOrders: ListBuyerOrders;
}
