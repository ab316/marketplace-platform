import type { ErrorResponse } from '@acme/api-contracts';
import { type ErrorDetails, type ErrorKind, isDomainError } from '@acme/core-domain';
import type { FastifyInstance } from 'fastify';

const STATUS_BY_KIND: Record<ErrorKind, number> = {
  validation: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  internal: 500,
};

const toEnvelope = (code: string, message: string, details?: ErrorDetails): ErrorResponse => ({
  error: {
    code,
    message,
    ...(details === undefined ? {} : { details }),
  },
});

/**
 * Single place that turns a failure into the response contract. Expected failures carry their own
 * kind and code; anything else is reported as an internal error without leaking its message.
 */
export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setNotFoundHandler((request, reply) =>
    reply
      .status(404)
      .send(toEnvelope('ROUTE_NOT_FOUND', `No route for ${request.method} ${request.url}.`))
  );

  app.setErrorHandler((error, request, reply) => {
    if (isDomainError(error)) {
      return reply
        .status(STATUS_BY_KIND[error.kind])
        .send(toEnvelope(error.code, error.message, error.details));
    }

    request.log.error({ err: error }, 'unhandled request error');
    return reply.status(500).send(toEnvelope('INTERNAL_ERROR', 'Something went wrong.'));
  });
};
