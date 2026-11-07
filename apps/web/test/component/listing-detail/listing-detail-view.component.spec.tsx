import type { CatalogueListing, CurrentUser } from '@acme/api-contracts';
import { render, screen, within } from '@testing-library/react';
import type { Route } from 'next';
import { describe, expect, it } from 'vitest';

import { ListingDetailView } from '../../../src/features/listing-detail/components/listing-detail-view.tsx';
import {
  availabilityOf,
  orderActionFor,
  toListingDetailViewModel,
} from '../../../src/features/listing-detail/view-models.ts';

/**
 * Every user-visible state of the buyer's listing page body (UC-012, design spec
 * `buyer-listing-detail.md`), testable in Vitest because the view is synchronous per ADR-013.
 * Not-found, loading, and the transport error are route files and belong to the E2E/manual pass.
 */

const listing = (overrides: Partial<CatalogueListing> = {}): CatalogueListing => ({
  id: 'lst_1',
  organizationId: 'org_1',
  status: 'active',
  title: 'ThinkPad T14 Gen 3',
  description: 'Business laptop, fully tested.\nNew keyboard fitted.',
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
  fulfillmentExpectations: 'Dispatched within 2 business days from Gothenburg.',
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  publishedAt: '2026-10-01T10:00:00.000Z',
  archivedAt: null,
  seller: { organizationId: 'org_1', name: 'Nordic Refurb' },
  ...overrides,
});

const renderPage = (
  item: CatalogueListing = listing(),
  actor: CurrentUser | null = null,
  back: { href: Route; label: string } = { href: '/listings', label: 'Browse all laptops' }
) =>
  render(
    <ListingDetailView
      listing={toListingDetailViewModel(item)}
      orderAction={orderActionFor(item, availabilityOf(item), actor)}
      backHref={back.href}
      backLabel={back.label}
    />
  );

const buyer: CurrentUser = {
  id: 'usr_1',
  email: 'buyer@example.com',
  displayName: 'Alice',
  isPlatformAdmin: false,
  membership: null,
};

describe('ListingDetailView — an orderable listing', () => {
  it('shows every disclosure a buyer needs to decide (UC-012 V2–V4)', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'ThinkPad T14 Gen 3' })).toBeVisible();
    expect(screen.getByText('Lenovo ThinkPad T14')).toBeVisible();

    const specification = screen.getByRole('region', { name: 'Specification' });
    expect(within(specification).getByText('Core i5-1245U')).toBeVisible();
    expect(within(specification).getByText('16 GB')).toBeVisible();
    expect(within(specification).getByText('512 GB NVMe')).toBeVisible();
    expect(within(specification).getByText('14"')).toBeVisible();

    expect(screen.getByText('Dispatched within 2 business days from Gothenburg.')).toBeVisible();
    expect(screen.getByText(/Business laptop, fully tested/)).toBeVisible();
  });

  it('spells the grade out in words and keeps the defects in their own block (UC-012 V3)', () => {
    renderPage();

    expect(screen.getByText('Grade B · Light wear')).toBeVisible();
    expect(screen.getByText(/Light scratches or scuffs/)).toBeVisible();
    expect(screen.getByText(/cosmetic condition only/)).toBeVisible();

    const defects = screen.getByRole('heading', { level: 3, name: 'Known defects' });
    expect(defects).toBeVisible();
    expect(screen.getByText('Small scratch on the lid.')).toBeVisible();
  });

  it('names the seller and shows the price in whole kronor (UC-012 V5, P1-020)', () => {
    renderPage();

    const seller = screen.getByRole('region', { name: 'Sold by' });
    expect(within(seller).getByText('Nordic Refurb')).toBeVisible();
    expect(screen.getByText(/6\s?490\s?kr/)).toBeVisible();
    expect(screen.getByText('In stock')).toBeVisible();
  });

  it('states that ordering holds a unit and moves no money yet', () => {
    renderPage();

    expect(screen.getByText(/holds one unit for 24 hours/i)).toBeVisible();
    expect(screen.getByText(/No money moves until you pay/i)).toBeVisible();
  });

  it('offers the order step without pretending it works yet', () => {
    renderPage(listing(), buyer);

    expect(screen.getByRole('button', { name: 'Order this laptop' })).toBeDisabled();
    expect(screen.getByText(/opens with the next release/i)).toBeVisible();
  });

  it('takes the buyer back to the search they arrived from (UC-012 V8)', () => {
    renderPage(listing(), null, {
      href: '/listings?q=thinkpad&grade=B',
      label: 'Back to results',
    });

    expect(screen.getByRole('link', { name: 'Back to results' })).toHaveAttribute(
      'href',
      '/listings?q=thinkpad&grade=B'
    );
  });
});

describe('ListingDetailView — a listing that cannot be ordered (UC-012 A1, A2)', () => {
  it('reads in full when it is sold out, and says units may come back', () => {
    renderPage(listing({ availableQuantity: 0, reservedQuantity: 3 }));

    expect(screen.getByRole('heading', { level: 1, name: 'ThinkPad T14 Gen 3' })).toBeVisible();
    expect(screen.getByText('Currently unavailable')).toBeVisible();
    expect(screen.getByText(/cancelled or expire/)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Order this laptop' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse other laptops' })).toBeVisible();
  });

  it('reads in full when it is archived, so old links still show what was promised', () => {
    renderPage(listing({ status: 'archived', archivedAt: '2026-11-01T10:00:00.000Z' }));

    expect(screen.getByText('No longer sold')).toBeVisible();
    expect(screen.getByText('Small scratch on the lid.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Order this laptop' })).not.toBeInTheDocument();
  });
});

describe('ListingDetailView — viewers who may not order (UC-012 A4)', () => {
  it('tells a member of the selling organization why, and links to their own listing', () => {
    renderPage(listing(), {
      ...buyer,
      membership: {
        organizationId: 'org_1',
        organizationName: 'Nordic Refurb',
        organizationStatus: 'active',
        role: 'manager',
      },
    });

    expect(screen.getByText(/your organization’s listing/i)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Manage this listing' })).toHaveAttribute(
      'href',
      '/seller/listings/lst_1'
    );
    expect(screen.queryByRole('button', { name: 'Order this laptop' })).not.toBeInTheDocument();
  });

  it('tells marketplace staff that they do not place orders', () => {
    renderPage(listing(), { ...buyer, isPlatformAdmin: true });

    expect(screen.getByText(/staff do not place orders/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Order this laptop' })).not.toBeInTheDocument();
  });
});
