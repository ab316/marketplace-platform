import type {
  CreateListingRequest,
  OrganizationRole,
  SellerListingListResponse,
  SessionResponse,
} from '@acme/api-contracts';
import type { FastifyInstance } from 'fastify';

import { createServer } from '../src/api/create-server.ts';
import { composeApp } from '../src/bootstrap/compose-app.ts';
import { loadConfig } from '../src/bootstrap/config.ts';

/**
 * Seeds the local development database with a standing cast of users, organizations, and
 * listings, so every buyer/seller/operator scenario is testable without creating data by hand.
 *
 * Everything goes through the real HTTP routes of a locally composed app (the same pattern as the
 * API test helpers), so the seed can never bypass an invariant; the one exception is platform
 * admin provisioning, which deliberately has no route (PD-0003) and uses the module API.
 *
 * Re-runnable: users are matched by email, organizations by the owner's membership, listings by
 * title. Existing data is left alone and only the missing pieces are created.
 */

/** One password for the whole cast; printed in the summary. Long enough for the policy (min 10). */
const SEED_PASSWORD = 'marketplace-seed';

interface SeedUser {
  readonly email: string;
  readonly displayName: string;
  readonly describe: string;
}

const BUYERS: readonly SeedUser[] = [
  { email: 'alice@buyer.example', displayName: 'Alice Lindqvist', describe: 'buyer' },
  { email: 'dave@buyer.example', displayName: 'Dave Olsson', describe: 'buyer' },
  { email: 'carin@buyer.example', displayName: 'Carin Åberg', describe: 'buyer' },
  { email: 'erik@buyer.example', displayName: 'Erik Sund', describe: 'buyer' },
];

const STAFF: SeedUser = {
  email: 'staff@marketplace.example',
  displayName: 'Marketplace Staff',
  describe: 'platform admin',
};

const NORDIC = {
  name: 'Nordic Refurb',
  owner: { email: 'bo@nordic-refurb.example', displayName: 'Bo Ek', describe: 'owner' },
  manager: { email: 'nils@nordic-refurb.example', displayName: 'Nils Berg', describe: 'manager' },
  viewer: { email: 'maja@nordic-refurb.example', displayName: 'Maja Holm', describe: 'viewer' },
};

const BALTIC = {
  name: 'Baltic Devices',
  owner: { email: 'jonas@baltic-devices.example', displayName: 'Jonas Berg', describe: 'owner' },
};

const DEFUNCT = {
  name: 'Defunct Devices',
  owner: { email: 'rita@defunct-devices.example', displayName: 'Rita Falk', describe: 'owner' },
};

const log = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

interface InjectArgs {
  readonly method: 'GET' | 'POST' | 'PATCH';
  readonly url: string;
  readonly token?: string;
  readonly payload?: object;
  /** Statuses the caller handles itself; anything else throws with the response body. */
  readonly accept: readonly number[];
}

const inject = async (server: FastifyInstance, args: InjectArgs) => {
  const response = await server.inject({
    method: args.method,
    url: args.url,
    ...(args.token === undefined ? {} : { headers: { authorization: `Bearer ${args.token}` } }),
    ...(args.payload === undefined ? {} : { payload: args.payload }),
  });

  if (!args.accept.includes(response.statusCode)) {
    throw new Error(`${args.method} ${args.url} -> ${response.statusCode}: ${response.body}`);
  }

  return response;
};

/** Signs the user in, creating the account first when it does not exist yet. */
const ensureUser = async (server: FastifyInstance, user: SeedUser): Promise<SessionResponse> => {
  const signIn = () =>
    inject(server, {
      method: 'POST',
      url: '/api/auth/sign-in',
      payload: { email: user.email, password: SEED_PASSWORD },
      accept: [200, 401],
    });

  const first = await signIn();
  if (first.statusCode === 200) {
    return first.json<SessionResponse>();
  }

  const created = await inject(server, {
    method: 'POST',
    url: '/api/auth/sign-up',
    payload: { email: user.email, password: SEED_PASSWORD, displayName: user.displayName },
    accept: [201, 400],
  });

  if (created.statusCode === 400) {
    // The account exists but does not answer to the seed password, so it was created by hand or
    // by an older seed. Nothing can adopt it: resetting a password needs the current one.
    throw new Error(
      `${user.email} already exists with a different password, so the seed cannot use it. ` +
        'Delete that account, or reset the database (`docker compose down -v postgres`, ' +
        '`docker compose up -d postgres`, `pnpm migrate:up`) and seed again.'
    );
  }
  log(`  created account ${user.email} (${user.describe})`);

  const second = await signIn();
  if (second.statusCode !== 200) {
    throw new Error(`Could not sign in as freshly created ${user.email}.`);
  }
  return second.json<SessionResponse>();
};

interface SeededOrganization {
  readonly id: string;
  readonly status: 'active' | 'deactivated';
}

/** The owner's organization, created when they do not belong to one yet. */
const ensureOrganization = async (
  server: FastifyInstance,
  owner: SessionResponse,
  name: string
): Promise<SeededOrganization> => {
  const membership = owner.user.membership;
  if (membership !== null) {
    if (membership.organizationName !== name) {
      throw new Error(
        `${owner.user.email} already belongs to "${membership.organizationName}", expected "${name}". ` +
          'The database holds conflicting seed data; reset it and re-run.'
      );
    }
    return { id: membership.organizationId, status: membership.organizationStatus };
  }

  const created = await inject(server, {
    method: 'POST',
    url: '/api/organizations',
    token: owner.token,
    payload: { name },
    accept: [201],
  });
  log(`  created organization ${name}`);
  return { id: created.json<{ id: string }>().id, status: 'active' };
};

const ensureMember = async (
  server: FastifyInstance,
  ownerToken: string,
  organizationId: string,
  member: SessionResponse,
  role: OrganizationRole
): Promise<void> => {
  if (member.user.membership !== null) {
    return;
  }

  await inject(server, {
    method: 'POST',
    url: `/api/organizations/${organizationId}/members`,
    token: ownerToken,
    payload: { email: member.user.email, role },
    accept: [201],
  });
  log(`  added ${member.user.email} as ${role}`);
};

/** A complete, publishable refurbished-laptop payload; override per listing. */
const laptop = (overrides: Partial<CreateListingRequest>): CreateListingRequest => ({
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
    guarantees: { batteryHealthMinPercent: 92, batteryCycleMin: 100, batteryCycleMax: 300 },
    knownDefects: 'none',
  },
  priceMinor: 799_000,
  currency: 'SEK',
  quantityTotal: 5,
  fulfillmentExpectations: 'Dispatched within 2 business days from Gothenburg.',
  ...overrides,
});

type ListingTarget = 'draft' | 'active' | 'archived';

interface ListingPlan {
  readonly target: ListingTarget;
  readonly payload: CreateListingRequest;
}

/** Existing listings by title, so re-runs recognize what is already there. */
const listListingTitles = async (
  server: FastifyInstance,
  memberToken: string
): Promise<ReadonlySet<string>> => {
  const page = await inject(server, {
    method: 'GET',
    url: '/api/seller/listings?limit=100',
    token: memberToken,
    accept: [200],
  });
  const titles = page
    .json<SellerListingListResponse>()
    .items.map((item) => item.title)
    .filter((title): title is string => title !== null);
  return new Set(titles);
};

const ensureListing = async (
  server: FastifyInstance,
  memberToken: string,
  organizationName: string,
  plan: ListingPlan,
  title: string
): Promise<void> => {
  const created = await inject(server, {
    method: 'POST',
    url: '/api/listings',
    token: memberToken,
    payload: plan.payload,
    accept: [201],
  });
  const listingId = created.json<{ id: string }>().id;

  if (plan.target === 'active' || plan.target === 'archived') {
    await inject(server, {
      method: 'POST',
      url: `/api/listings/${listingId}/publish`,
      token: memberToken,
      accept: [200],
    });
  }
  if (plan.target === 'archived') {
    await inject(server, {
      method: 'POST',
      url: `/api/listings/${listingId}/archive`,
      token: memberToken,
      accept: [200],
    });
  }

  log(`  created ${plan.target} listing "${title}" (${organizationName})`);
};

const ensureListings = async (
  server: FastifyInstance,
  memberToken: string,
  organizationName: string,
  plans: readonly ListingPlan[]
): Promise<void> => {
  const existing = await listListingTitles(server, memberToken);

  for (const plan of plans) {
    const title = plan.payload.title;
    if (title === undefined || title === null) {
      throw new Error('Every seeded listing needs a title; it is the re-run identity.');
    }
    if (existing.has(title)) {
      continue;
    }

    // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: a local one-shot script
    await ensureListing(server, memberToken, organizationName, plan, title);
  }
};

const NORDIC_LISTINGS: readonly ListingPlan[] = [
  { target: 'active', payload: laptop({}) },
  {
    target: 'active',
    payload: laptop({
      title: 'MacBook Air M1 13" — refurbished',
      description: 'Fanless Apple laptop, fully tested with a new keyboard.',
      specifications: {
        brand: 'Apple',
        model: 'MacBook Air M1',
        cpu: 'Apple M1',
        ramGb: 8,
        storageType: 'ssd',
        storageGb: 256,
        screenSizeInches: 13.3,
      },
      priceMinor: 899_000,
      quantityTotal: 3,
    }),
  },
  {
    target: 'active',
    payload: laptop({
      title: 'Dell Latitude 7420 — refurbished',
      description: 'Compact business laptop with light cosmetic wear.',
      specifications: {
        brand: 'Dell',
        model: 'Latitude 7420',
        cpu: 'Intel Core i7-1185G7',
        ramGb: 16,
        storageType: 'nvme',
        storageGb: 512,
        screenSizeInches: 14,
      },
      condition: {
        grade: 'B',
        guarantees: { batteryHealthMinPercent: 85, batteryCycleMin: 200, batteryCycleMax: 500 },
        knownDefects: 'Light scratches on the lid.',
      },
      priceMinor: 549_000,
      quantityTotal: 4,
    }),
  },
  {
    target: 'active',
    payload: laptop({
      title: 'HP EliteBook 840 G8 — refurbished',
      description: 'Budget-friendly workhorse with visible wear, fully functional.',
      specifications: {
        brand: 'HP',
        model: 'EliteBook 840 G8',
        cpu: 'Intel Core i5-1135G7',
        ramGb: 8,
        storageType: 'ssd',
        storageGb: 256,
        screenSizeInches: 14,
      },
      condition: {
        grade: 'C',
        guarantees: { batteryHealthMinPercent: 75 },
        knownDefects: 'Worn palm rest and two dents in the bottom cover.',
      },
      priceMinor: 379_000,
      quantityTotal: 2,
    }),
  },
  {
    // Exactly one unit: the last-unit race, sold-out transitions, "no longer available".
    target: 'active',
    payload: laptop({
      title: 'ThinkPad X1 Carbon Gen 9 — last unit',
      description: 'Premium ultrabook, single unit in stock.',
      specifications: {
        brand: 'Lenovo',
        model: 'ThinkPad X1 Carbon Gen 9',
        cpu: 'Intel Core i7-1165G7',
        ramGb: 16,
        storageType: 'nvme',
        storageGb: 1024,
        screenSizeInches: 14,
      },
      priceMinor: 1_099_000,
      quantityTotal: 1,
    }),
  },
  {
    target: 'archived',
    payload: laptop({
      title: 'ThinkPad T480 — archived',
      description: 'Older model, no longer sold here.',
      specifications: {
        brand: 'Lenovo',
        model: 'ThinkPad T480',
        cpu: 'Intel Core i5-8350U',
        ramGb: 8,
        storageType: 'ssd',
        storageGb: 256,
        screenSizeInches: 14,
      },
      condition: {
        grade: 'B',
        guarantees: { batteryHealthMinPercent: 80 },
        knownDefects: 'Battery replaced; chassis shows normal wear.',
      },
      priceMinor: 299_000,
      quantityTotal: 2,
    }),
  },
  {
    // Complete draft: publishing it is one click, for testing the publish flow.
    target: 'draft',
    payload: laptop({
      title: 'MacBook Pro 14" M1 Pro — draft, ready to publish',
      description: 'Complete draft awaiting publication.',
      specifications: {
        brand: 'Apple',
        model: 'MacBook Pro 14 M1 Pro',
        cpu: 'Apple M1 Pro',
        ramGb: 16,
        storageType: 'ssd',
        storageGb: 512,
        screenSizeInches: 14.2,
      },
      priceMinor: 1_499_000,
      quantityTotal: 2,
    }),
  },
  {
    // Incomplete draft (P1-012): readiness gaps show in the draft editor and publish errors.
    target: 'draft',
    payload: {
      title: 'Asus ZenBook 14 — incomplete draft',
      description: 'Draft with most fields still missing.',
      specifications: { brand: 'Asus', model: 'ZenBook 14' },
    },
  },
];

const BALTIC_LISTINGS: readonly ListingPlan[] = [
  {
    target: 'active',
    payload: laptop({
      title: 'Samsung Galaxy Book3 — refurbished',
      description: 'Light and bright OLED laptop, refurbished in Malmö.',
      specifications: {
        brand: 'Samsung',
        model: 'Galaxy Book3',
        cpu: 'Intel Core i5-1340P',
        ramGb: 16,
        storageType: 'nvme',
        storageGb: 512,
        screenSizeInches: 15.6,
      },
      condition: {
        grade: 'B',
        guarantees: { batteryHealthMinPercent: 88 },
        knownDefects: 'Faint pressure mark on the screen, invisible when on.',
      },
      priceMinor: 499_000,
      quantityTotal: 3,
      fulfillmentExpectations: 'Dispatched within 3 business days from Malmö.',
    }),
  },
  {
    target: 'active',
    payload: laptop({
      title: 'Microsoft Surface Laptop 5 — refurbished',
      description: 'Near-mint Surface with original charger.',
      specifications: {
        brand: 'Microsoft',
        model: 'Surface Laptop 5',
        cpu: 'Intel Core i7-1255U',
        ramGb: 16,
        storageType: 'ssd',
        storageGb: 512,
        screenSizeInches: 13.5,
      },
      priceMinor: 999_000,
      quantityTotal: 2,
      fulfillmentExpectations: 'Dispatched within 3 business days from Malmö.',
    }),
  },
];

const DEFUNCT_LISTINGS: readonly ListingPlan[] = [
  {
    // Published before the organization is deactivated, so "deactivated seller's listing is
    // invisible to buyers" is testable (UC-006 A3).
    target: 'active',
    payload: laptop({
      title: 'Fujitsu LifeBook U7411 — hidden with its seller',
      description: 'Belongs to a deactivated organization; buyers must never see it.',
      specifications: {
        brand: 'Fujitsu',
        model: 'LifeBook U7411',
        cpu: 'Intel Core i5-1145G7',
        ramGb: 16,
        storageType: 'ssd',
        storageGb: 256,
        screenSizeInches: 14,
      },
      priceMinor: 449_000,
      quantityTotal: 2,
    }),
  },
];

const main = async (): Promise<void> => {
  // Silent server log: the script's own output is the report, and failures surface as thrown
  // non-2xx responses with the body included.
  const config = { ...loadConfig(), logLevel: 'silent' as const };

  if (config.nodeEnv === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is "production".');
  }
  if (config.persistence !== 'postgres' || config.databaseUrl === undefined) {
    throw new Error(
      'Seeding needs the real database. Set PERSISTENCE=postgres and DATABASE_URL in ' +
        'apps/backend/.env (see apps/backend/.env.example), start it with `docker compose up -d`, ' +
        'and apply migrations with `pnpm run migrate:up`.'
    );
  }

  const app = composeApp(config);
  // Rate limiting off: the credential routes allow 10 requests/minute, and seeding legitimately
  // signs the whole cast in at once. The seed only ever runs against a local database.
  const server = await createServer(app, undefined, { rateLimit: false });
  await server.ready();

  try {
    log('Seeding buyers…');
    for (const buyer of BUYERS) {
      // oxlint-disable-next-line no-await-in-loop -- sequential on purpose: a local one-shot script
      await ensureUser(server, buyer);
    }

    log('Seeding platform admin…');
    const staff = await ensureUser(server, STAFF);
    if (!staff.user.isPlatformAdmin) {
      // Deliberately no HTTP route (PD-0003); staff are provisioned out of band, which is here.
      await app.identity.provisionPlatformAdmin.execute({ email: STAFF.email });
      log(`  granted platform admin to ${STAFF.email}`);
    }

    log(`Seeding ${NORDIC.name}…`);
    const bo = await ensureUser(server, NORDIC.owner);
    const nils = await ensureUser(server, NORDIC.manager);
    const maja = await ensureUser(server, NORDIC.viewer);
    const nordic = await ensureOrganization(server, bo, NORDIC.name);
    await ensureMember(server, bo.token, nordic.id, nils, 'manager');
    await ensureMember(server, bo.token, nordic.id, maja, 'viewer');
    await ensureListings(server, bo.token, NORDIC.name, NORDIC_LISTINGS);

    log(`Seeding ${BALTIC.name}…`);
    const jonas = await ensureUser(server, BALTIC.owner);
    await ensureOrganization(server, jonas, BALTIC.name);
    await ensureListings(server, jonas.token, BALTIC.name, BALTIC_LISTINGS);

    log(`Seeding ${DEFUNCT.name} (deactivated)…`);
    const rita = await ensureUser(server, DEFUNCT.owner);
    const defunct = await ensureOrganization(server, rita, DEFUNCT.name);
    if (defunct.status === 'active') {
      await ensureListings(server, rita.token, DEFUNCT.name, DEFUNCT_LISTINGS);
      await inject(server, {
        method: 'POST',
        url: `/api/admin/organizations/${defunct.id}/deactivate`,
        token: staff.token,
        payload: { reason: 'Seed data: deactivated so hidden-seller behavior is testable.' },
        accept: [200],
      });
      log(`  deactivated ${DEFUNCT.name}`);
    }

    log('');
    log('Seed complete. Everyone signs in with the password:');
    log(`  ${SEED_PASSWORD}`);
    log('');
    log('Buyers (no organization):');
    for (const buyer of BUYERS) {
      log(`  ${buyer.email.padEnd(36)} ${buyer.displayName}`);
    }
    log('Sellers:');
    log(`  ${NORDIC.owner.email.padEnd(36)} owner,   ${NORDIC.name}`);
    log(`  ${NORDIC.manager.email.padEnd(36)} manager, ${NORDIC.name}`);
    log(`  ${NORDIC.viewer.email.padEnd(36)} viewer,  ${NORDIC.name}`);
    log(`  ${BALTIC.owner.email.padEnd(36)} owner,   ${BALTIC.name}`);
    log(`  ${DEFUNCT.owner.email.padEnd(36)} owner,   ${DEFUNCT.name} (deactivated)`);
    log('Marketplace staff:');
    log(`  ${STAFF.email.padEnd(36)} platform admin`);
    log('');
    log(
      `Listings: ${NORDIC.name} has five active (one with a single unit), one archived, ` +
        `and two drafts (one complete, one incomplete); ${BALTIC.name} has two active; ` +
        `${DEFUNCT.name} has one active listing hidden with its deactivated seller.`
    );
  } finally {
    await server.close();
    await app.dispose();
  }
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Seed failed: ${message}\n`);
  process.exitCode = 1;
});
