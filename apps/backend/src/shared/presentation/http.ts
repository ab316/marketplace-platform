import type { FastifyReply, FastifyRequest } from 'fastify';
import { z, type ZodType } from 'zod';

export const idParamsSchema = z.object({ id: z.string().min(1) });

// Temporary identity resolution for UC-001: real authentication is out of
// scope, so callers identify themselves through headers with demo defaults.
export const DEMO_BUYER_ID = 'demo-buyer';
export const DEMO_ORGANIZATION_ID = 'demo-org';

export function resolveUserId(request: FastifyRequest): string {
  const header = request.headers['x-user-id'];
  return typeof header === 'string' && header.length > 0 ? header : DEMO_BUYER_ID;
}

export function resolveOrganizationId(request: FastifyRequest): string {
  const header = request.headers['x-organization-id'];
  return typeof header === 'string' && header.length > 0 ? header : DEMO_ORGANIZATION_ID;
}

export class RequestValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';
  readonly issues: unknown;

  constructor(issues: unknown) {
    super('Request validation failed');
    this.name = 'RequestValidationError';
    this.issues = issues;
  }
}

export function parseOrThrow<T extends ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new RequestValidationError(result.error.issues);
  }
  return result.data;
}

// Stable error envelope: { error: { code, message, details? } }.
const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_ERROR: 400,
  FORBIDDEN_LISTING_ACCESS: 403,
  FORBIDDEN_ORDER_ACCESS: 403,
  LISTING_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  INVALID_LISTING_STATE: 409,
  INVALID_ORDER_STATE: 409,
  NO_AVAILABLE_STOCK: 409,
  LISTING_VERSION_CONFLICT: 409,
  ORDER_VERSION_CONFLICT: 409,
  LISTING_NOT_PUBLISHABLE: 422,
};

export function appErrorHandler(
  error: unknown,
  _request: FastifyRequest,
  reply: FastifyReply
): FastifyReply {
  if (error instanceof Error && 'code' in error && typeof error.code === 'string') {
    const status = STATUS_BY_CODE[error.code];
    if (status !== undefined) {
      const details =
        error instanceof RequestValidationError
          ? error.issues
          : 'missingFields' in error
            ? { missingFields: error.missingFields }
            : undefined;
      return reply
        .status(status)
        .send({ error: { code: error.code, message: error.message, details } });
    }
  }
  const message = error instanceof Error ? error.message : 'Internal server error';
  return reply.status(500).send({ error: { code: 'INTERNAL_ERROR', message } });
}
