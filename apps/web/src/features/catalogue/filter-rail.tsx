import { CATALOGUE_BRANDS, CATALOGUE_RAM_MINIMUMS } from '@acme/api-contracts';
import Link from 'next/link';

import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import {
  type CatalogueSearch,
  FILTERS_FORM_ID,
  type SearchIssue,
  clearAllHref,
} from './search-params.ts';

/**
 * The filter form (UC-006 B2): a plain GET to `/listings`, so refining works without JavaScript
 * and every submission lands on a shareable URL. Page is deliberately not a form field — any new
 * refinement starts from page 1 — while sort rides along in a hidden input so re-filtering never
 * silently changes the reading order.
 */

/** The rail shows the common brands at rest; the rest sit behind a native disclosure. */
const VISIBLE_BRANDS = 6;

const CheckOption = ({
  name,
  value,
  label,
  checked,
}: {
  readonly name: string;
  readonly value: string;
  readonly label: string;
  readonly checked: boolean;
}) => (
  <label className="flex items-center gap-2 py-1 text-sm">
    <input
      type="checkbox"
      name={name}
      value={value}
      defaultChecked={checked}
      form={FILTERS_FORM_ID}
      className="accent-primary size-4"
    />
    {label}
  </label>
);

const RadioOption = ({
  name,
  value,
  label,
  checked,
}: {
  readonly name: string;
  readonly value: string;
  readonly label: string;
  readonly checked: boolean;
}) => (
  <label className="flex items-center gap-2 py-1 text-sm">
    <input
      type="radio"
      name={name}
      value={value}
      defaultChecked={checked}
      form={FILTERS_FORM_ID}
      className="accent-primary size-4"
    />
    {label}
  </label>
);

export const FilterRail = ({
  search,
  issues,
}: {
  readonly search: CatalogueSearch;
  readonly issues: readonly SearchIssue[];
}) => {
  const priceMinError = issues.find((issue) => issue.param === 'priceMin')?.message;
  const priceMaxError = issues.find((issue) => issue.param === 'priceMax')?.message;

  return (
    <form id={FILTERS_FORM_ID} method="get" action="/listings" className="mt-2">
      {/* The sort <select> participates in this form via its `form` attribute, so re-filtering
          keeps the chosen reading order (UC-006 B3) and sort changes work without JavaScript. */}
      <fieldset className="border-border mt-2 border-t pt-4">
        <legend className="float-left text-sm font-medium">Brand</legend>
        <div className="clear-left pt-2">
          {CATALOGUE_BRANDS.slice(0, VISIBLE_BRANDS).map((brand) => (
            <CheckOption
              key={brand}
              name="brand"
              value={brand}
              label={brand}
              checked={search.brands.includes(brand)}
            />
          ))}
          <details
            open={search.brands.some((b) => !CATALOGUE_BRANDS.slice(0, VISIBLE_BRANDS).includes(b))}
          >
            <summary className="text-primary cursor-pointer py-1 text-sm">
              Show all {CATALOGUE_BRANDS.length} brands
            </summary>
            {CATALOGUE_BRANDS.slice(VISIBLE_BRANDS).map((brand) => (
              <CheckOption
                key={brand}
                name="brand"
                value={brand}
                label={brand}
                checked={search.brands.includes(brand)}
              />
            ))}
          </details>
        </div>
      </fieldset>

      <fieldset className="border-border mt-4 border-t pt-4">
        <legend className="float-left text-sm font-medium">Price (SEK)</legend>
        <div className="clear-left flex items-start gap-2 pt-2">
          <div className="w-full">
            <Input
              type="text"
              inputMode="numeric"
              name="priceMin"
              defaultValue={search.priceMin ?? ''}
              placeholder="Min"
              aria-label="Minimum price in SEK"
              aria-invalid={priceMinError !== undefined ? true : undefined}
              aria-describedby={priceMinError !== undefined ? 'price-min-error' : undefined}
            />
            {priceMinError !== undefined ? (
              <p id="price-min-error" className="text-danger mt-1 text-xs">
                {priceMinError}
              </p>
            ) : null}
          </div>
          <div className="w-full">
            <Input
              type="text"
              inputMode="numeric"
              name="priceMax"
              defaultValue={search.priceMax ?? ''}
              placeholder="Max"
              aria-label="Maximum price in SEK"
              aria-invalid={priceMaxError !== undefined ? true : undefined}
              aria-describedby={priceMaxError !== undefined ? 'price-max-error' : undefined}
            />
            {priceMaxError !== undefined ? (
              <p id="price-max-error" className="text-danger mt-1 text-xs">
                {priceMaxError}
              </p>
            ) : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="border-border mt-4 border-t pt-4">
        <legend className="float-left text-sm font-medium">Condition</legend>
        <p className="text-muted-foreground clear-left pt-1 text-xs">
          Grades describe cosmetic condition. Picking one includes better grades.
        </p>
        <div className="pt-1">
          <RadioOption name="grade" value="A" label="A — like new" checked={search.grade === 'A'} />
          <RadioOption name="grade" value="B" label="B or better" checked={search.grade === 'B'} />
          <RadioOption name="grade" value="C" label="C or better" checked={search.grade === 'C'} />
          <RadioOption
            name="grade"
            value=""
            label="Any condition"
            checked={search.grade === undefined}
          />
        </div>
      </fieldset>

      <fieldset className="border-border mt-4 border-t pt-4">
        <legend className="float-left text-sm font-medium">Memory</legend>
        <div className="clear-left pt-2">
          {CATALOGUE_RAM_MINIMUMS.map((ram) => (
            <RadioOption
              key={ram}
              name="ramMin"
              value={String(ram)}
              label={`${ram} GB or more`}
              checked={search.ramMin === ram}
            />
          ))}
          <RadioOption
            name="ramMin"
            value=""
            label="Any amount"
            checked={search.ramMin === undefined}
          />
        </div>
      </fieldset>

      <Button type="submit" className="mt-5 w-full">
        Apply filters
      </Button>
      <Button asChild variant="ghost" className="mt-2 w-full">
        <Link href={clearAllHref(search)}>Reset filters</Link>
      </Button>
    </form>
  );
};
