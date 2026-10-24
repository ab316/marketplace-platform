/**
 * Narrowing helpers for values read back from the database.
 *
 * Column checks keep the stored values valid, but the driver still hands them back as `string` and
 * `unknown`. Validating here means a schema drift surfaces as a clear error instead of an invalid
 * value flowing into the domain.
 */

export class CorruptRowError extends Error {
  constructor(field: string, value: unknown) {
    super(`Unexpected stored value for "${field}": ${JSON.stringify(value)}`);
    this.name = 'CorruptRowError';
  }
}

const includes = <T extends string>(allowed: readonly T[], value: string): value is T =>
  (allowed as readonly string[]).includes(value);

/** Narrows a stored string to one of the values the domain accepts. */
export const readEnum = <T extends string>(
  allowed: readonly T[],
  value: string,
  field: string
): T => {
  if (!includes(allowed, value)) {
    throw new CorruptRowError(field, value);
  }
  return value;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads a jsonb object column, treating a missing value as empty. */
export const readJsonObject = (value: unknown): Readonly<Record<string, unknown>> =>
  isRecord(value) ? value : {};
