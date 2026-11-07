'use client';

import {
  CATALOGUE_BRANDS,
  type ListingDraft,
  type ListingIssue,
  type UpdateListingRequest,
} from '@acme/api-contracts';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useRouter } from 'next/navigation';
import { type ComponentProps, type ReactElement, useEffect, useState, useTransition } from 'react';
import { type FieldPath, get, useForm } from 'react-hook-form';

import { FormErrorBanner } from '../../../components/feedback/form-error-banner.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Field } from '../../../components/ui/field.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { Textarea } from '../../../components/ui/textarea.tsx';
import { cn } from '../../../lib/cn.ts';
import { GRADES, GRADE_ORDER, STORAGE_TYPE_LABEL } from '../../../lib/formatting/listing.ts';
import {
  EMPTY_LISTING_FORM,
  type ListingFormValues,
  type ListingFormPath,
  fieldIdFor,
  isListingFormPath,
  listingFormSchema,
  toFormValues,
} from '../schemas/listing-form.schema.ts';
import type { PublishFailure, SaveFailure, SaveResult } from '../types.ts';
import { ConfirmDialog } from './confirm-dialog.tsx';
import { NoticeBanner } from './notice-banner.tsx';
import { ReadinessPanel } from './readiness-panel.tsx';

type FormPath = FieldPath<ListingFormValues>;

export interface ListingEditorProps {
  /** The saved draft, or `undefined` for a new listing that does not exist yet. */
  readonly draft?: ListingDraft | undefined;
  /** New listing: the first save creates the draft and redirects to it. */
  readonly createAction?: (input: UpdateListingRequest) => Promise<SaveFailure>;
  /** Existing draft: saves the whole form and returns the fresh draft. */
  readonly saveAction?: (input: UpdateListingRequest) => Promise<SaveResult>;
  /** Existing draft: publishes it. Success redirects. */
  readonly publishAction?: () => Promise<PublishFailure>;
  /** A one-off message from the redirect that brought the seller here. */
  readonly initialNotice?: string | undefined;
}

/** A number input with its unit as visible text, never a placeholder (design: Accessibility). */
const UnitInput = ({
  unit,
  ...props
}: { readonly unit: string } & ComponentProps<typeof Input>) => (
  <div className="flex items-center gap-2">
    <Input {...props} autoComplete="off" className="max-w-40" />
    <span className="text-muted-foreground text-sm">{unit}</span>
  </div>
);

// Render functions, not components: `field` calls them, so each input keeps its identity.
const withUnit =
  (unit: string, inputMode: 'numeric' | 'decimal' = 'numeric') =>
  (props: Record<string, unknown>) => <UnitInput unit={unit} inputMode={inputMode} {...props} />;
const textArea = (props: Record<string, unknown>) => <Textarea {...props} rows={4} />;
const textInput = (props: Record<string, unknown>) => <Input {...props} autoComplete="off" />;

const UNSAVED_PROMPT = 'You have unsaved changes. Leave without saving?';
const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

/**
 * The draft editor (UC-005, UC-007, UC-008; design `docs/design/seller-listing-management.md`).
 *
 * Client validation is well-formedness only, so an incomplete draft always saves. Completeness
 * is the server's readiness answer, shown beside the form. Every save sends the whole form, so
 * what the seller sees is what is stored. The Server Actions arrive as props, so the editor is
 * component-testable.
 */
export const ListingEditor = ({
  draft,
  createAction,
  saveAction,
  publishAction,
  initialNotice,
}: ListingEditorProps) => {
  const router = useRouter();
  const [saved, setSaved] = useState<ListingDraft | undefined>(draft);
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);
  const [notice, setNotice] = useState<string | undefined>(initialNotice);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [blocked, setBlocked] = useState<SaveFailure['blocked']>(undefined);
  const [publishIssues, setPublishIssues] = useState<readonly ListingIssue[] | undefined>(
    undefined
  );
  const [isSaving, startSaving] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    watch,
    formState: { errors, isDirty },
  } = useForm<ListingFormValues, unknown, UpdateListingRequest>({
    resolver: standardSchemaResolver(listingFormSchema),
    defaultValues: draft === undefined ? EMPTY_LISTING_FORM : toFormValues(draft),
    mode: 'onBlur',
  });

  // Leaving with unsaved changes asks first: tab close and reload, then in-app links.
  useEffect(() => {
    if (!isDirty) {
      return undefined;
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        anchor instanceof HTMLAnchorElement &&
        !(anchor.getAttribute('href') ?? '').startsWith('#') &&
        !window.confirm(UNSAVED_PROMPT)
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    document.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      document.removeEventListener('click', onClick, true);
    };
  }, [isDirty]);

  const showFailure = (failure: SaveFailure) => {
    setFormError(failure.formError);
    setBlocked(failure.blocked);
    const entries = Object.entries(failure.fieldErrors ?? {});
    let first: ListingFormPath | undefined;
    for (const [path, message] of entries) {
      if (isListingFormPath(path)) {
        setError(path, { type: 'server', message });
        first ??= path;
      } else {
        // An issue on no known field still has to reach the seller.
        setFormError(message);
      }
    }
    if (first !== undefined) {
      setFocus(first);
    }
  };

  // React Hook Form focuses the first invalid field itself when client validation fails.
  const onSubmit = handleSubmit((request) => {
    setNotice(undefined);
    setFormError(undefined);
    setPublishIssues(undefined);
    startSaving(async () => {
      if (saved === undefined) {
        if (createAction !== undefined) {
          showFailure(await createAction(request));
        }
        return;
      }
      if (saveAction === undefined) {
        return;
      }
      const result = await saveAction(request);
      if (result.ok) {
        setSaved(result.draft);
        reset(toFormValues(result.draft));
        setSavedAt(timeFormatter.format(new Date()));
      } else {
        showFailure(result);
      }
    });
  });

  const errorFor = (path: FormPath): string | undefined => {
    const entry: unknown = get(errors, path);
    return typeof entry === 'object' &&
      entry !== null &&
      'message' in entry &&
      typeof entry.message === 'string'
      ? entry.message
      : undefined;
  };

  const control = (path: FormPath) => ({
    ...register(path),
    disabled: blocked !== undefined,
  });

  const field = (
    path: FormPath,
    label: string,
    render: (props: ReturnType<typeof control> & Record<string, unknown>) => ReactElement,
    hint?: string
  ) => (
    <Field id={fieldIdFor(path)} label={label} error={errorFor(path)} hint={hint}>
      {(fieldProps) => render({ ...fieldProps, ...control(path) })}
    </Field>
  );

  const brand = watch('specifications.brand');
  const legacyBrand =
    brand !== '' && !(CATALOGUE_BRANDS as readonly string[]).includes(brand) ? brand : undefined;
  const selectedGrade = watch('condition.grade');

  const readiness =
    publishIssues === undefined
      ? (saved?.readiness ?? null)
      : { ready: false, issues: [...publishIssues] };

  const publishReason =
    readiness === null || !readiness.ready
      ? 'Complete the details above to publish.'
      : isDirty
        ? 'Save your changes before publishing.'
        : undefined;

  const publishControl =
    saved === undefined || publishAction === undefined ? undefined : (
      <div className="flex flex-col gap-2">
        {publishReason === undefined ? (
          <ConfirmDialog
            trigger={<Button className="w-full">Publish</Button>}
            title="Publish this listing?"
            description="Buyers can find and order it straight away. After publishing, its details can't be changed. To change something, you'd archive it and publish a new listing."
            confirmLabel="Publish"
            pendingLabel="Publishing…"
            cancelLabel="Keep editing"
            onConfirm={async () => {
              setFormError(undefined);
              const failure = await publishAction();
              if (failure.issues !== undefined) {
                setPublishIssues(failure.issues);
                setFormError('Some details are missing or invalid.');
              } else {
                setFormError(failure.formError);
              }
            }}
          />
        ) : (
          <>
            <Button className="w-full" disabled aria-describedby="publish-reason">
              Publish
            </Button>
            <p id="publish-reason" className="text-muted-foreground text-xs">
              {publishReason}
            </p>
          </>
        )}
      </div>
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <form
        noValidate
        aria-label="Listing details"
        onSubmit={(event) => {
          void onSubmit(event);
        }}
        className="flex flex-col gap-8"
      >
        {notice === undefined ? null : <NoticeBanner tone="success">{notice}</NoticeBanner>}
        {formError === undefined ? null : <FormErrorBanner message={formError} />}
        {blocked === undefined ? null : (
          <div className="flex flex-col items-start gap-2">
            <FormErrorBanner
              message={
                blocked === 'published'
                  ? 'This listing was published by another member, so it can no longer be edited.'
                  : 'You can no longer change this listing.'
              }
            />
            <Button variant="secondary" size="sm" onClick={() => router.refresh()}>
              View listing
            </Button>
          </div>
        )}

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Basics</legend>
          {field('title', 'Title', textInput)}
          {field(
            'description',
            'Description',
            textArea,
            "What a buyer needs to know: condition story, what's included, why it's a good buy."
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Specifications</legend>
          <Field
            id={fieldIdFor('specifications.brand')}
            label="Brand"
            error={
              errorFor('specifications.brand') ??
              (legacyBrand === undefined ? undefined : 'Choose a brand from the marketplace list.')
            }
            hint={
              <>
                Brand not listed?{' '}
                <a href="/contact" className="text-primary hover:underline">
                  Contact support
                </a>
                .
              </>
            }
          >
            {(fieldProps) => (
              <select
                {...fieldProps}
                {...control('specifications.brand')}
                className="bg-surface border-input h-10 w-full max-w-xs rounded-lg border px-3 text-sm aria-[invalid=true]:border-danger"
              >
                <option value="">Choose a brand</option>
                {legacyBrand === undefined ? null : (
                  <option value={legacyBrand} disabled>
                    {legacyBrand} (not on the list)
                  </option>
                )}
                {CATALOGUE_BRANDS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {field('specifications.model', 'Model', textInput, 'For example "ThinkPad T14 Gen 3".')}
          {field('specifications.cpu', 'CPU', textInput)}
          {field('specifications.ramGb', 'RAM', withUnit('GB'))}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={fieldIdFor('specifications.storageType')}
              label="Storage type"
              error={errorFor('specifications.storageType')}
            >
              {(fieldProps) => (
                <select
                  {...fieldProps}
                  {...control('specifications.storageType')}
                  className="bg-surface border-input h-10 w-full rounded-lg border px-3 text-sm aria-[invalid=true]:border-danger"
                >
                  <option value="">Choose a type</option>
                  {(['ssd', 'nvme', 'hdd'] as const).map((type) => (
                    <option key={type} value={type}>
                      {STORAGE_TYPE_LABEL[type]}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            {field('specifications.storageGb', 'Storage', withUnit('GB'))}
          </div>
          {field('specifications.screenSizeInches', 'Screen size', withUnit('inches', 'decimal'))}
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Condition</legend>
          <fieldset
            className="flex flex-col gap-2"
            aria-describedby="grade-hint"
            aria-invalid={errorFor('condition.grade') === undefined ? undefined : true}
          >
            <legend className="text-sm font-medium">Condition grade</legend>
            <p id="grade-hint" className="text-muted-foreground text-xs">
              Grade is the minimum every unit meets, and describes looks only. Disclose faults under
              Known defects.
            </p>
            <div className="grid gap-2 sm:grid-cols-3">
              {GRADE_ORDER.map((grade, index) => (
                <label
                  key={grade}
                  className={cn(
                    'border-border flex cursor-pointer flex-col gap-1 rounded-lg border p-3 text-sm',
                    'has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-2',
                    selectedGrade === grade && 'border-primary bg-accent'
                  )}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      value={grade}
                      {...control('condition.grade')}
                      id={index === 0 ? fieldIdFor('condition.grade') : undefined}
                      aria-describedby={`grade-${grade}-definition`}
                    />
                    Grade {grade} — {GRADES[grade].name}
                  </span>
                  <span id={`grade-${grade}-definition`} className="text-muted-foreground text-xs">
                    {GRADES[grade].definition}
                  </span>
                </label>
              ))}
            </div>
            {errorFor('condition.grade') === undefined ? null : (
              <p role="alert" className="text-danger text-xs font-medium">
                {errorFor('condition.grade')}
              </p>
            )}
          </fieldset>
          {field(
            'condition.guarantees.batteryHealthMinPercent',
            'Battery health floor',
            withUnit('%'),
            'Every unit has at least this battery health.'
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {field(
              'condition.guarantees.batteryCycleMin',
              'Battery cycles, minimum (optional)',
              withUnit('cycles')
            )}
            {field(
              'condition.guarantees.batteryCycleMax',
              'Battery cycles, maximum (optional)',
              withUnit('cycles')
            )}
          </div>
          {field(
            'condition.knownDefects',
            'Known defects',
            textArea,
            'Write "none" if there are none.'
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Price and stock</legend>
          {field('priceKronor', 'Price', withUnit('kr'), 'Whole kronor.')}
          {field('quantityTotal', 'Quantity', withUnit('units'))}
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Fulfillment</legend>
          {field(
            'fulfillmentExpectations',
            'Fulfillment expectations',
            textArea,
            'What happens after payment, and roughly when, e.g. "Shipped from Gothenburg within 2 business days."'
          )}
        </fieldset>

        <div className="bg-background/95 border-border sticky bottom-0 flex items-center gap-4 border-t py-4">
          <Button
            type="submit"
            disabled={isSaving || blocked !== undefined}
            aria-busy={isSaving || undefined}
          >
            {isSaving ? 'Saving…' : 'Save draft'}
          </Button>
          <p aria-live="polite" className="text-muted-foreground text-sm">
            {isDirty ? 'Unsaved changes' : savedAt === undefined ? '' : `Saved at ${savedAt}`}
          </p>
        </div>
      </form>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <ReadinessPanel readiness={readiness} linkToFields publish={publishControl} />
      </aside>
    </div>
  );
};
