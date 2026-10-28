'use client';

import { type SignInRequest, signInRequestSchema } from '@acme/api-contracts';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { useForm } from 'react-hook-form';

import { Button } from '../../components/ui/button.tsx';
import { Field } from '../../components/ui/field.tsx';
import { Input } from '../../components/ui/input.tsx';

/**
 * Sample Client Component showing the form pattern from ADR-010: React Hook Form validating
 * against a schema imported from `@acme/api-contracts` — the same schema the backend validates
 * with, so the two cannot drift.
 *
 * This submits nothing. Real sign-in is a Server Action that sets the session cookie (ADR-011);
 * it arrives with UC-002 in Phase 6.
 */
export const SampleForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful },
  } = useForm<SignInRequest>({
    resolver: standardSchemaResolver(signInRequestSchema),
    mode: 'onBlur',
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void handleSubmit(() => {
          // Intentionally empty: demonstrating validation, not performing authentication.
        })(event);
      }}
      className="flex max-w-sm flex-col gap-4"
    >
      <Field label="Email" required error={errors.email?.message}>
        {(fieldProps) => (
          <Input {...fieldProps} {...register('email')} type="email" autoComplete="email" />
        )}
      </Field>

      <Field
        label="Password"
        required
        hint="At least 10 characters."
        error={errors.password?.message}
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            {...register('password')}
            type="password"
            autoComplete="current-password"
          />
        )}
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit">Validate</Button>
        {isSubmitSuccessful ? (
          <span role="status" className="text-success text-sm font-medium">
            Looks valid.
          </span>
        ) : null}
      </div>
    </form>
  );
};
