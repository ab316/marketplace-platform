import { describe, expect, it } from 'vitest';

import {
  catalogueAbsence,
  toDetailSections,
  toSellerListingRow,
} from '../../../src/features/seller-listings/view-models.ts';
import { activeListing, emptyDraft, readyDraft } from '../../msw/listing-fixtures.ts';

describe('seller listing view models (UC-010)', () => {
  it('shows an untitled draft with its missing-detail count', () => {
    const row = toSellerListingRow(emptyDraft());

    expect(row).toMatchObject({
      title: 'Untitled draft',
      untitled: true,
      subtitle: null,
      status: { label: 'Draft' },
      price: '—',
      stockOrReadiness: '15 details missing',
      ready: false,
      date: 'Created 7 Nov',
    });
  });

  it('shows a ready draft as ready to publish', () => {
    expect(toSellerListingRow(readyDraft()).stockOrReadiness).toBe('Ready to publish');
  });

  it('shows stock and the publication date for an active listing', () => {
    const row = toSellerListingRow(activeListing());

    expect(row.stockOrReadiness).toBe('2 available · 1 reserved · 1 sold (of 4)');
    expect(row.subtitle).toBe('Dell Latitude 5430');
    expect(row.date).toBe('Published 3 Nov');
    expect(row.notInCatalogue).toBe(false);
  });

  it('explains why an active listing left the catalogue', () => {
    expect(
      catalogueAbsence(
        activeListing({ availableQuantity: 0, reservedQuantity: 2, soldQuantity: 2 })
      )
    ).toMatch(/reserved by unpaid orders/);
    expect(
      catalogueAbsence(
        activeListing({ availableQuantity: 0, reservedQuantity: 0, soldQuantity: 4 })
      )
    ).toMatch(/sold out/);
    expect(catalogueAbsence(activeListing())).toBeNull();
    expect(
      toSellerListingRow(
        activeListing({ availableQuantity: 0, reservedQuantity: 0, soldQuantity: 4 })
      ).notInCatalogue
    ).toBe(true);
  });

  it('spells the grade out and marks empty draft fields as not entered', () => {
    const condition = toDetailSections(activeListing()).find((s) => s.title === 'Condition');
    expect(condition?.rows[0]).toEqual({ label: 'Grade', value: 'Grade B — Light wear' });

    const basics = toDetailSections(emptyDraft()).find((s) => s.title === 'Basics');
    expect(basics?.rows.every((row) => row.value === null)).toBe(true);
  });
});
