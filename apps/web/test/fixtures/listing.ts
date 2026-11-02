import type { Listing } from '@acme/api-contracts';

/**
 * Deterministic listing factory for the seller-listing suites. Satisfies the real contract
 * schema, so a fixture that drifts from it fails where the data layer parses.
 */
let nextId = 0;

export const makeListing = (overrides: Partial<Listing> = {}): Listing => {
  nextId += 1;
  return {
    id: `lst_${nextId}`,
    organizationId: 'org_1',
    status: 'draft',
    title: `ThinkPad T14 Gen 3 №${nextId}`,
    description: 'Off-lease business laptops, fully refurbished.',
    specifications: {
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 3',
      cpu: 'AMD Ryzen 5 PRO 6650U',
      ramGb: 16,
      storageType: 'nvme',
      storageGb: 256,
      screenSizeInches: 14,
    },
    condition: {
      grade: 'B',
      guarantees: { batteryHealthMinPercent: 85, batteryCycleMin: 150, batteryCycleMax: 400 },
      knownDefects: 'Light scuffing on the lid corners.',
    },
    price: { amountMinor: 749_000, currency: 'SEK' },
    totalQuantity: 12,
    reservedQuantity: 0,
    soldQuantity: 0,
    availableQuantity: 12,
    fulfillmentExpectations: 'Shipped with PostNord within 2 working days of payment.',
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-30T15:22:00.000Z',
    publishedAt: null,
    archivedAt: null,
    ...overrides,
  };
};

export const activeListing = (overrides: Partial<Listing> = {}): Listing =>
  makeListing({
    status: 'active',
    publishedAt: '2026-10-21T07:30:00.000Z',
    reservedQuantity: 2,
    soldQuantity: 3,
    availableQuantity: 7,
    ...overrides,
  });

export const archivedListing = (overrides: Partial<Listing> = {}): Listing =>
  activeListing({
    status: 'archived',
    archivedAt: '2026-10-27T16:40:00.000Z',
    ...overrides,
  });
