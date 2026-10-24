import type { IdGenerator } from '@acme/core-contracts';
import { nanoid } from 'nanoid';

/** Prefixed identifiers so an id is recognisable on sight when exploring the API. */
export const createIdGenerator = (prefix: string): IdGenerator => ({
  next: () => `${prefix}_${nanoid(16)}`,
});
