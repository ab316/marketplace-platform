import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { parseCatalogueSearchParams } from '../../../src/features/catalogue/search-params.ts';
import { BACKEND_URL } from '../../msw/handlers.ts';
import { server } from '../../msw/server.ts';

/**
 * The catalogue data path with the backend simulated at the HTTP boundary: the real
 * `browseCatalogue`, the real query serialization, and the real contract schema. Catalogue reads
 * are public (UC-001), so the request must carry no Authorization header even when a session
 * cookie exists — that is the behaviour under test alongside the query shape.
 */
const { browseCatalogue } = await import('../../../src/data/server/catalogue.ts');
const { ApiContractError } = await import('../../../src/data/api-error.ts');

const emptyPage = { items: [], total: 0, limit: 12, offset: 0 };

describe('browseCatalogue', () => {
  it('sends the refinements as repeated params in minor units, anonymously', async () => {
    let seen: URL | undefined;
    let authorization: string | null = 'unset';

    server.use(
      http.get(`${BACKEND_URL}/api/listings`, ({ request }) => {
        seen = new URL(request.url);
        authorization = request.headers.get('authorization');
        return HttpResponse.json(emptyPage);
      })
    );

    const { search } = parseCatalogueSearchParams({
      q: 'thinkpad',
      brand: ['Lenovo', 'Dell'],
      priceMax: '12000',
      grade: 'B',
      ramMin: '16',
      sort: 'price_asc',
      page: '2',
    });
    const page = await browseCatalogue(search);

    expect(page).toEqual(emptyPage);
    expect(authorization).toBeNull();
    expect(seen?.searchParams.getAll('brand')).toEqual(['Lenovo', 'Dell']);
    expect(seen?.searchParams.get('q')).toBe('thinkpad');
    expect(seen?.searchParams.get('priceMax')).toBe('1200000');
    expect(seen?.searchParams.get('grade')).toBe('B');
    expect(seen?.searchParams.get('ramMin')).toBe('16');
    expect(seen?.searchParams.get('sort')).toBe('price_asc');
    expect(seen?.searchParams.get('limit')).toBe('12');
    expect(seen?.searchParams.get('offset')).toBe('12');
  });

  it('rejects a response that drifts from the listing contract', async () => {
    server.use(
      http.get(`${BACKEND_URL}/api/listings`, () =>
        HttpResponse.json({ items: [{ id: 'lst_1' }], total: 1, limit: 12, offset: 0 })
      )
    );

    const { search } = parseCatalogueSearchParams({});
    await expect(browseCatalogue(search)).rejects.toBeInstanceOf(ApiContractError);
  });
});
