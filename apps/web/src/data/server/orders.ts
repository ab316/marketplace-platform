import 'server-only';
import {
  type Order,
  type OrderListResponse,
  orderListResponseSchema,
  orderSchema,
} from '@acme/api-contracts';

import { apiRequest } from '../api-client.ts';
import { ApiError } from '../api-error.ts';

/** Twelve per page, matching the catalogue, settled as spec D9. */
export const ORDERS_PAGE_SIZE = 12;

/**
 * One order as its buyer (or the selling organization, or staff) may see it.
 *
 * `null` covers an unknown id *and* someone else's order in one answer, deliberately: the page
 * must not reveal whether an order id exists (UC-014 E1), so 403 and 404 both read as
 * "not available".
 */
export const getOrder = async (orderId: string): Promise<Order | null> => {
  try {
    return await apiRequest({
      path: `/api/orders/${encodeURIComponent(orderId)}`,
      schema: orderSchema,
    });
  } catch (error) {
    if (error instanceof ApiError && (error.isNotFound || error.isForbidden)) {
      return null;
    }
    throw error;
  }
};

/**
 * The orders the caller's organization received, newest first (UC-015 R1). The backend derives
 * the organization from the session's membership, so nothing here can ask for another one.
 */
export const listOrganizationOrders = (page: number): Promise<OrderListResponse> =>
  apiRequest({
    path: '/api/seller/orders',
    query: {
      limit: ORDERS_PAGE_SIZE,
      offset: (page - 1) * ORDERS_PAGE_SIZE,
    },
    schema: orderListResponseSchema,
  });

/** The signed-in buyer's own orders, newest first (UC-014 O1). */
export const listBuyerOrders = (page: number): Promise<OrderListResponse> =>
  apiRequest({
    path: '/api/buyer/orders',
    query: {
      limit: ORDERS_PAGE_SIZE,
      offset: (page - 1) * ORDERS_PAGE_SIZE,
    },
    schema: orderListResponseSchema,
  });
