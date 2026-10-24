/** Reads the current time. Injected so behavior stays deterministic in tests. */
export interface Clock {
  now(): Date;
}

/** Produces unique identifiers. Injected so identifiers stay deterministic in tests. */
export interface IdGenerator {
  next(): string;
}
