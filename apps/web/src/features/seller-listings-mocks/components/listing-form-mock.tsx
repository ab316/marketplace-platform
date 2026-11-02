'use client';

import type { ComponentProps, ReactNode } from 'react';

import { Button } from '../../../components/ui/button.tsx';
import { Field } from '../../../components/ui/field.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { Textarea } from '../../../components/ui/textarea.tsx';
import { cn } from '../../../lib/cn.ts';
import { BRAND_SUGGESTIONS, GRADE_WORD, type MockSellerListing } from '../mock-data.ts';

/**
 * The listing form as the contract describes it: four fieldsets, every field required to save a
 * draft (UC-007 S1; P1-012 is out of this slice), brand as free text with the curated list as
 * suggestions, price entered in whole SEK.
 *
 * Static mockup: nothing submits, no handler exists, the button keeps its default `type="button"`.
 * A Client Component only because `Field` takes a render prop, exactly as the auth mocks do; the
 * real form becomes React Hook Form over a Server Action when this graduates.
 */

export type ListingFormErrors = Partial<
  Record<
    | 'title'
    | 'description'
    | 'brand'
    | 'model'
    | 'cpu'
    | 'ramGb'
    | 'storageType'
    | 'storageGb'
    | 'screenSizeInches'
    | 'grade'
    | 'batteryHealthMinPercent'
    | 'batteryCycles'
    | 'knownDefects'
    | 'priceSek'
    | 'quantityTotal'
    | 'fulfillmentExpectations',
    string
  >
>;

export type ListingFormMockProps = {
  readonly mode: 'new' | 'edit';
  /** Pre-filled values; the edit route always has them, the errors state keeps what was typed. */
  readonly values?: Partial<MockSellerListing> & { readonly priceSek?: string };
  readonly errors?: ListingFormErrors;
};

const BRAND_LIST_ID = 'mock-brand-suggestions';

/**
 * A native `<select>` styled like `Input`. Three options per field do not justify a Radix Select;
 * the contract keeps this primitive native until a field genuinely needs search or grouping.
 */
const Select = ({ className, ...props }: ComponentProps<'select'>) => (
  <select
    className={cn(
      'bg-surface text-foreground h-10 w-full rounded-lg border border-input px-3 text-sm',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'aria-[invalid=true]:border-danger',
      className
    )}
    {...props}
  />
);

const Group = ({
  legend,
  description,
  children,
}: {
  legend: string;
  description?: string;
  children: ReactNode;
}) => (
  <fieldset className="border-border flex flex-col gap-4 rounded-xl border p-5">
    <legend className="px-1.5 text-sm font-semibold">{legend}</legend>
    {description === undefined ? null : (
      <p className="text-muted-foreground -mt-1 text-xs">{description}</p>
    )}
    {children}
  </fieldset>
);

export const ListingFormMock = ({ mode, values = {}, errors = {} }: ListingFormMockProps) => (
  <form
    className="flex flex-col gap-6"
    aria-label={mode === 'new' ? 'New listing' : 'Edit listing'}
    noValidate
  >
    <p className="text-muted-foreground text-sm">
      Every field is required to save a draft. Drafts are not visible to buyers until you publish.
    </p>

    <Group legend="Listing">
      <Field
        label="Title"
        required
        error={errors.title}
        hint="What buyers see first. Up to 140 characters."
      >
        {(props) => (
          <Input
            {...props}
            defaultValue={values.title}
            placeholder="ThinkPad T14 Gen 3 — business workhorse"
          />
        )}
      </Field>
      <Field
        label="Description"
        required
        error={errors.description}
        hint="Where the units came from, what you did to refurbish them, what is included."
      >
        {(props) => <Textarea {...props} defaultValue={values.description} className="min-h-32" />}
      </Field>
    </Group>

    <Group legend="Laptop" description="The specifications every unit on this listing shares.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Brand"
          required
          error={errors.brand}
          hint="Start typing for suggestions; any brand is accepted."
        >
          {(props) => (
            <>
              <Input
                {...props}
                defaultValue={values.brand}
                list={BRAND_LIST_ID}
                autoComplete="off"
                placeholder="Lenovo"
              />
              <datalist id={BRAND_LIST_ID}>
                {BRAND_SUGGESTIONS.map((brand) => (
                  <option key={brand} value={brand} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <Field label="Model" required error={errors.model}>
          {(props) => (
            <Input {...props} defaultValue={values.model} placeholder="ThinkPad T14 Gen 3" />
          )}
        </Field>
      </div>
      <Field label="Processor" required error={errors.cpu}>
        {(props) => (
          <Input {...props} defaultValue={values.cpu} placeholder="AMD Ryzen 5 PRO 6650U" />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Memory (GB)" required error={errors.ramGb}>
          {(props) => (
            <Input {...props} inputMode="numeric" defaultValue={values.ramGb} placeholder="16" />
          )}
        </Field>
        <Field label="Storage type" required error={errors.storageType}>
          {(props) => (
            <Select {...props} defaultValue={values.storageType ?? ''}>
              <option value="" disabled>
                Choose…
              </option>
              <option value="SSD">SSD</option>
              <option value="NVMe">NVMe</option>
              <option value="HDD">HDD</option>
            </Select>
          )}
        </Field>
        <Field label="Storage (GB)" required error={errors.storageGb}>
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              defaultValue={values.storageGb}
              placeholder="512"
            />
          )}
        </Field>
      </div>
      <Field
        label="Screen size (inches)"
        required
        error={errors.screenSizeInches}
        className="sm:max-w-48"
      >
        {(props) => (
          <Input
            {...props}
            inputMode="decimal"
            defaultValue={values.screenSizeInches}
            placeholder="14"
          />
        )}
      </Field>
    </Group>

    <Group
      legend="Condition"
      description="Promised for every unit, not measured per unit. Stock that cannot meet the same guarantees belongs on another listing."
    >
      <Field
        label="Condition grade"
        required
        error={errors.grade}
        hint="Cosmetic condition only. Buyers see the grade with its plain-language meaning."
      >
        {(props) => (
          <Select {...props} defaultValue={values.grade ?? ''} className="sm:max-w-72">
            <option value="" disabled>
              Choose…
            </option>
            {(['A', 'B', 'C'] as const).map((grade) => (
              <option key={grade} value={grade}>
                {grade} — {GRADE_WORD[grade]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Battery health, minimum (%)"
          required
          error={errors.batteryHealthMinPercent}
          hint="1–100. Every unit meets at least this."
        >
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              defaultValue={values.batteryHealthMinPercent}
              placeholder="85"
            />
          )}
        </Field>
        <Field
          label="Battery cycles, from"
          error={errors.batteryCycles}
          hint="Optional, as a pair."
        >
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              defaultValue={values.batteryCycleMin}
              placeholder="150"
            />
          )}
        </Field>
        <Field label="Battery cycles, to" hint="Leave both empty if you do not promise a range.">
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              defaultValue={values.batteryCycleMax}
              placeholder="400"
              aria-invalid={errors.batteryCycles === undefined ? undefined : true}
            />
          )}
        </Field>
      </div>
      <Field
        label="Known defects"
        required
        error={errors.knownDefects}
        hint='Anything a buyer would want to know before paying. Write "none" if there are none.'
      >
        {(props) => <Textarea {...props} defaultValue={values.knownDefects} />}
      </Field>
    </Group>

    <Group legend="Offer">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price (SEK)" required error={errors.priceSek} hint="Per unit, including VAT.">
          {(props) => (
            <div className="relative">
              <Input
                {...props}
                inputMode="decimal"
                defaultValue={values.priceSek}
                placeholder="7 490"
                className="pr-12"
              />
              <span
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm"
              >
                kr
              </span>
            </div>
          )}
        </Field>
        <Field
          label="Quantity"
          required
          error={errors.quantityTotal}
          hint="Identical units available now. At least 1."
        >
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              defaultValue={values.totalQuantity}
              placeholder="12"
            />
          )}
        </Field>
      </div>
      <Field
        label="Fulfillment expectations"
        required
        error={errors.fulfillmentExpectations}
        hint="What you will do after payment and roughly when: carrier, days to ship, what is in the box."
      >
        {(props) => <Textarea {...props} defaultValue={values.fulfillmentExpectations} />}
      </Field>
    </Group>

    <div className="flex flex-wrap items-center gap-3">
      <Button size="lg" aria-hidden="true" tabIndex={-1}>
        {mode === 'new' ? 'Save draft' : 'Save changes'}
      </Button>
      <Button size="lg" variant="ghost" aria-hidden="true" tabIndex={-1}>
        Cancel
      </Button>
      <p className="text-muted-foreground text-xs sm:ml-auto">
        Saving creates a draft. Publishing is a separate step on the listing page.
      </p>
    </div>
  </form>
);
