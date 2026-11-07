import {
  CATALOGUE_BRANDS,
  CATALOGUE_RAM_MINIMUMS,
  type CatalogueBrand,
  type CatalogueSort,
  type ConditionGrade,
} from '@acme/api-contracts';
import type { Route } from 'next';

/**
 * URL ⇄ refinement state for the catalogue page (UC-006 B6): the query string is the single
 * source of truth, so every parse/build rule lives in this one pure module where it unit-tests
 * without a page around it (ADR-013).
 *
 * Parsing is deliberately lenient where the backend is strict: a shared or hand-edited link with
 * a bad value must render a usable catalogue with the offending refinement dropped and reported
 * (design spec "validation error" state), not a 400 page. Prices travel in whole SEK (kronor) in
 * the page URL — what a buyer types — and are converted to minor units at the API boundary.
 */

export const PAGE_SIZE = 12;

/** The filter form's id; controls elsewhere in the layout join it via the `form` attribute. */
export const FILTERS_FORM_ID = 'catalogue-filters';

export interface CatalogueSearch {
  readonly q?: string;
  readonly brands: readonly CatalogueBrand[];
  /** Whole SEK (kronor), as typed by the buyer. */
  readonly priceMin?: number;
  readonly priceMax?: number;
  readonly grade?: ConditionGrade;
  readonly ramMin?: (typeof CATALOGUE_RAM_MINIMUMS)[number];
  readonly sort: CatalogueSort;
  readonly page: number;
}

/** A refinement the URL carried but the page could not honour, reported next to its control. */
export interface SearchIssue {
  readonly param: 'q' | 'brand' | 'priceMin' | 'priceMax' | 'grade' | 'ramMin' | 'sort' | 'page';
  readonly message: string;
}

export interface ParsedCatalogueSearch {
  readonly search: CatalogueSearch;
  readonly issues: readonly SearchIssue[];
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const many = (value: string | string[] | undefined): readonly string[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const SORTS: readonly CatalogueSort[] = ['newest', 'price_asc', 'price_desc'];
const GRADES: readonly ConditionGrade[] = ['A', 'B', 'C'];

const parseWholeSek = (raw: string | undefined): number | 'invalid' | undefined => {
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }
  const value = Number(raw.replaceAll(/[\s_]/g, ''));
  return Number.isInteger(value) && value >= 0 ? value : 'invalid';
};

export const parseCatalogueSearchParams = (params: RawSearchParams): ParsedCatalogueSearch => {
  const issues: SearchIssue[] = [];

  const qRaw = first(params['q'])?.trim();
  const q = qRaw === undefined || qRaw === '' ? undefined : qRaw.slice(0, 140);

  const brands: CatalogueBrand[] = [];
  for (const raw of many(params['brand'])) {
    if (raw === '') {
      continue;
    }
    const match = CATALOGUE_BRANDS.find((brand) => brand.toLowerCase() === raw.toLowerCase());
    if (match === undefined) {
      issues.push({ param: 'brand', message: `"${raw}" is not a brand we list.` });
    } else if (!brands.includes(match)) {
      brands.push(match);
    }
  }

  let priceMin = parseWholeSek(first(params['priceMin']));
  if (priceMin === 'invalid') {
    issues.push({ param: 'priceMin', message: 'Min price must be a whole number of kronor.' });
    priceMin = undefined;
  }
  let priceMax = parseWholeSek(first(params['priceMax']));
  if (priceMax === 'invalid') {
    issues.push({ param: 'priceMax', message: 'Max price must be a whole number of kronor.' });
    priceMax = undefined;
  }
  if (priceMin !== undefined && priceMax !== undefined && priceMax < priceMin) {
    // The valid bound stays applied; only the contradictory one is dropped (UC-006 E1).
    issues.push({ param: 'priceMax', message: 'Max price must be at least the min price.' });
    priceMax = undefined;
  }

  const gradeRaw = first(params['grade']);
  let grade: ConditionGrade | undefined;
  if (gradeRaw !== undefined && gradeRaw !== '') {
    const match = GRADES.find((candidate) => candidate === gradeRaw.toUpperCase());
    if (match === undefined) {
      issues.push({ param: 'grade', message: `"${gradeRaw}" is not a condition grade.` });
    } else {
      grade = match;
    }
  }

  const ramRaw = first(params['ramMin']);
  let ramMin: (typeof CATALOGUE_RAM_MINIMUMS)[number] | undefined;
  if (ramRaw !== undefined && ramRaw !== '') {
    const match = CATALOGUE_RAM_MINIMUMS.find((candidate) => String(candidate) === ramRaw);
    if (match === undefined) {
      issues.push({ param: 'ramMin', message: `"${ramRaw}" is not a memory option.` });
    } else {
      ramMin = match;
    }
  }

  const sortRaw = first(params['sort']);
  let sort: CatalogueSort = 'newest';
  if (sortRaw !== undefined && sortRaw !== '') {
    const match = SORTS.find((candidate) => candidate === sortRaw);
    if (match === undefined) {
      issues.push({ param: 'sort', message: `"${sortRaw}" is not a sort order.` });
    } else {
      sort = match;
    }
  }

  const pageRaw = first(params['page']);
  let page = 1;
  if (pageRaw !== undefined && pageRaw !== '') {
    const value = Number(pageRaw);
    if (Number.isInteger(value) && value >= 1) {
      page = value;
    } else {
      issues.push({ param: 'page', message: 'Page must be a positive number.' });
    }
  }

  return {
    search: {
      ...(q === undefined ? {} : { q }),
      brands,
      ...(priceMin === undefined ? {} : { priceMin }),
      ...(priceMax === undefined ? {} : { priceMax }),
      ...(grade === undefined ? {} : { grade }),
      ...(ramMin === undefined ? {} : { ramMin }),
      sort,
      page,
    },
    issues,
  };
};

/** The page's own URL for a given state; omits defaults so clean searches get clean links. */
/**
 * A catalogue result's link to its listing page (UC-012; issue #15). The buyer's current search
 * travels along as an opaque query string so the listing page can offer the way back to exactly
 * these results (UC-012 V8); it is re-parsed there, never trusted as a URL.
 */
export const listingDetailHref = (listingId: string, search?: CatalogueSearch): Route => {
  const path = `/listings/${encodeURIComponent(listingId)}` as Route;
  if (search === undefined) {
    return path;
  }

  const back = catalogueHref(search).split('?')[1];
  return back === undefined ? path : `${path}?back=${encodeURIComponent(back)}`;
};

export const catalogueHref = (search: CatalogueSearch): Route => {
  const params = new URLSearchParams();
  if (search.q !== undefined) {
    params.set('q', search.q);
  }
  for (const brand of search.brands) {
    params.append('brand', brand);
  }
  if (search.priceMin !== undefined) {
    params.set('priceMin', String(search.priceMin));
  }
  if (search.priceMax !== undefined) {
    params.set('priceMax', String(search.priceMax));
  }
  if (search.grade !== undefined) {
    params.set('grade', search.grade);
  }
  if (search.ramMin !== undefined) {
    params.set('ramMin', String(search.ramMin));
  }
  if (search.sort !== 'newest') {
    params.set('sort', search.sort);
  }
  if (search.page !== 1) {
    params.set('page', String(search.page));
  }
  const queryString = params.toString();
  // The cast is safe: `/listings` is a real route and typedRoutes accepts appended queries.
  return queryString === '' ? '/listings' : (`/listings?${queryString}` as Route);
};

/** Query string for `GET /api/listings`: prices in minor units, page as limit/offset. */
export const toApiQuery = (search: CatalogueSearch): string => {
  const params = new URLSearchParams();
  if (search.q !== undefined) {
    params.set('q', search.q);
  }
  for (const brand of search.brands) {
    params.append('brand', brand);
  }
  if (search.priceMin !== undefined) {
    params.set('priceMin', String(search.priceMin * 100));
  }
  if (search.priceMax !== undefined) {
    params.set('priceMax', String(search.priceMax * 100));
  }
  if (search.grade !== undefined) {
    params.set('grade', search.grade);
  }
  if (search.ramMin !== undefined) {
    params.set('ramMin', String(search.ramMin));
  }
  params.set('sort', search.sort);
  params.set('limit', String(PAGE_SIZE));
  params.set('offset', String((search.page - 1) * PAGE_SIZE));
  return params.toString();
};

export interface RefinementChip {
  readonly label: string;
  /** The same search without this refinement (and back on page 1). */
  readonly removeHref: Route;
  readonly removeLabel: string;
}

const formatSekShort = (kronor: number): string =>
  `${new Intl.NumberFormat('sv-SE').format(kronor)} kr`;

/** One removable chip per active refinement, mirroring the URL exactly (UC-006 B5). */
export const refinementChips = (search: CatalogueSearch): readonly RefinementChip[] => {
  const withoutKey = (key: 'q' | 'priceMin' | 'priceMax' | 'grade' | 'ramMin'): Route => {
    const next: { -readonly [K in keyof CatalogueSearch]?: CatalogueSearch[K] } = {
      ...search,
      page: 1,
    };
    delete next[key];
    return catalogueHref({ ...next, brands: search.brands, sort: search.sort, page: 1 });
  };
  const withoutBrand = (brand: CatalogueBrand): Route =>
    catalogueHref({ ...search, brands: search.brands.filter((other) => other !== brand), page: 1 });

  const chips: RefinementChip[] = [];
  if (search.q !== undefined) {
    chips.push({
      label: `Search: “${search.q}”`,
      removeHref: withoutKey('q'),
      removeLabel: `Remove filter: search ${search.q}`,
    });
  }
  for (const brand of search.brands) {
    chips.push({
      label: `Brand: ${brand}`,
      removeHref: withoutBrand(brand),
      removeLabel: `Remove filter: brand ${brand}`,
    });
  }
  if (search.priceMin !== undefined) {
    chips.push({
      label: `From ${formatSekShort(search.priceMin)}`,
      removeHref: withoutKey('priceMin'),
      removeLabel: 'Remove filter: min price',
    });
  }
  if (search.priceMax !== undefined) {
    chips.push({
      label: `Up to ${formatSekShort(search.priceMax)}`,
      removeHref: withoutKey('priceMax'),
      removeLabel: 'Remove filter: max price',
    });
  }
  if (search.grade !== undefined) {
    chips.push({
      label: search.grade === 'A' ? 'Condition: A' : `Condition: ${search.grade} or better`,
      removeHref: withoutKey('grade'),
      removeLabel: 'Remove filter: condition',
    });
  }
  if (search.ramMin !== undefined) {
    chips.push({
      label: `Memory: ${search.ramMin} GB+`,
      removeHref: withoutKey('ramMin'),
      removeLabel: 'Remove filter: memory',
    });
  }
  return chips;
};

/** Everything cleared, sort kept: sorting is a reading preference, not a refinement. */
export const clearAllHref = (search: CatalogueSearch): Route =>
  catalogueHref({ brands: [], sort: search.sort, page: 1 });

export const hasRefinements = (search: CatalogueSearch): boolean =>
  refinementChips(search).length > 0;
