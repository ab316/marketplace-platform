import type {
  CreateListingRequest,
  Order,
  OrganizationRole,
  PaymentAttempt,
  PaymentScenario,
  ProviderCallback,
  SessionResponse,
} from '@acme/api-contracts';
import { PROVIDER_SIGNATURE_HEADER } from '@acme/api-contracts';
import type { FastifyInstance } from 'fastify';
import { inject } from 'vitest';

import { createServer } from '../../src/api/create-server.ts';
import { type App, composeApp } from '../../src/bootstrap/compose-app.ts';
import type { Config } from '../../src/bootstrap/config.ts';
import { TestClock } from './test-clock.ts';
import { getTestDatabase } from './test-database.ts';
import { TestPasswordHasher } from './test-passwords.ts';

const HOURS_24_IN_MS = 24 * 60 * 60 * 1000;
const MINUTES_15_IN_MS = 15 * 60 * 1000;

/** Known to tests so they can sign callbacks themselves (late success, forgeries). */
export const TEST_WEBHOOK_SECRET = 'test-webhook-secret-not-for-production';

const testConfig = (persistence: Config['persistence'], databaseUrl?: string): Config => ({
  nodeEnv: 'test',
  host: '127.0.0.1',
  port: 0,
  logLevel: 'silent',
  persistence,
  databaseUrl,
  reservationTtlMs: HOURS_24_IN_MS,
  expirySweepIntervalMs: 0,
  expirySweepBatchSize: 100,
  sessionTtlMs: 7 * HOURS_24_IN_MS,
  paymentProvider: 'simulated',
  paymentWebhookSecret: TEST_WEBHOOK_SECRET,
  paymentAttemptTimeoutMs: MINUTES_15_IN_MS,
  paymentTimeoutSweepIntervalMs: 0,
  paymentTimeoutSweepBatchSize: 100,
  platformFeeBps: 800,
});

export interface TestApp {
  readonly server: FastifyInstance;
  readonly app: App;
  readonly clock: TestClock;
  close(): Promise<void>;
}

/**
 * Boots the real application wiring, so API tests exercise the same routes, validation,
 * authentication, handlers, domain rules, and repositories the server uses.
 *
 * Persistence is real Postgres by default: the file's database (cloned from the migrated
 * template by the global setup) is emptied before each app is composed, so every test starts
 * from the same migrated, empty schema. `TEST_PERSISTENCE=memory` swaps in the in-memory
 * repositories for a fast, Docker-free run.
 */
export const createTestApp = async (options?: {
  /** Opt into real throttling for tests that assert it; off by default (see `createServer`). */
  readonly rateLimit?: boolean;
}): Promise<TestApp> => {
  const clock = new TestClock();
  const overrides = {
    clock,
    passwords: new TestPasswordHasher(),
    // A failing background task (a simulated callback) must fail the test loudly, not log quietly.
    logger: {
      error: (context: Record<string, unknown>, message: string) => {
        const cause = context['err'];
        const detail = cause instanceof Error ? cause.message : String(cause);
        throw new Error(`${message}: ${detail}`);
      },
    },
  };

  const app = await (async () => {
    if (inject('persistence') === 'memory') {
      return composeApp(testConfig('memory'), overrides);
    }

    const database = await getTestDatabase();
    await database.reset();
    return composeApp(testConfig('postgres', database.url), {
      ...overrides,
      database: database.handle,
    });
  })();
  const server = await createServer(app, undefined, { rateLimit: options?.rateLimit ?? false });
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

export const PASSWORD = 'correct-horse-battery';

/** Reads the stable error envelope, narrowing it instead of asserting a shape. */
export const errorCodeOf = (response: { json: () => unknown }): string => {
  const body: unknown = response.json();
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const { error } = body;
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const { code } = error;
      if (typeof code === 'string') {
        return code;
      }
    }
  }

  throw new Error(`Expected an error envelope, got: ${JSON.stringify(body)}`);
};

/** `Authorization` header for a signed-in caller. */
export const auth = (token: string): Record<string, string> => ({
  authorization: `Bearer ${token}`,
});

export interface TestUser {
  readonly userId: string;
  readonly email: string;
  readonly token: string;
}

/**
 * Creates an account and signs in, returning a usable session.
 *
 * Tests go through the real endpoints rather than seeding rows, so every suite also exercises
 * the sign-up and sign-in paths the product depends on.
 */
export const signUp = async (
  testApp: TestApp,
  email: string,
  displayName = email
): Promise<TestUser> => {
  const created = await testApp.server.inject({
    method: 'POST',
    url: '/api/auth/sign-up',
    payload: { email, password: PASSWORD, displayName },
  });

  if (created.statusCode !== 201) {
    throw new Error(`Failed to sign up ${email}: ${created.body}`);
  }

  return {
    userId: created.json<{ id: string }>().id,
    email,
    token: await signIn(testApp, email),
  };
};

export const signIn = async (
  { server }: TestApp,
  email: string,
  password: string = PASSWORD
): Promise<string> => {
  const response = await server.inject({
    method: 'POST',
    url: '/api/auth/sign-in',
    payload: { email, password },
  });

  if (response.statusCode !== 200) {
    throw new Error(`Failed to sign in ${email}: ${response.body}`);
  }

  return response.json<SessionResponse>().token;
};

export const createOrganization = async (
  { server }: TestApp,
  token: string,
  name: string
): Promise<string> => {
  const response = await server.inject({
    method: 'POST',
    url: '/api/organizations',
    headers: auth(token),
    payload: { name },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to create organization ${name}: ${response.body}`);
  }

  return response.json<{ id: string }>().id;
};

export const addMember = async (
  { server }: TestApp,
  ownerToken: string,
  organizationId: string,
  email: string,
  role: OrganizationRole
): Promise<void> => {
  const response = await server.inject({
    method: 'POST',
    url: `/api/organizations/${organizationId}/members`,
    headers: auth(ownerToken),
    payload: { email, role },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to add ${email} as ${role}: ${response.body}`);
  }
};

/**
 * Promotes an account to marketplace staff.
 *
 * Goes through the module API rather than HTTP because there is deliberately no route for it
 * (PD-0003) — which is itself asserted in the authorization-matrix suite.
 */
export const makePlatformAdmin = async (testApp: TestApp, email: string): Promise<string> => {
  await testApp.app.identity.provisionPlatformAdmin.execute({ email });
  return signIn(testApp, email);
};

export interface Marketplace {
  readonly alice: TestUser;
  readonly dave: TestUser;
  /** Owner of Nordic Refurb. */
  readonly bo: TestUser;
  /** Manager at Nordic Refurb: may manage listings, not members. */
  readonly nils: TestUser;
  /** Viewer at Nordic Refurb: read-only. */
  readonly maja: TestUser;
  /** Owner of a different organization, for cross-organization checks. */
  readonly jonas: TestUser;
  readonly adminToken: string;
  readonly nordicOrgId: string;
  readonly balticOrgId: string;
}

/**
 * The standing cast used across API tests: two buyers, one organization with all three roles,
 * a second organization, and marketplace staff.
 */
export const seedMarketplace = async (testApp: TestApp): Promise<Marketplace> => {
  const alice = await signUp(testApp, 'alice@buyer.example', 'Alice Lindqvist');
  const dave = await signUp(testApp, 'dave@buyer.example', 'Dave Olsson');

  const bo = await signUp(testApp, 'bo@nordic-refurb.example', 'Bo Ek');
  const nils = await signUp(testApp, 'nils@nordic-refurb.example', 'Nils Berg');
  const maja = await signUp(testApp, 'maja@nordic-refurb.example', 'Maja Holm');
  const jonas = await signUp(testApp, 'jonas@baltic-devices.example', 'Jonas Berg');

  const nordicOrgId = await createOrganization(testApp, bo.token, 'Nordic Refurb');
  await addMember(testApp, bo.token, nordicOrgId, nils.email, 'manager');
  await addMember(testApp, bo.token, nordicOrgId, maja.email, 'viewer');

  const balticOrgId = await createOrganization(testApp, jonas.token, 'Baltic Devices');

  await signUp(testApp, 'staff@marketplace.example', 'Marketplace Staff');
  const adminToken = await makePlatformAdmin(testApp, 'staff@marketplace.example');

  return { alice, dave, bo, nils, maja, jonas, adminToken, nordicOrgId, balticOrgId };
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
  testApp: TestApp,
  token: string,
  overrides: Partial<CreateListingRequest> = {}
): Promise<string> => {
  const created = await testApp.server.inject({
    method: 'POST',
    url: '/api/listings',
    headers: auth(token),
    payload: listingPayload(overrides),
  });

  if (created.statusCode !== 201) {
    throw new Error(`Failed to create listing: ${created.body}`);
  }

  const listingId = created.json<{ id: string }>().id;

  const published = await testApp.server.inject({
    method: 'POST',
    url: `/api/listings/${listingId}/publish`,
    headers: auth(token),
  });

  if (published.statusCode !== 200) {
    throw new Error(`Failed to publish listing: ${published.body}`);
  }

  return listingId;
};

// --- Orders and payments (UC-001, UC-004) ----------------------------------------------------

export const placeOrder = async (
  testApp: TestApp,
  token: string,
  listingId: string
): Promise<Order> => {
  const response = await testApp.server.inject({
    method: 'POST',
    url: '/api/orders',
    headers: auth(token),
    payload: { listingId },
  });

  if (response.statusCode !== 201) {
    throw new Error(`Failed to place order: ${response.body}`);
  }
  return response.json<Order>();
};

export const readOrder = async (
  testApp: TestApp,
  token: string,
  orderId: string
): Promise<Order> => {
  const response = await testApp.server.inject({
    method: 'GET',
    url: `/api/orders/${orderId}`,
    headers: auth(token),
  });

  if (response.statusCode !== 200) {
    throw new Error(`Failed to read order ${orderId}: ${response.body}`);
  }
  return response.json<Order>();
};

/**
 * Starts a payment and waits for the simulated provider to deliver its answer, so the caller can
 * read the outcome straight away. Returns the attempt as it was accepted (pending).
 */
export const payOrder = async (
  testApp: TestApp,
  token: string,
  orderId: string,
  scenario?: PaymentScenario
): Promise<PaymentAttempt> => {
  const response = await testApp.server.inject({
    method: 'POST',
    url: `/api/orders/${orderId}/pay`,
    headers: auth(token),
    payload: scenario === undefined ? {} : { scenario },
  });

  if (response.statusCode !== 202) {
    throw new Error(`Failed to start payment for ${orderId}: ${response.body}`);
  }
  await testApp.app.backgroundTasks.drain();
  return response.json<PaymentAttempt>();
};

/** Delivers a provider callback through the public webhook, signed with the test secret. */
export const deliverCallback = (
  testApp: TestApp,
  body: ProviderCallback,
  options: { signature?: string | undefined; rawBody?: string | undefined } = {}
) => {
  const { rawBody, signature } = testApp.app.payments.simulatedProvider.callbackFor(body);
  return testApp.server.inject({
    method: 'POST',
    url: '/api/payments/provider/callbacks',
    headers: {
      'content-type': 'application/json',
      [PROVIDER_SIGNATURE_HEADER]: options.signature ?? signature,
    },
    payload: options.rawBody ?? rawBody,
  });
};

/** A well-formed success report for an attempt, as the simulated provider would send it. */
export const successCallback = (
  attempt: PaymentAttempt,
  providerEventId = `evt_${attempt.id}`
): ProviderCallback => ({
  provider: 'simulated',
  providerEventId,
  attemptId: attempt.id,
  providerReference: `sim_${attempt.id}`,
  type: 'succeeded',
  amountMinor: attempt.amount.amountMinor,
  currency: 'SEK',
  failureReason: null,
});
