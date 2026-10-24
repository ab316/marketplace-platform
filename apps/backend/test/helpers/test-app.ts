import type { CreateListingRequest } from '@acme/api-contracts';
import type { FastifyInstance } from 'fastify';

import { createServer } from '../../src/api/create-server.ts';
import { type App, composeApp } from '../../src/bootstrap/compose-app.ts';
import type { Config } from '../../src/bootstrap/config.ts';
import { TestClock } from './test-clock.ts';

const HOURS_24_IN_MS = 24 * 60 * 60 * 1000;

/** Seed actors from `src/shared/presentation/actors.ts`. */
export const ACTORS = {
  buyerAlice: 'usr_buyer_alice',
  buyerDave: 'usr_buyer_dave',
  /** Can manage listings for `org_nordic_refurb`. */
  sellerBo: 'usr_seller_bo',
  /** Belongs to `org_nordic_refurb` but cannot manage listings. */
  sellerMaja: 'usr_seller_maja',
  /** Manages listings for a different organization. */
  sellerJonas: 'usr_seller_jonas',
} as const;

export const NORDIC_ORG = 'org_nordic_refurb';

const testConfig = (): Config => ({
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 0,
  logLevel: 'silent',
  persistence: 'memory',
  databaseUrl: undefined,
  reservationTtlMs: HOURS_24_IN_MS,
  expirySweepIntervalMs: 0,
  expirySweepBatchSize: 100,
});

export interface TestApp {
  readonly server: FastifyInstance;
  readonly app: App;
  readonly clock: TestClock;
  close(): Promise<void>;
}

/**
 * Boots the real application wiring over in-process persistence, so API tests exercise the same
 * routes, validation, handlers, and domain rules the server uses.
 */
export const createTestApp = async (): Promise<TestApp> => {
  const clock = new TestClock();
  const app = composeApp(testConfig(), { clock });
  const server = await createServer(app);
  await server.ready();

  return {
    server,
    app,
    clock,
    close: async () => {
      await server.close();
      await app.dispose();
    },
  };
};

/** A valid refurbished-laptop listing; override only what a test is about. */
export const listingPayload = (
  overrides: Partial<CreateListingRequest> = {}
): Record<string, unknown> => ({
  title: 'ThinkPad T14 Gen 3 — refurbished',
  description: 'Business laptop, professionally refurbished and tested.',
  specifications: {
    brand: 'Lenovo',
    model: 'ThinkPad T14 Gen 3',
    cpu: 'Intel Core i5-1245U',
    ramGb: 16,
    storageType: 'nvme',
    storageGb: 512,
    screenSizeInches: 14,
  },
  condition: {
    grade: 'A',
    guarantees: {
      batteryHealthMinPercent: 92,
      batteryCycleMin: 100,
      batteryCycleMax: 300,
    },
    knownDefects: 'none',
  },
  priceMinor: 799_000,
  currency: 'SEK',
  quantityTotal: 3,
  fulfillmentExpectations: 'Dispatched within 2 business days from Gothenburg.',
  ...overrides,
});

/** Creates a draft and publishes it, returning the active listing id. */
export const publishListing = async (
  { server }: TestApp,
  overrides: Partial<CreateListingRequest> = {},
  actorId: string = ACTORS.sellerBo
): Promise<string> => {
  const created = await server.inject({
    method: 'POST',
    url: '/api/listings',
    headers: { 'x-actor-id': actorId },
    payload: listingPayload(overrides),
  });

  if (created.statusCode !== 201) {
    throw new Error(`Failed to create listing: ${created.body}`);
  }

  const listingId = created.json<{ id: string }>().id;

  const published = await server.inject({
    method: 'POST',
    url: `/api/listings/${listingId}/publish`,
    headers: { 'x-actor-id': actorId },
  });

  if (published.statusCode !== 200) {
    throw new Error(`Failed to publish listing: ${published.body}`);
  }

  return listingId;
};
