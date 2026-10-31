'use client';

import { type SignInRequest, signInRequestSchema } from '@acme/api-contracts';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { FormErrorBanner } from '../../../components/feedback/form-error-banner.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Field } from '../../../components/ui/field.tsx';
import { Input } from '../../../components/ui/input.tsx';
import type { AuthActionFailure } from '../types.ts';

/**
 * The sign-in form. Validation runs against the same `@acme/api-contracts` schema the backend
 * parses, so the messages cannot drift; the Server Action is passed in by the page, which keeps
 * this component testable with a plain async function.
 *
 * Failures arrive as one generic banner, never a field error — UC-002 E2 forbids revealing
 * whether the email or the password was wrong.
 */
export const SignInForm = ({
  action,
  next,
}: {
  readonly action: (input: SignInRequest, next?: string) => Promise<AuthActionFailure>;
  readonly next?: string | undefined;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInRequest>({
    resolver: standardSchemaResolver(signInRequestSchema),
    mode: 'onBlur',
  });

  const [failure, setFailure] = useState<AuthActionFailure | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const onSubmit = handleSubmit((values) => {
    setFailure(undefined);
    startTransition(async () => {
      // On success the action redirects (throws) and this transition ends with the navigation;
      // only failures come back as values.
      setFailure(await action(values, next));
    });
  });

  return (
    <form
      noValidate
      aria-label="Sign in"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className="flex flex-col gap-4"
    >
      {failure?.formError === undefined ? null : <FormErrorBanner message={failure.formError} />}

      <Field label="Email" required error={errors.email?.message ?? failure?.fieldErrors?.email}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isPending}
          />
        )}
      </Field>

      <Field
        label="Password"
        required
        error={errors.password?.message ?? failure?.fieldErrors?.password}
        // Password reset does not exist yet (backlog P1-009); an honest hint beats a dead link.
        hint="Lost your password? Self-serve reset is coming; until then contact support."
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            {...register('password')}
            type="password"
            autoComplete="current-password"
            disabled={isPending}
          />
        )}
      </Field>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isPending}
        aria-busy={isPending || undefined}
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        New to Acme Tech?{' '}
        <Link
          href={{ pathname: '/sign-up', query: next === undefined ? {} : { next } }}
          className="text-primary font-medium hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
};
