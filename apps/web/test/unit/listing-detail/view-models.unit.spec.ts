import type { CatalogueListing, CurrentUser } from '@acme/api-contracts';
import { describe, expect, it } from 'vitest';

import { listingDetailHref } from '../../../src/features/catalogue/search-params.ts';
import {
  availabilityOf,
  backToResultsHref,
  orderActionFor,
  toListingDetailViewModel,
} from '../../../src/features/listing-detail/view-models.ts';

/**
 * The rules the buyer's listing page shows (UC-012): when a listing counts as unavailable and
 * why, who is offered the order action, and how a buyer gets back to their search. Pure logic
 * per ADR-013, so it owns these behaviors; the component suite only samples them.
 */

const listing = (overrides: Partial<CatalogueListing> = {}): CatalogueListing => ({
  id: 'lst_1',
  organizationId: 'org_1',
  status: 'active',
  title: 'ThinkPad T14 Gen 3',
  description: 'Business laptop, tested.',
  specifications: {
    brand: 'Lenovo',
    model: 'ThinkPad T14',
    cpu: 'Core i5-1245U',
    ramGb: 16,
    storageType: 'nvme',
    storageGb: 512,
    screenSizeInches: 14,
  },
  condition: {
    grade: 'B',
    guarantees: { batteryHealthMinPercent: 88 },
    knownDefects: 'Small scratch on the lid.',
  },
  price: { amountMinor: 649_000, currency: 'SEK' },
  totalQuantity: 3,
  reservedQuantity: 0,
  soldQuantity: 0,
  availableQuantity: 3,
  fulfillmentExpectations: 'Ships in 2 days.',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  publishedAt: '2026-10-01T10:00:00.000Z',
  archivedAt: null,
  seller: { organizationId: 'org_1', name: 'Nordic Refurb' },
  ...overrides,
});

const actor = (overrides: Partial<CurrentUser> = {}): CurrentUser => ({
  id: 'usr_1',
  email: 'buyer@example.com',
  displayName: 'Alice',
  isPlatformAdmin: false,
  membership: null,
  ...overrides,
});

describe('availabilityOf', () => {
  it('is available while units are left', () => {
    expect(availabilityOf(listing())).toEqual({ kind: 'available', label: 'In stock' });
  });

  it('explains that reserved units can come back (UC-012 A1)', () => {
    const view = availabilityOf(listing({ availableQuantity: 0, reservedQuantity: 3 }));

    expect(view.kind).toBe('sold-out');
    expect(view.label).toBe('Currently unavailable');
    expect(view.kind === 'sold-out' && view.explanation).toMatch(/cancelled or expire/);
  });

  it('says plainly when everything is sold', () => {
    const view = availabilityOf(
      listing({ availableQuantity: 0, reservedQuantity: 0, soldQuantity: 3 })
    );

    expect(view.kind).toBe('sold-out');
    expect(view.kind === 'sold-out' && view.explanation).toMatch(/sold/);
  });

  it('marks an archived listing as no longer sold, even with stock left (UC-012 A2)', () => {
    const view = availabilityOf(
      listing({ status: 'archived', archivedAt: '2026-11-01T10:00:00.000Z' })
    );

    expect(view).toMatchObject({ kind: 'archived', label: 'No longer sold' });
  });
});

const actionFor = (item: CatalogueListing, viewer: CurrentUser | null) =>
  orderActionFor(item, availabilityOf(item), viewer).kind;

describe('orderActionFor', () => {
  it('offers the order step to an anonymous visitor and to an ordinary buyer', () => {
    expect(actionFor(listing(), null)).toBe('ordering-soon');
    expect(actionFor(listing(), actor())).toBe('ordering-soon');
  });

  it('refuses a member of the selling organization, whatever their role (ordering spec D3)', () => {
    for (const role of ['owner', 'manager', 'viewer'] as const) {
      const viewer = actor({
        membership: {
          organizationId: 'org_1',
          organizationName: 'Nordic Refurb',
          organizationStatus: 'active',
          role,
        },
      });

      expect(actionFor(listing(), viewer)).toBe('own-organization');
    }
  });

  it('lets a member of another organization order like any buyer', () => {
    const viewer = actor({
      membership: {
        organizationId: 'org_2',
        organizationName: 'Baltic Devices',
        organizationStatus: 'active',
        role: 'owner',
      },
    });

    expect(actionFor(listing(), viewer)).toBe('ordering-soon');
  });

  it('refuses marketplace staff', () => {
    expect(actionFor(listing(), actor({ isPlatformAdmin: true }))).toBe('staff');
  });

  it('offers nothing to order when the listing is unavailable', () => {
    expect(actionFor(listing({ availableQuantity: 0, reservedQuantity: 3 }), actor())).toBe(
      'unavailable'
    );
    expect(actionFor(listing({ status: 'archived' }), actor())).toBe('unavailable');
  });
});

describe('the way back to the catalogue (UC-012 V8)', () => {
  it('carries the buyer’s refinements into the listing link and back out again', () => {
    const href = listingDetailHref('lst_1', {
      q: 'thinkpad',
      brands: ['Lenovo'],
      grade: 'B',
      sort: 'price_asc',
      page: 2,
    });

    const back = new URL(href, 'https://example.test').searchParams.get('back');
    expect(back).not.toBeNull();
    expect(backToResultsHref(back ?? undefined)).toBe(
      '/listings?q=thinkpad&brand=Lenovo&grade=B&sort=price_asc&page=2'
    );
  });

  it('links without a back parameter when the catalogue is unrefined', () => {
    expect(listingDetailHref('lst_1', { brands: [], sort: 'newest', page: 1 })).toBe(
      '/listings/lst_1'
    );
    expect(listingDetailHref('lst_1')).toBe('/listings/lst_1');
  });

  it('falls back to the plain catalogue when nothing is carried', () => {
    expect(backToResultsHref(undefined)).toBe('/listings');
    expect(backToResultsHref('')).toBe('/listings');
  });

  it('can only ever point back at the catalogue, whatever the parameter holds', () => {
    expect(backToResultsHref('../../evil?q=x')).toBe('/listings');
    expect(backToResultsHref('q=thinkpad&grade=nonsense&next=https://evil.test')).toBe(
      '/listings?q=thinkpad'
    );
  });
});

const labels = (item: CatalogueListing) =>
  toListingDetailViewModel(item).condition.rows.map((row) => row.label);

describe('toListingDetailViewModel', () => {
  it('spells the grade out and keeps the defects (UC-012 V3)', () => {
    const view = toListingDetailViewModel(listing());

    expect(view.grade).toMatchObject({ letter: 'B', name: 'Light wear' });
    expect(view.grade.definition).toMatch(/Light scratches/);
    expect(view.knownDefects).toBe('Small scratch on the lid.');
    expect(view.condition.rows).toContainEqual({
      label: 'Battery health',
      value: 'At least 88% of original capacity',
    });
  });

  it('shows whole kronor, never öre', () => {
    expect(toListingDetailViewModel(listing()).price).not.toMatch(/,\d\d/);
    expect(toListingDetailViewModel(listing()).price).toMatch(/6\s?490/);
  });

  it('includes a battery cycle guarantee only when the seller gave one', () => {
    expect(labels(listing())).not.toContain('Battery cycles');
    expect(
      labels(
        listing({
          condition: {
            grade: 'B',
            guarantees: { batteryHealthMinPercent: 88, batteryCycleMin: 100, batteryCycleMax: 300 },
            knownDefects: 'none',
          },
        })
      )
    ).toContain('Battery cycles');
  });

  it('names the seller (UC-012 V5, P1-020)', () => {
    expect(toListingDetailViewModel(listing()).sellerName).toBe('Nordic Refurb');
  });
});
