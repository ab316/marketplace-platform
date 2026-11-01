import { describe, expect, it } from 'vitest';

import {
  catalogueHref,
  clearAllHref,
  parseCatalogueSearchParams,
  refinementChips,
  toApiQuery,
} from '../../../src/features/catalogue/search-params.ts';

/**
 * URL ⇄ state rules for the catalogue (UC-006 B5/B6, E1): what a shared link parses to, what a
 * state serializes to, and how invalid values degrade. Pure logic per ADR-013, so it owns these
 * behaviors; the component and E2E suites only sample them.
 */
describe('parseCatalogueSearchParams', () => {
  it('parses a fully refined URL', () => {
    const { search, issues } = parseCatalogueSearchParams({
      q: 'thinkpad',
      brand: ['Lenovo', 'Dell'],
      priceMin: '3000',
      priceMax: '12000',
      grade: 'B',
      ramMin: '16',
      sort: 'price_asc',
      page: '2',
    });

    expect(issues).toEqual([]);
    expect(search).toEqual({
      q: 'thinkpad',
      brands: ['Lenovo', 'Dell'],
      priceMin: 3000,
      priceMax: 12_000,
      grade: 'B',
      ramMin: 16,
      sort: 'price_asc',
      page: 2,
    });
  });

  it('defaults to an unrefined first page, newest first', () => {
    const { search, issues } = parseCatalogueSearchParams({});
    expect(issues).toEqual([]);
    expect(search).toEqual({ brands: [], sort: 'newest', page: 1 });
  });

  it('matches brands case-insensitively against the curated list', () => {
    const { search, issues } = parseCatalogueSearchParams({ brand: 'lenovo' });
    expect(search.brands).toEqual(['Lenovo']);
    expect(issues).toEqual([]);
  });

  it('drops and reports an unknown value instead of failing the page (E1)', () => {
    const { search, issues } = parseCatalogueSearchParams({
      brand: 'Commodore',
      grade: 'D',
      ramMin: '12',
      sort: 'cheapest',
      page: '-1',
    });

    expect(search).toEqual({ brands: [], sort: 'newest', page: 1 });
    expect(issues.map((issue) => issue.param)).toEqual([
      'brand',
      'grade',
      'ramMin',
      'sort',
      'page',
    ]);
  });

  it('keeps the valid price bound when the max contradicts the min (E1)', () => {
    const { search, issues } = parseCatalogueSearchParams({ priceMin: '5000', priceMax: '100' });

    expect(search.priceMin).toBe(5000);
    expect(search.priceMax).toBeUndefined();
    expect(issues).toEqual([
      { param: 'priceMax', message: 'Max price must be at least the min price.' },
    ]);
  });
});

describe('catalogueHref', () => {
  it('omits defaults so a clean search gets a clean URL', () => {
    expect(catalogueHref({ brands: [], sort: 'newest', page: 1 })).toBe('/listings');
  });

  it('round-trips through parsing', () => {
    const original = parseCatalogueSearchParams({
      q: 'macbook',
      brand: 'Apple',
      priceMax: '15000',
      ramMin: '32',
      sort: 'price_desc',
      page: '3',
    }).search;

    const href = catalogueHref(original);
    const query = Object.fromEntries(new URL(`http://x${href}`).searchParams);
    expect(parseCatalogueSearchParams(query).search).toEqual(original);
  });
});

describe('toApiQuery', () => {
  it('converts kronor to minor units and page to limit/offset', () => {
    const { search } = parseCatalogueSearchParams({
      brand: ['Lenovo', 'Apple'],
      priceMin: '3000',
      priceMax: '12000',
      page: '2',
    });

    const params = new URLSearchParams(toApiQuery(search));
    expect(params.getAll('brand')).toEqual(['Lenovo', 'Apple']);
    expect(params.get('priceMin')).toBe('300000');
    expect(params.get('priceMax')).toBe('1200000');
    expect(params.get('sort')).toBe('newest');
    expect(params.get('limit')).toBe('12');
    expect(params.get('offset')).toBe('12');
  });
});

describe('refinementChips', () => {
  it('builds one removable chip per refinement, each dropping only itself', () => {
    const { search } = parseCatalogueSearchParams({
      q: 'thinkpad',
      brand: ['Lenovo', 'Dell'],
      priceMax: '12000',
      grade: 'B',
      ramMin: '16',
      sort: 'price_asc',
      page: '2',
    });

    const chips = refinementChips(search);
    expect(chips.map((chip) => chip.label)).toEqual([
      'Search: “thinkpad”',
      'Brand: Lenovo',
      'Brand: Dell',
      `Up to ${new Intl.NumberFormat('sv-SE').format(12_000)} kr`,
      'Condition: B or better',
      'Memory: 16 GB+',
    ]);

    // Removing one brand keeps the other refinements, drops back to page 1, keeps the sort.
    const lenovoRemoved = chips[1]?.removeHref ?? '';
    expect(lenovoRemoved).toContain('brand=Dell');
    expect(lenovoRemoved).not.toContain('brand=Lenovo');
    expect(lenovoRemoved).toContain('sort=price_asc');
    expect(lenovoRemoved).not.toContain('page=');
  });

  it('clears everything but the sort with clearAllHref', () => {
    const { search } = parseCatalogueSearchParams({ brand: 'Apple', sort: 'price_desc' });
    expect(clearAllHref(search)).toBe('/listings?sort=price_desc');
  });
});
