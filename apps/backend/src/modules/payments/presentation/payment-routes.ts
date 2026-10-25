import {
  PROVIDER_SIGNATURE_HEADER,
  type ProviderCallbackResponse,
  orderIdParamsSchema,
  startPaymentRequestSchema,
} from '@acme/api-contracts';
import type { FastifyInstance } from 'fastify';

import { requireActor, requirePlatformAdmin } from '../../../shared/presentation/request-actor.ts';
import { parseRequest } from '../../../shared/presentation/validation.ts';
import type { PaymentsModuleApi } from '../payments.api.ts';
import { toOrderPaymentsResponse, toPaymentAttemptResponse } from './payment-presenter.ts';

/** Decodes a signed raw callback body; implemented by the module root over the callback codec. */
export interface ProviderCallbackDecoder {
  decode(
    rawBody: string,
    signature: string | undefined
  ): Parameters<PaymentsModuleApi['handleProviderCallback']['execute']>[0];
}

export const registerPaymentRoutes = async (
  app: FastifyInstance,
  payments: PaymentsModuleApi,
  decoder: ProviderCallbackDecoder
): Promise<void> => {
  // UC-004 P1: the buyer pays. The outcome arrives later, so this is 202 Accepted.
  app.post('/api/orders/:orderId/pay', async (request, reply) => {
    const actor = requireActor(request);
    const params = parseRequest(orderIdParamsSchema, request.params, 'params');
    const body = parseRequest(startPaymentRequestSchema, request.body ?? {}, 'body');

    const attempt = await payments.startPayment.execute({
      orderId: params.orderId,
      buyerUserId: actor.userId,
      scenario: body.scenario,
    });

    return reply.status(202).send(toPaymentAttemptResponse(attempt));
  });

  // Operator detail (PD-0004 §8): every attempt for an order.
  app.get('/api/orders/:orderId/payments', async (request, reply) => {
    requirePlatformAdmin(request);
    const params = parseRequest(orderIdParamsSchema, request.params, 'params');

    const attempts = await payments.getOrderPayments.execute({ orderId: params.orderId });

    return reply.status(200).send(toOrderPaymentsResponse(params.orderId, attempts));
  });

  // The provider webhook (ADR-009 §2). Unauthenticated by design: the HMAC signature over the raw
  // body is the credential, so the body must reach the handler unparsed.
  await app.register((scope, _options, done) => {
    scope.addContentTypeParser(
      'application/json',
      { parseAs: 'string' },
      (_request, body, parsed) => {
        parsed(null, body);
      }
    );

    scope.post('/api/payments/provider/callbacks', async (request, reply) => {
      const rawBody = typeof request.body === 'string' ? request.body : '';
      const header = request.headers[PROVIDER_SIGNATURE_HEADER];
      const signature = Array.isArray(header) ? header[0] : header;

      const callback = decoder.decode(rawBody, signature);
      const result = await payments.handleProviderCallback.execute(callback);

      if (result === 'ignored') {
        request.log.warn(
          { attemptId: callback.attemptId, providerEventId: callback.providerEventId },
          'provider callback ignored: attempt already resolved'
        );
      }

      const response: ProviderCallbackResponse = { accepted: true, result };
      return reply.status(200).send(response);
    });

    done();
  });
};
