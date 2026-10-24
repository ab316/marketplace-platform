import { describe, expect, it } from 'vitest';

import {
  InvalidListingStateError,
  ListingNotPublishableError,
  NoAvailableStockError,
} from '../../../src/modules/listings/domain/errors.ts';
import { Listing, type ListingFields } from '../../../src/modules/listings/domain/listing.ts';

const now = new Date('2026-10-24T10:00:00Z');

const completeFields: ListingFields = {
  title: 'Lenovo ThinkPad T14 Gen 3',
  description: 'Refurbished business laptop',
  brand: 'Lenovo',
  model: 'ThinkPad T14 Gen 3',
  cpu: 'Ryzen 5 PRO 6650U',
  ram: '16 GB',
  storage: '512 GB NVMe SSD',
  screenSize: '14"',
  conditionGrade: 'A',
  conditionGuarantees: { batteryHealthMinPercent: 90, batteryCycleCountMax: 300 },
  knownDefects: 'none',
  priceOre: 549_900,
  quantity: 3,
  fulfillmentExpectations: 'Ships within 2 business days',
};

function draft(fields: ListingFields = completeFields): Listing {
  return Listing.createDraft({ id: 'listing-1', organizationId: 'org-1', fields, now });
}

describe('Listing', () => {
  it('creates a draft that is not orderable', () => {
    const listing = draft();
    expect(listing.props.status).toBe('draft');
    expect(listing.props.quantityAvailable).toBe(0);
  });

  it('publishes a complete draft and opens its full quantity for orders', () => {
    const listing = draft();
    listing.publish(now);
    expect(listing.props.status).toBe('active');
    expect(listing.props.quantityAvailable).toBe(3);
  });

  it('rejects publishing when required disclosures are missing', () => {
    const { knownDefects: _k, priceOre: _p, ...incomplete } = completeFields;
    const listing = draft(incomplete);
    let caught: unknown;
    try {
      listing.publish(now);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ListingNotPublishableError);
    const missingFields = caught instanceof ListingNotPublishableError ? caught.missingFields : [];
    expect(missingFields).toEqual(expect.arrayContaining(['knownDefects', 'priceOre']));
    expect(listing.props.status).toBe('draft');
  });

  it('rejects publishing with quantity below 1 or non-positive price', () => {
    expect(() => draft({ ...completeFields, quantity: 0 }).publish(now)).toThrow(
      ListingNotPublishableError
    );
    expect(() => draft({ ...completeFields, priceOre: 0 }).publish(now)).toThrow(
      ListingNotPublishableError
    );
  });

  it('only allows editing drafts', () => {
    const listing = draft();
    listing.publish(now);
    expect(() => listing.updateDraft({ title: 'New title' }, now)).toThrow(
      InvalidListingStateError
    );
  });

  it('only archives active listings, and archived listings reject new reservations', () => {
    const listing = draft();
    expect(() => listing.archive(now)).toThrow(InvalidListingStateError);
    listing.publish(now);
    listing.archive(now);
    expect(listing.props.status).toBe('archived');
    expect(() => listing.reserveUnit(now)).toThrow(InvalidListingStateError);
  });

  it('reserves units until stock runs out, never going negative', () => {
    const listing = draft({ ...completeFields, quantity: 2 });
    listing.publish(now);
    listing.reserveUnit(now);
    listing.reserveUnit(now);
    expect(listing.props.quantityAvailable).toBe(0);
    expect(() => listing.reserveUnit(now)).toThrow(NoAvailableStockError);
  });

  it('releases reserved units back to stock, bounded by total quantity', () => {
    const listing = draft({ ...completeFields, quantity: 1 });
    listing.publish(now);
    listing.reserveUnit(now);
    listing.releaseUnit(now);
    expect(listing.props.quantityAvailable).toBe(1);
    expect(() => listing.releaseUnit(now)).toThrow(InvalidListingStateError);
  });

  it('keeps reservations countable on archived listings (release still works)', () => {
    const listing = draft({ ...completeFields, quantity: 2 });
    listing.publish(now);
    listing.reserveUnit(now);
    listing.archive(now);
    listing.releaseUnit(now);
    expect(listing.props.quantityAvailable).toBe(2);
  });
});
