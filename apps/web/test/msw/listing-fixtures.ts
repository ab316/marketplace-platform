import {
  type Listing,
  type ListingDraft,
  listingDraftSchema,
  listingSchema,
} from '@acme/api-contracts';

/**
 * Listing fixtures for the seller-listing tests. Parsed with the real contract schemas, so a
 * fixture that drifts from the contract fails loudly instead of testing an impossible shape.
 */

const ALL_MISSING = [
  'title',
  'description',
  'specifications.brand',
  'specifications.model',
  'specifications.cpu',
  'specifications.ramGb',
  'specifications.storageType',
  'specifications.storageGb',
  'specifications.screenSizeInches',
  'condition.grade',
  'condition.guarantees.batteryHealthMinPercent',
  'condition.knownDefects',
  'priceMinor',
  'quantityTotal',
  'fulfillmentExpectations',
].map((path) => ({ path, message: 'Required to publish.' }));

export const emptyDraft = (overrides: Partial<ListingDraft> = {}): ListingDraft =>
  listingDraftSchema.parse({
    id: 'lst_draft',
    organizationId: 'org_nordic',
    status: 'draft',
    title: null,
    description: null,
    specifications: {
      brand: null,
      model: null,
      cpu: null,
      ramGb: null,
      storageType: null,
      storageGb: null,
      screenSizeInches: null,
    },
    condition: {
      grade: null,
      guarantees: { batteryHealthMinPercent: null, batteryCycleMin: null, batteryCycleMax: null },
      knownDefects: null,
    },
    price: null,
    totalQuantity: null,
    fulfillmentExpectations: null,
    readiness: { ready: false, issues: ALL_MISSING },
    createdAt: '2026-11-07T09:00:00.000Z',
    updatedAt: '2026-11-07T09:00:00.000Z',
    ...overrides,
  });

export const readyDraft = (overrides: Partial<ListingDraft> = {}): ListingDraft =>
  emptyDraft({
    title: 'ThinkPad T14 Gen 3 — refurbished',
    description: 'Business laptop, professionally refurbished.',
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
      guarantees: { batteryHealthMinPercent: 92, batteryCycleMin: null, batteryCycleMax: 300 },
      knownDefects: 'none',
    },
    price: { amountMinor: 799_000, currency: 'SEK' },
    totalQuantity: 3,
    fulfillmentExpectations: 'Shipped from Gothenburg within 2 business days.',
    readiness: { ready: true, issues: [] },
    ...overrides,
  });

export const activeListing = (overrides: Partial<Listing> = {}): Listing =>
  listingSchema.parse({
    id: 'lst_active',
    organizationId: 'org_nordic',
    status: 'active',
    title: 'Dell Latitude 5430 — refurbished',
    description: 'Solid business laptop.',
    specifications: {
      brand: 'Dell',
      model: 'Latitude 5430',
      cpu: 'Intel Core i5-1235U',
      ramGb: 16,
      storageType: 'ssd',
      storageGb: 256,
      screenSizeInches: 14,
    },
    condition: { grade: 'B', guarantees: { batteryHealthMinPercent: 85 }, knownDefects: 'none' },
    price: { amountMinor: 649_000, currency: 'SEK' },
    totalQuantity: 4,
    reservedQuantity: 1,
    soldQuantity: 1,
    availableQuantity: 2,
    fulfillmentExpectations: 'Shipped within 3 business days.',
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-03T09:00:00.000Z',
    publishedAt: '2026-11-03T09:00:00.000Z',
    archivedAt: null,
    ...overrides,
  });
