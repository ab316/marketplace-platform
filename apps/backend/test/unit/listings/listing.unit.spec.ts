import { Money } from '@acme/core-domain';
import { describe, expect, it } from 'vitest';

import {
  InvalidListingDataError,
  ListingIncompleteError,
  ListingStateError,
  ListingUnavailableError,
} from '../../../src/modules/listings/domain/errors.ts';
import {
  type CreateListingDraftInput,
  Listing,
} from '../../../src/modules/listings/domain/listing.ts';

const NOW = new Date('2026-10-24T09:00:00.000Z');
const LATER = new Date('2026-10-24T10:00:00.000Z');

const draftInput = (overrides: Partial<CreateListingDraftInput> = {}): CreateListingDraftInput => ({
  id: 'lst_1',
  organizationId: 'org_nordic_refurb',
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
    guarantees: { batteryHealthMinPercent: 92, batteryCycleMin: 100, batteryCycleMax: 300 },
    knownDefects: 'none',
  },
  price: Money.fromMinor(799_000),
  totalQuantity: 3,
  fulfillmentExpectations: 'Dispatched within 2 business days.',
  now: NOW,
  ...overrides,
});

const activeListing = (overrides: Partial<CreateListingDraftInput> = {}): Listing => {
  const listing = Listing.createDraft(draftInput(overrides));
  listing.publish(NOW);
  return listing;
};

describe('Listing creation', () => {
  it('starts as an unpublished draft with no stock reserved', () => {
    const listing = Listing.createDraft(draftInput());

    expect(listing.status).toBe('draft');
    expect(listing.availableQuantity).toBe(3);
    expect(listing.state.publishedAt).toBeNull();
    expect(listing.isOrderable).toBe(false);
  });

  it('rejects a price of zero', () => {
    expect(() => Listing.createDraft(draftInput({ price: Money.fromMinor(0) }))).toThrow(
      InvalidListingDataError
    );
  });

  it('rejects stock below one unit', () => {
    expect(() => Listing.createDraft(draftInput({ totalQuantity: 0 }))).toThrow(
      InvalidListingDataError
    );
  });

  it('requires known defects to be disclosed, even when there are none', () => {
    const condition = {
      grade: 'A' as const,
      guarantees: { batteryHealthMinPercent: 92 },
      knownDefects: '   ',
    };

    expect(() => Listing.createDraft(draftInput({ condition }))).toThrow(InvalidListingDataError);
  });

  it('rejects an inverted battery cycle guarantee', () => {
    const condition = {
      grade: 'B' as const,
      guarantees: { batteryHealthMinPercent: 85, batteryCycleMin: 400, batteryCycleMax: 100 },
      knownDefects: 'Light scratches on the lid.',
    };

    expect(() => Listing.createDraft(draftInput({ condition }))).toThrow(InvalidListingDataError);
  });

  it('rejects a battery health guarantee outside 1–100', () => {
    const condition = {
      grade: 'A' as const,
      guarantees: { batteryHealthMinPercent: 120 },
      knownDefects: 'none',
    };

    expect(() => Listing.createDraft(draftInput({ condition }))).toThrow(InvalidListingDataError);
  });
});

describe('Listing lifecycle', () => {
  it('becomes orderable once published', () => {
    const listing = activeListing();

    expect(listing.status).toBe('active');
    expect(listing.state.publishedAt).toEqual(NOW);
    expect(listing.isOrderable).toBe(true);
  });

  it('cannot be published twice', () => {
    const listing = activeListing();

    expect(() => listing.publish(LATER)).toThrow(ListingStateError);
  });

  it('can be archived once active, and not again', () => {
    const listing = activeListing();

    listing.archive(LATER);

    expect(listing.status).toBe('archived');
    expect(listing.state.archivedAt).toEqual(LATER);
    expect(() => listing.archive(LATER)).toThrow(ListingStateError);
  });

  it('cannot archive a draft that was never published', () => {
    const listing = Listing.createDraft(draftInput());

    expect(() => listing.archive(LATER)).toThrow(ListingStateError);
  });

  it('only allows editing while it is a draft', () => {
    const draft = Listing.createDraft(draftInput());
    draft.revise({ ...draft.state, title: 'Updated title' }, LATER);
    expect(draft.state.title).toBe('Updated title');
    expect(draft.state.updatedAt).toEqual(LATER);

    draft.publish(LATER);
    expect(() => draft.revise({ ...draft.state, title: 'Too late' }, LATER)).toThrow(
      ListingStateError
    );
  });
});

describe('Listing stock', () => {
  it('reserves and releases one unit at a time', () => {
    const listing = activeListing({ totalQuantity: 2 });

    listing.reserveUnit(NOW);
    expect(listing.availableQuantity).toBe(1);

    listing.reserveUnit(NOW);
    expect(listing.availableQuantity).toBe(0);
    expect(listing.isOrderable).toBe(false);

    listing.releaseUnit(LATER);
    expect(listing.availableQuantity).toBe(1);
  });

  it('never oversells: reserving past the last unit is rejected', () => {
    const listing = activeListing({ totalQuantity: 1 });
    listing.reserveUnit(NOW);

    expect(() => listing.reserveUnit(NOW)).toThrow(ListingUnavailableError);
    expect(listing.state.reservedQuantity).toBe(1);
  });

  it('refuses to reserve from a draft or archived listing', () => {
    const draft = Listing.createDraft(draftInput());
    expect(() => draft.reserveUnit(NOW)).toThrow(ListingUnavailableError);

    const archived = activeListing();
    archived.archive(LATER);
    expect(() => archived.reserveUnit(LATER)).toThrow(ListingUnavailableError);
  });

  it('still releases a unit after the listing is archived, so cancelling frees stock', () => {
    const listing = activeListing();
    listing.reserveUnit(NOW);
    listing.archive(LATER);

    listing.releaseUnit(LATER);

    expect(listing.state.reservedQuantity).toBe(0);
  });

  it('never releases more units than are reserved', () => {
    const listing = activeListing();

    expect(() => listing.releaseUnit(NOW)).toThrow(ListingStateError);
  });
});

describe('Selling a reserved unit (UC-004 P5)', () => {
  it('moves one unit from reserved to sold without changing availability', () => {
    const listing = Listing.createDraft(draftInput({ totalQuantity: 3 }));
    listing.publish(NOW);
    listing.reserveUnit(NOW);
    listing.reserveUnit(NOW);

    listing.markReservedUnitSold(NOW);

    expect(listing.state.reservedQuantity).toBe(1);
    expect(listing.state.soldQuantity).toBe(1);
    expect(listing.availableQuantity).toBe(1);
  });

  it('refuses when nothing is reserved', () => {
    const listing = Listing.createDraft(draftInput({ totalQuantity: 1 }));
    listing.publish(NOW);

    expect(() => listing.markReservedUnitSold(NOW)).toThrow(ListingStateError);
  });

  it('works on an archived listing, so a paid order still closes its sale', () => {
    const listing = Listing.createDraft(draftInput({ totalQuantity: 1 }));
    listing.publish(NOW);
    listing.reserveUnit(NOW);
    listing.archive(NOW);

    listing.markReservedUnitSold(NOW);

    expect(listing.state.soldQuantity).toBe(1);
    expect(listing.availableQuantity).toBe(0);
  });

  it('a sold unit never comes back: releasing afterwards has nothing to release', () => {
    const listing = Listing.createDraft(draftInput({ totalQuantity: 1 }));
    listing.publish(NOW);
    listing.reserveUnit(NOW);
    listing.markReservedUnitSold(NOW);

    expect(() => listing.releaseUnit(NOW)).toThrow(ListingStateError);
    expect(listing.isOrderable).toBe(false);
  });
});

const emptyDraft = (): Listing =>
  Listing.createDraft({
    id: 'lst_empty',
    organizationId: 'org_nordic_refurb',
    specifications: {},
    condition: { guarantees: {} },
    now: NOW,
  });

/** Runs `act` and returns the error it throws, failing unless it is of the given type. */
const thrownBy = <E>(act: () => void, type: new (...args: never[]) => E): E => {
  try {
    act();
  } catch (error) {
    if (error instanceof type) {
      return error;
    }
    throw error;
  }
  throw new Error(`Expected ${type.name} to be thrown.`);
};

describe('Incomplete drafts (P1-012; UC-005, UC-007, UC-008)', () => {
  const ALL_REQUIRED = [
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
  ];

  it('saves a draft with nothing entered, holding no stock', () => {
    const draft = emptyDraft();

    expect(draft.status).toBe('draft');
    expect(draft.availableQuantity).toBe(0);
    expect(draft.isOrderable).toBe(false);
    expect(draft.readiness()).toEqual({
      ready: false,
      issues: ALL_REQUIRED.map((path) => ({ path, message: 'Required to publish.' })),
    });
  });

  it('names only the fields still missing from a partial draft', () => {
    const draft = Listing.createDraft({
      ...draftInput(),
      description: undefined,
      price: undefined,
      condition: { guarantees: {}, grade: 'B' },
    });

    expect(draft.readiness().issues.map((issue) => issue.path)).toEqual([
      'description',
      'condition.guarantees.batteryHealthMinPercent',
      'condition.knownDefects',
      'priceMinor',
    ]);
  });

  it('reports a complete draft as ready, and the battery cycle range stays optional', () => {
    const draft = Listing.createDraft(
      draftInput({
        condition: {
          grade: 'A',
          guarantees: { batteryHealthMinPercent: 90 },
          knownDefects: 'none',
        },
      })
    );

    expect(draft.readiness()).toEqual({ ready: true, issues: [] });
    draft.publish(LATER);
    expect(draft.status).toBe('active');
  });

  it('still rejects a malformed value in an incomplete draft, naming the field', () => {
    const error = thrownBy(
      () =>
        Listing.createDraft({
          id: 'lst_bad',
          organizationId: 'org_nordic_refurb',
          specifications: {},
          condition: { guarantees: { batteryHealthMinPercent: 0 } },
          price: Money.fromMinor(0),
          now: NOW,
        }),
      InvalidListingDataError
    );

    expect(error.details).toEqual({
      issues: [
        { path: 'priceMinor', message: 'Price must be greater than zero.' },
        {
          path: 'condition.guarantees.batteryHealthMinPercent',
          message: 'Guaranteed battery health must be between 1 and 100.',
        },
      ],
    });
  });

  it('refuses to publish an incomplete draft, reporting every gap at once', () => {
    const draft = Listing.createDraft({
      ...draftInput(),
      title: undefined,
      totalQuantity: undefined,
    });

    const error = thrownBy(() => draft.publish(LATER), ListingIncompleteError);

    expect(error.details).toMatchObject({
      issues: [
        { path: 'title', message: 'Required to publish.' },
        { path: 'quantityTotal', message: 'Required to publish.' },
      ],
    });
    expect(draft.status).toBe('draft');
    expect(draft.state.publishedAt).toBeNull();
  });

  it('can clear a field again, and the draft is no longer ready', () => {
    const draft = Listing.createDraft(draftInput());
    expect(draft.readiness().ready).toBe(true);

    draft.revise({ ...draft.state, fulfillmentExpectations: undefined }, LATER);

    expect(draft.state.fulfillmentExpectations).toBeUndefined();
    expect(draft.readiness()).toEqual({
      ready: false,
      issues: [{ path: 'fulfillmentExpectations', message: 'Required to publish.' }],
    });
  });

  it('rejects a malformed revision and leaves the draft unchanged', () => {
    const draft = Listing.createDraft(draftInput());

    expect(() => draft.revise({ ...draft.state, totalQuantity: 0 }, LATER)).toThrow(
      InvalidListingDataError
    );
    expect(draft.state.totalQuantity).toBe(3);
    expect(draft.state.updatedAt).toEqual(NOW);
  });

  it('treats a published listing as always ready', () => {
    expect(activeListing().readiness()).toEqual({ ready: true, issues: [] });
  });
});

describe('Brand from the curated list (P1-017)', () => {
  it('lets a draft hold a pre-list brand but refuses to publish it', () => {
    const draft = Listing.createDraft(
      draftInput({
        specifications: { ...draftInput().specifications, brand: 'lenovo' },
      })
    );

    expect(draft.readiness()).toEqual({
      ready: false,
      issues: [
        {
          path: 'specifications.brand',
          message: 'Choose a brand from the marketplace list.',
        },
      ],
    });
    const error = thrownBy(() => draft.publish(LATER), ListingIncompleteError);
    expect(error.details).toMatchObject({ issues: [{ path: 'specifications.brand' }] });
    expect(draft.status).toBe('draft');
  });
});
