'use client';

import { type SignUpRequest, signUpRequestSchema } from '@acme/api-contracts';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Store } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';

import { FormErrorBanner } from '../../../components/feedback/form-error-banner.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Field } from '../../../components/ui/field.tsx';
import { Input } from '../../../components/ui/input.tsx';
import type { AuthActionFailure } from '../types.ts';

/**
 * The sign-up form. One account for buyers and sellers alike — there is deliberately no account
 * type to choose (PD-0003: a buyer is a user with no organization), and the note below the button
 * says so for anyone hunting for a business-registration toggle.
 *
 * On success the action signs the new account in and redirects, so the pending state spans both
 * backend calls.
 */
export const SignUpForm = ({
  action,
  next,
}: {
  readonly action: (input: SignUpRequest, next?: string) => Promise<AuthActionFailure>;
  readonly next?: string | undefined;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpRequest>({
    resolver: standardSchemaResolver(signUpRequestSchema),
    mode: 'onBlur',
  });

  const [failure, setFailure] = useState<AuthActionFailure | undefined>(undefined);
  const [isPending, startTransition] = useTransition();

  const onSubmit = handleSubmit((values) => {
    setFailure(undefined);
    startTransition(async () => {
      setFailure(await action(values, next));
    });
  });

  return (
    <form
      noValidate
      aria-label="Create an account"
      onSubmit={(event) => {
        void onSubmit(event);
      }}
      className="flex flex-col gap-4"
    >
      {failure?.formError === undefined ? null : <FormErrorBanner message={failure.formError} />}

      <Field
        label="Display name"
        required
        error={errors.displayName?.message ?? failure?.fieldErrors?.displayName}
        hint="Shown to sellers on your orders."
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            {...register('displayName')}
            autoComplete="name"
            placeholder="Kim Larsson"
            disabled={isPending}
          />
        )}
      </Field>

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
        hint="At least 10 characters."
      >
        {(fieldProps) => (
          <Input
            {...fieldProps}
            {...register('password')}
            type="password"
            autoComplete="new-password"
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
        {isPending ? 'Creating account…' : 'Create account'}
      </Button>

      <div className="bg-muted/60 text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs">
        <Store className="text-foreground mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          <span className="text-foreground font-medium">Selling on Acme Tech?</span> Create your
          personal account first — you set up your seller organization right after.
        </span>
      </div>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{' '}
        <Link
          href={{ pathname: '/sign-in', query: next === undefined ? {} : { next } }}
          className="text-primary font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
};
