'use client';

import { CATALOGUE_BRANDS, type CreateListingRequest, type StorageType } from '@acme/api-contracts';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useId, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { FormErrorBanner } from '../../../components/feedback/form-error-banner.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Field } from '../../../components/ui/field.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { Select } from '../../../components/ui/select.tsx';
import { Textarea } from '../../../components/ui/textarea.tsx';
import {
  EMPTY_LISTING_FORM,
  GRADE_WORD,
  type ListingFormValues,
  STORAGE_TYPE_LABEL,
  listingFormSchema,
} from '../form-schema.ts';
import type { ListingActionFailure } from '../types.ts';

/**
 * The listing form for `new` and `edit` (UC-007 S1/S2; design contract). React Hook Form over the
 * feature's form schema, which validates at the field level and transforms to the shared
 * `CreateListingRequest`; the Server Action arrives as a prop so the form is component-testable,
 * exactly like the organization form.
 *
 * Every field is required to save a draft because the backend requires it (UC-007 Gaps; P1-012 is
 * out of this slice), and the form says so rather than promising a "save for later".
 */
export interface ListingFormProps {
  readonly mode: 'new' | 'edit';
  readonly defaultValues?: ListingFormValues;
  readonly cancelHref: Route;
  readonly action: (input: CreateListingRequest) => Promise<ListingActionFailure>;
}

/** Form order, so the first invalid field focused is the first one the eye meets. */
const FIELD_ORDER: readonly (keyof ListingFormValues)[] = [
  'title',
  'description',
  'brand',
  'model',
  'cpu',
  'ramGb',
  'storageType',
  'storageGb',
  'screenSizeInches',
  'grade',
  'batteryHealthMinPercent',
  'batteryCycleMin',
  'batteryCycleMax',
  'knownDefects',
  'priceSek',
  'quantityTotal',
  'fulfillmentExpectations',
];

const STORAGE_TYPES: readonly StorageType[] = ['ssd', 'nvme', 'hdd'];

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

export const ListingForm = ({
  mode,
  defaultValues = EMPTY_LISTING_FORM,
  cancelHref,
  action,
}: ListingFormProps) => {
  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<ListingFormValues, unknown, CreateListingRequest>({
    resolver: standardSchemaResolver(listingFormSchema),
    mode: 'onBlur',
    defaultValues,
  });

  const [failure, setFailure] = useState<ListingActionFailure | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const brandListId = useId();

  const onSubmit = handleSubmit(
    (request) => {
      setFailure(undefined);
      startTransition(async () => {
        setFailure(await action(request));
      });
    },
    (fieldErrors) => {
      // Focus the first invalid field, in form order (design contract, Accessibility).
      const first = FIELD_ORDER.find((field) => fieldErrors[field] !== undefined);
      if (first !== undefined) {
        setFocus(first);
      }
    }
  );

  return (
    <form
      noValidate
      aria-label={mode === 'new' ? 'New listing' : 'Edit listing'}
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className="flex flex-col gap-6"
    >
      <p className="text-muted-foreground text-sm">
        Every field is required to save a draft. Drafts are not visible to buyers until you publish.
      </p>

      {failure?.formError === undefined ? null : <FormErrorBanner message={failure.formError} />}

      <Group legend="Listing">
        <Field
          label="Title"
          required
          error={errors.title?.message}
          hint="What buyers see first. Up to 140 characters."
        >
          {(props) => (
            <Input
              {...props}
              {...register('title')}
              placeholder="ThinkPad T14 Gen 3 — business workhorse"
              disabled={isPending}
            />
          )}
        </Field>
        <Field
          label="Description"
          required
          error={errors.description?.message}
          hint="Where the units came from, what you did to refurbish them, what is included."
        >
          {(props) => (
            <Textarea
              {...props}
              {...register('description')}
              className="min-h-32"
              disabled={isPending}
            />
          )}
        </Field>
      </Group>

      <Group legend="Laptop" description="The specifications every unit on this listing shares.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Brand"
            required
            error={errors.brand?.message}
            hint="Start typing for suggestions; any brand is accepted."
          >
            {(props) => (
              <>
                <Input
                  {...props}
                  {...register('brand')}
                  list={brandListId}
                  autoComplete="off"
                  placeholder="Lenovo"
                  disabled={isPending}
                />
                <datalist id={brandListId}>
                  {CATALOGUE_BRANDS.map((brand) => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Model" required error={errors.model?.message}>
            {(props) => (
              <Input
                {...props}
                {...register('model')}
                placeholder="ThinkPad T14 Gen 3"
                disabled={isPending}
              />
            )}
          </Field>
        </div>
        <Field label="Processor" required error={errors.cpu?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('cpu')}
              placeholder="AMD Ryzen 5 PRO 6650U"
              disabled={isPending}
            />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Memory (GB)" required error={errors.ramGb?.message}>
            {(props) => (
              <Input
                {...props}
                {...register('ramGb')}
                inputMode="numeric"
                placeholder="16"
                disabled={isPending}
              />
            )}
          </Field>
          <Field label="Storage type" required error={errors.storageType?.message}>
            {(props) => (
              <Select {...props} {...register('storageType')} disabled={isPending}>
                <option value="">Choose…</option>
                {STORAGE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {STORAGE_TYPE_LABEL[type]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Storage (GB)" required error={errors.storageGb?.message}>
            {(props) => (
              <Input
                {...props}
                {...register('storageGb')}
                inputMode="numeric"
                placeholder="512"
                disabled={isPending}
              />
            )}
          </Field>
        </div>
        <Field
          label="Screen size (inches)"
          required
          error={errors.screenSizeInches?.message}
          className="sm:max-w-48"
        >
          {(props) => (
            <Input
              {...props}
              {...register('screenSizeInches')}
              inputMode="decimal"
              placeholder="14"
              disabled={isPending}
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
          error={errors.grade?.message}
          hint="Cosmetic condition only. Buyers see the grade with its plain-language meaning."
          className="sm:max-w-72"
        >
          {(props) => (
            <Select {...props} {...register('grade')} disabled={isPending}>
              <option value="">Choose…</option>
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
            error={errors.batteryHealthMinPercent?.message}
            hint="1–100. Every unit meets at least this."
          >
            {(props) => (
              <Input
                {...props}
                {...register('batteryHealthMinPercent')}
                inputMode="numeric"
                placeholder="85"
                disabled={isPending}
              />
            )}
          </Field>
          <Field
            label="Battery cycles, from"
            error={errors.batteryCycleMin?.message}
            hint="Optional, as a pair."
          >
            {(props) => (
              <Input
                {...props}
                {...register('batteryCycleMin')}
                inputMode="numeric"
                placeholder="150"
                disabled={isPending}
              />
            )}
          </Field>
          <Field
            label="Battery cycles, to"
            error={errors.batteryCycleMax?.message}
            hint="Leave both empty if you do not promise a range."
          >
            {(props) => (
              <Input
                {...props}
                {...register('batteryCycleMax')}
                inputMode="numeric"
                placeholder="400"
                disabled={isPending}
                // The pair rule reports on "from"; mark "to" invalid too so both read as one error.
                aria-invalid={errors.batteryCycleMin === undefined ? props['aria-invalid'] : true}
              />
            )}
          </Field>
        </div>
        <Field
          label="Known defects"
          required
          error={errors.knownDefects?.message}
          hint='Anything a buyer would want to know before paying. Write "none" if there are none.'
        >
          {(props) => <Textarea {...props} {...register('knownDefects')} disabled={isPending} />}
        </Field>
      </Group>

      <Group legend="Offer">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Price (SEK)"
            required
            error={errors.priceSek?.message}
            hint="Per unit, including VAT."
          >
            {(props) => (
              <div className="relative">
                <Input
                  {...props}
                  {...register('priceSek')}
                  inputMode="decimal"
                  placeholder="7 490"
                  className="pr-12"
                  disabled={isPending}
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
            error={errors.quantityTotal?.message}
            hint="Identical units available now. At least 1."
          >
            {(props) => (
              <Input
                {...props}
                {...register('quantityTotal')}
                inputMode="numeric"
                placeholder="12"
                disabled={isPending}
              />
            )}
          </Field>
        </div>
        <Field
          label="Fulfillment expectations"
          required
          error={errors.fulfillmentExpectations?.message}
          hint="What you will do after payment and roughly when: carrier, days to ship, what is in the box."
        >
          {(props) => (
            <Textarea {...props} {...register('fulfillmentExpectations')} disabled={isPending} />
          )}
        </Field>
      </Group>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending
            ? mode === 'new'
              ? 'Saving draft…'
              : 'Saving changes…'
            : mode === 'new'
              ? 'Save draft'
              : 'Save changes'}
        </Button>
        <Button asChild size="lg" variant="ghost">
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <p className="text-muted-foreground text-xs sm:ml-auto">
          Saving keeps it a draft. Publishing is a separate step on the listing page.
        </p>
      </div>
    </form>
  );
};
