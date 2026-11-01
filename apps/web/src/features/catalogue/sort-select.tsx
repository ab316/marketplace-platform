'use client';

import type { CatalogueSort } from '@acme/api-contracts';
import { useRouter } from 'next/navigation';
import { useId } from 'react';

import { type CatalogueSearch, FILTERS_FORM_ID, catalogueHref } from './search-params.ts';

/**
 * The sort control (UC-006 B3). The only client component on the page: changing a `<select>`
 * should navigate immediately rather than wait for an Apply press. It belongs to the filter form
 * through its `form` attribute, so with JavaScript off it still submits with Apply — this is
 * enhancement, not dependency.
 */
const OPTIONS: ReadonlyArray<{ value: CatalogueSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export const SortSelect = ({ search }: { readonly search: CatalogueSearch }) => {
  const router = useRouter();
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-muted-foreground text-sm">
        Sort
      </label>
      <select
        id={id}
        name="sort"
        form={FILTERS_FORM_ID}
        value={search.sort}
        onChange={(event) => {
          const sort = OPTIONS.find((option) => option.value === event.target.value)?.value;
          if (sort === undefined) {
            return;
          }
          // Changing the order keeps refinements and restarts from page 1 (UC-006 B3/B7).
          router.push(catalogueHref({ ...search, sort, page: 1 }));
        }}
        className="border-input bg-surface text-foreground h-10 rounded-lg border px-3 text-sm"
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
