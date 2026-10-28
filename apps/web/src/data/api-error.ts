import { errorResponseSchema } from '@acme/api-contracts';

/**
 * A normalized backend failure.
 *
 * Every non-2xx backend response uses the shared error envelope, so the UI can branch on `code`
 * and `status` instead of parsing messages. Keep messages user-safe: they may be rendered, and
 * must not leak internals (REPO_MAP.md §9).
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Readonly<Record<string, unknown>> | undefined;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** The caller has no usable session: signed out, expired, or revoked (ADR-008). */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  /** The caller is known but not allowed to do this. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** Worth offering a retry for; 4xx other than 429 is not. */
  get isRetryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

/** Raised when the backend answers 2xx with a body the shared contract rejects. */
export class ApiContractError extends Error {
  readonly path: string;

  constructor(path: string, detail: string) {
    super(`Response from ${path} did not match the API contract: ${detail}`);
    this.name = 'ApiContractError';
    this.path = path;
  }
}

/** Raised when the backend cannot be reached at all. */
export class ApiTransportError extends Error {
  constructor(path: string, cause: unknown) {
    super(`Request to ${path} could not be completed.`);
    this.name = 'ApiTransportError';
    this.cause = cause;
  }
}

/**
 * Parses the shared error envelope, falling back to a generic message when a proxy or load
 * balancer returns something that is not our envelope at all.
 */
export const toApiError = (status: number, body: unknown): ApiError => {
  const parsed = errorResponseSchema.safeParse(body);

  if (!parsed.success) {
    return new ApiError(status, 'unknown_error', 'Something went wrong. Please try again.');
  }

  const { code, message, details } = parsed.data.error;
  return new ApiError(status, code, message, details);
};
