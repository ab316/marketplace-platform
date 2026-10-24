import type { ZodType } from 'zod';

import { RequestValidationError } from './errors.ts';

/**
 * Parses one part of a request with its shared contract schema. Validation lives here rather than
 * in Fastify's schema compiler so `packages/api-contracts` stays the single source of truth for
 * request and response shapes.
 */
export const parseRequest = <T>(schema: ZodType<T>, input: unknown, location: string): T => {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  return raiseValidationError(result.error.issues, location);
};

const raiseValidationError = (
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
  location: string
): never => {
  throw new RequestValidationError({
    location,
    issues: issues.map((issue) => ({
      path: issue.path.map(String).join('.'),
      message: issue.message,
    })),
  });
};
