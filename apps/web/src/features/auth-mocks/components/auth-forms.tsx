'use client';

import { CircleAlert, Store } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';

import { Button } from '../../../components/ui/button.tsx';
import { Field } from '../../../components/ui/field.tsx';
import { Input } from '../../../components/ui/input.tsx';

/**
 * The form bodies, shared by every direction and by the states board. Both layout directions
 * render exactly these fields, so the comparison between them is about the surroundings — the
 * part actually being decided — and a state shown on the board cannot drift from the form it
 * describes.
 *
 * Static mockups: nothing submits, no handler exists, buttons keep their default `type="button"`.
 * The real forms become Server Actions when this graduates (ADR-011 §3).
 */

/**
 * Sign-in failures are a single generic banner above the form, never a field error: UC-002 E2
 * requires "invalid email or password" to be indistinguishable between the two causes, and
 * attaching it to either field would leak which one was wrong.
 */
export const FormErrorBanner = ({ message }: { readonly message: string }) => (
  <div
    role="alert"
    className="bg-danger/10 border-danger/25 text-danger flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium"
  >
    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <span>{message}</span>
  </div>
);

export type SignInFormState = {
  /** Preserved on failure so the user corrects, not retypes. */
  readonly emailValue?: string;
  /** Generic banner: invalid credentials (E2) or rate-limited (E3). */
  readonly formError?: string;
  readonly pending?: boolean;
};

export const SignInFormMock = ({
  emailValue,
  formError,
  pending = false,
  signUpHref,
}: SignInFormState & { readonly signUpHref: Route }) => (
  <form className="flex flex-col gap-4" aria-label="Sign in">
    {formError === undefined ? null : <FormErrorBanner message={formError} />}

    <Field label="Email" required>
      {(props) => (
        <Input
          {...props}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={emailValue}
          disabled={pending}
        />
      )}
    </Field>

    <Field
      label="Password"
      required
      // Password reset does not exist yet (backlog P1-009), so there is deliberately no
      // "forgot password?" link — a dead link erodes exactly the trust this product sells.
      hint="Lost your password? Self-serve reset is coming; until then contact support."
    >
      {(props) => (
        <Input {...props} type="password" autoComplete="current-password" disabled={pending} />
      )}
    </Field>

    <Button size="lg" className="w-full" disabled={pending} aria-busy={pending || undefined}>
      {pending ? 'Signing in…' : 'Sign in'}
    </Button>

    <p className="text-muted-foreground text-center text-sm">
      New to Acme Tech?{' '}
      <Link href={signUpHref} className="text-primary font-medium hover:underline">
        Create an account
      </Link>
    </p>
  </form>
);

export type SignUpFormState = {
  readonly displayNameValue?: string;
  readonly emailValue?: string;
  readonly displayNameError?: string;
  /** Field error: the one sign-up failure named in UC-002 E1 is "email already registered". */
  readonly emailError?: string;
  readonly passwordError?: string;
  readonly pending?: boolean;
};

export const SignUpFormMock = ({
  displayNameValue,
  emailValue,
  displayNameError,
  emailError,
  passwordError,
  pending = false,
  signInHref,
}: SignUpFormState & { readonly signInHref: Route }) => (
  <form className="flex flex-col gap-4" aria-label="Create an account">
    <Field
      label="Display name"
      required
      error={displayNameError}
      hint="Shown to sellers on your orders."
    >
      {(props) => (
        <Input
          {...props}
          autoComplete="name"
          placeholder="Kim Larsson"
          defaultValue={displayNameValue}
          disabled={pending}
        />
      )}
    </Field>

    <Field label="Email" required error={emailError}>
      {(props) => (
        <Input
          {...props}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={emailValue}
          disabled={pending}
        />
      )}
    </Field>

    <Field label="Password" required error={passwordError} hint="At least 10 characters.">
      {(props) => (
        <Input {...props} type="password" autoComplete="new-password" disabled={pending} />
      )}
    </Field>

    <Button size="lg" className="w-full" disabled={pending} aria-busy={pending || undefined}>
      {pending ? 'Creating account…' : 'Create account'}
    </Button>

    {/* PD-0003: there is no seller account type. Saying so here heads off the person hunting
        for a "register as business" toggle that will never exist. */}
    <div className="bg-muted/60 text-muted-foreground flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs">
      <Store className="text-foreground mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>
        <span className="text-foreground font-medium">Selling on Acme Tech?</span> Create your
        personal account first — you set up your seller organization right after.
      </span>
    </div>

    <p className="text-muted-foreground text-center text-sm">
      Already have an account?{' '}
      <Link href={signInHref} className="text-primary font-medium hover:underline">
        Sign in
      </Link>
    </p>
  </form>
);
