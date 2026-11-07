import type {
  ListingPage,
  ListingRepository,
  ListingSearchCriteria,
  OrganizationListingCriteria,
} from '../../application/ports.ts';
import { ListingConcurrencyError } from '../../domain/errors.ts';
import { Listing, type ListingState, type PublishedListingState } from '../../domain/listing.ts';

/** Mirrors `ORDER BY <time> DESC, id DESC` in the Postgres repository. */
const byTimeThenIdDescending =
  (timeOf: (state: ListingState) => number) =>
  (left: ListingState, right: ListingState): number => {
    const timeDifference = timeOf(right) - timeOf(left);
    if (timeDifference !== 0) {
      return timeDifference;
    }
    if (left.id === right.id) {
      return 0;
    }
    return left.id < right.id ? 1 : -1;
  };

/**
 * Process-local store used by the `memory` persistence mode and by tests, so the API can be
 * exercised without a database. It reproduces the optimistic-locking guard of the Postgres
 * repository; it does not reproduce SQL semantics.
 */
export class InMemoryListingRepository implements ListingRepository {
  readonly #rows = new Map<string, ListingState>();

  findById(listingId: string): Promise<Listing | null> {
    const state = this.#rows.get(listingId);
    return Promise.resolve(state === undefined ? null : Listing.restore(state));
  }

  insert(listing: Listing): Promise<void> {
    this.#rows.set(listing.id, listing.state);
    return Promise.resolve();
  }

  save(listing: Listing): Promise<void> {
    const stored = this.#rows.get(listing.id);
    if (stored === undefined || stored.version !== listing.version) {
      return Promise.reject(new ListingConcurrencyError(listing.id));
    }

    this.#rows.set(listing.id, { ...listing.state, version: listing.version + 1 });
    return Promise.resolve();
  }

  searchActive(criteria: ListingSearchCriteria): Promise<ListingPage> {
    const keyword = criteria.keyword?.toLowerCase();
    const brands = new Set((criteria.brands ?? []).map((brand) => brand.toLowerCase()));
    const excluded = new Set(criteria.excludedOrganizationIds ?? []);

    const matched = [...this.#rows.values()]
      .filter((state): state is PublishedListingState => state.status === 'active')
      // Only orderable listings appear in the catalogue (UC-006 Q1).
      .filter((state) => state.totalQuantity - state.reservedQuantity - state.soldQuantity >= 1)
      .filter((state) => !excluded.has(state.organizationId))
      .filter((state) => {
        if (keyword === undefined) {
          return true;
        }
        return [
          state.title,
          state.description,
          state.specifications.brand,
          state.specifications.model,
        ].some((field) => field.toLowerCase().includes(keyword));
      })
      // Brands match case-insensitively against the free-text brand (UC-006 Q2).
      .filter((state) => brands.size === 0 || brands.has(state.specifications.brand.toLowerCase()))
      .filter(
        (state) =>
          criteria.priceMinMinor === undefined || state.price.amountMinor >= criteria.priceMinMinor
      )
      .filter(
        (state) =>
          criteria.priceMaxMinor === undefined || state.price.amountMinor <= criteria.priceMaxMinor
      )
      // A minimum grade includes better grades: letters order best-first alphabetically.
      .filter(
        (state) =>
          criteria.minimumGrade === undefined || state.condition.grade <= criteria.minimumGrade
      )
      .filter(
        (state) =>
          criteria.minimumRamGb === undefined || state.specifications.ramGb >= criteria.minimumRamGb
      )
      .toSorted(this.#catalogueOrder(criteria.sort ?? 'newest'));

    return Promise.resolve(this.#page(matched, criteria.limit, criteria.offset));
  }

  /** Mirrors the Postgres repository's ordering, including the id tiebreak (UC-006 B7). */
  #catalogueOrder(sort: 'newest' | 'price_asc' | 'price_desc') {
    if (sort === 'newest') {
      return byTimeThenIdDescending((state) => state.publishedAt?.getTime() ?? 0);
    }
    const direction = sort === 'price_asc' ? 1 : -1;
    return (left: PublishedListingState, right: PublishedListingState): number => {
      const priceDifference = (left.price.amountMinor - right.price.amountMinor) * direction;
      if (priceDifference !== 0) {
        return priceDifference;
      }
      if (left.id === right.id) {
        return 0;
      }
      return left.id < right.id ? 1 : -1;
    };
  }

  findByOrganization(criteria: OrganizationListingCriteria): Promise<ListingPage> {
    const matched = [...this.#rows.values()]
      .filter((state) => state.organizationId === criteria.organizationId)
      .toSorted(byTimeThenIdDescending((state) => state.createdAt.getTime()));

    return Promise.resolve(this.#page(matched, criteria.limit, criteria.offset));
  }

  #page(states: readonly ListingState[], limit: number, offset: number): ListingPage {
    return {
      items: states.slice(offset, offset + limit).map((state) => Listing.restore(state)),
      total: states.length,
    };
  }
}
