'use client';

import {
  type CreateOrganizationRequest,
  createOrganizationRequestSchema,
} from '@acme/api-contracts';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { FormErrorBanner } from '../../../components/feedback/form-error-banner.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Field } from '../../../components/ui/field.tsx';
import { Input } from '../../../components/ui/input.tsx';
import { Textarea } from '../../../components/ui/textarea.tsx';
import type { CreateOrganizationFailure } from '../types.ts';

/**
 * The create-organization form (UC-003 C1; design `docs/design/seller-organization-setup.md`).
 * React Hook Form over the shared contract schema; the Server Action arrives as a prop so the
 * form is component-testable, exactly like the auth forms.
 */
export const CreateOrganizationForm = ({
  action,
}: {
  readonly action: (input: CreateOrganizationRequest) => Promise<CreateOrganizationFailure>;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateOrganizationRequest>({
    resolver: standardSchemaResolver(createOrganizationRequestSchema),
    mode: 'onBlur',
  });

  const [failure, setFailure] = useState<CreateOrganizationFailure | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const onSubmit = handleSubmit((values) => {
    setFailure(undefined);
    startTransition(async () => {
      setFailure(await action(values));
    });
  });

  return (
    <form
      noValidate
      aria-label="Set up your seller organization"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className="flex flex-col gap-4"
    >
      {failure?.formError === undefined ? null : <FormErrorBanner message={failure.formError} />}

      <Field
        label="Organization name"
        required
        error={errors.name?.message ?? failure?.fieldErrors?.name}
        hint="What buyers see on every listing and order."
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            {...register('name')}
            autoComplete="organization"
            placeholder="Nordic Refurb AB"
            disabled={isPending}
          />
        )}
      </Field>

      <Field
        label="Description"
        error={errors.description?.message ?? failure?.fieldErrors?.description}
        hint="Optional. A line or two about your business; buyers will see it on your listings later."
      >
        {(fieldProps) => (
          <Textarea {...fieldProps} {...register('description')} rows={3} disabled={isPending} />
        )}
      </Field>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending}
        aria-busy={isPending || undefined}
      >
        {isPending ? 'Creating organization…' : 'Create organization'}
      </Button>
    </form>
  );
};
