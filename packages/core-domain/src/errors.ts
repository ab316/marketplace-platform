/**
 * Error kinds the presentation layer maps to transport status codes. Keeping the taxonomy in the
 * domain package lets domain and application code describe failures without importing a framework.
 */
export type ErrorKind =
  | 'validation'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'internal';

export type ErrorDetails = Readonly<Record<string, unknown>>;

/** Base class for expected, user-meaningful failures. Unexpected failures stay plain `Error`s. */
export class DomainError extends Error {
  readonly kind: ErrorKind;
  readonly code: string;
  readonly details: ErrorDetails | undefined;

  constructor(kind: ErrorKind, code: string, message: string, details?: ErrorDetails) {
    super(message);
    this.name = new.target.name;
    this.kind = kind;
    this.code = code;
    this.details = details;
  }
}

export const isDomainError = (error: unknown): error is DomainError => error instanceof DomainError;
