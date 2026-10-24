import { Money } from '@acme/core-domain';
import { describe, expect, it } from 'vitest';

import {
  InvalidListingDataError,
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
    draft.update({ title: 'Updated title' }, LATER);
    expect(draft.state.title).toBe('Updated title');

    draft.publish(LATER);
    expect(() => draft.update({ title: 'Too late' }, LATER)).toThrow(ListingStateError);
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

  it('refuses to shrink total stock below what is already reserved', () => {
    const listing = Listing.createDraft(draftInput({ totalQuantity: 2 }));
    listing.publish(NOW);
    listing.reserveUnit(NOW);

    const restored = Listing.restore({ ...listing.state, status: 'draft' });

    expect(() => restored.update({ totalQuantity: 0 }, LATER)).toThrow(InvalidListingDataError);
  });
});
