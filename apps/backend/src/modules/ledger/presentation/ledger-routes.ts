import { orderIdParamsSchema } from '@acme/api-contracts';
import type { FastifyInstance } from 'fastify';

import { requirePlatformAdmin } from '../../../shared/presentation/request-actor.ts';
import { parseRequest } from '../../../shared/presentation/validation.ts';
import type { LedgerModuleApi } from '../ledger.api.ts';
import { toOrderFinancialHistoryResponse } from './ledger-presenter.ts';

export const registerLedgerRoutes = (app: FastifyInstance, ledger: LedgerModuleApi): void => {
  // Operator view (PD-0004 §8): every money movement recorded against an order.
  app.get('/api/orders/:orderId/financial-history', async (request, reply) => {
    requirePlatformAdmin(request);
    const params = parseRequest(orderIdParamsSchema, request.params, 'params');

    const history = await ledger.getOrderFinancialHistory.execute({ orderId: params.orderId });

    return reply.status(200).send(toOrderFinancialHistoryResponse(history));
  });
};
