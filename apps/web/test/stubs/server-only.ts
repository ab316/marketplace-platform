/**
 * No-op stand-in for the `server-only` guard under Vitest (aliased in `vitest.config.ts`).
 *
 * The real package throws when imported outside a server environment, which is exactly what we
 * want in a build and exactly what blocks testing server modules in jsdom.
 */
export {};
