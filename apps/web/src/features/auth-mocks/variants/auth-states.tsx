import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card.tsx';
import { SignInFormMock, SignUpFormMock } from '../components/auth-forms.tsx';

/**
 * Every state the real forms must handle, rendered side by side. Layout directions are argued
 * about; these are not — each one traces to UC-002 or to the contract schemas, and showing them
 * here means none gets invented (or forgotten) during implementation.
 */

type StateExhibit = {
  readonly title: string;
  readonly trigger: string;
  readonly form: React.ReactNode;
};

const SIGN_IN_HREF = '/mocks/auth/focused/sign-in' as const;
const SIGN_UP_HREF = '/mocks/auth/focused/sign-up' as const;

const signInStates: readonly StateExhibit[] = [
  {
    title: 'Idle',
    trigger: 'The page as it loads.',
    form: <SignInFormMock signUpHref={SIGN_UP_HREF} />,
  },
  {
    title: 'Invalid credentials',
    trigger:
      'Unknown email or wrong password — deliberately the same message for both (UC-002 E2), as a banner rather than a field error so nothing leaks which part failed. The email stays filled.',
    form: (
      <SignInFormMock
        emailValue="kim@example.com"
        formError="Invalid email or password."
        signUpHref={SIGN_UP_HREF}
      />
    ),
  },
  {
    title: 'Rate limited',
    trigger:
      'Too many attempts from this account or source (UC-002 E3; the backend answers 429). Distinct from invalid credentials: the fix is waiting, not retyping.',
    form: (
      <SignInFormMock
        emailValue="kim@example.com"
        formError="Too many attempts. Wait a minute, then try again."
        signUpHref={SIGN_UP_HREF}
      />
    ),
  },
  {
    title: 'Pending',
    trigger:
      'Between submit and the response: controls disabled, the button says what is happening.',
    form: <SignInFormMock emailValue="kim@example.com" pending signUpHref={SIGN_UP_HREF} />,
  },
];

const signUpStates: readonly StateExhibit[] = [
  {
    title: 'Idle',
    trigger: 'The page as it loads, including the seller note (PD-0003: no seller account type).',
    form: <SignUpFormMock signInHref={SIGN_IN_HREF} />,
  },
  {
    title: 'Field validation',
    trigger:
      'Client-side, from the same Zod schemas the backend validates with (packages/api-contracts), so the messages cannot drift. Each error sits on its field.',
    form: (
      <SignUpFormMock
        displayNameValue=" "
        emailValue="kim@example"
        displayNameError="Enter a display name."
        emailError="Enter a valid email address."
        passwordError="Use at least 10 characters."
        signInHref={SIGN_IN_HREF}
      />
    ),
  },
  {
    title: 'Email already registered',
    trigger:
      'The one backend rejection named in UC-002 E1. A field error on email — unlike sign-in, confirming the account exists is fine here, and the fix is signing in.',
    form: (
      <SignUpFormMock
        displayNameValue="Kim Larsson"
        emailValue="kim@example.com"
        emailError="This email is already registered — sign in instead."
        signInHref={SIGN_IN_HREF}
      />
    ),
  },
  {
    title: 'Pending',
    trigger:
      'Covers sign-up plus the chained sign-in that follows it, so one pending state spans both calls.',
    form: (
      <SignUpFormMock
        displayNameValue="Kim Larsson"
        emailValue="kim@example.com"
        pending
        signInHref={SIGN_IN_HREF}
      />
    ),
  },
];

const ExhibitGrid = ({ exhibits }: { readonly exhibits: readonly StateExhibit[] }) => (
  <ul className="mt-6 grid items-start gap-5 md:grid-cols-2">
    {exhibits.map((exhibit) => (
      <li key={exhibit.title}>
        <Card className="h-full">
          <CardHeader>
            <CardTitle>{exhibit.title}</CardTitle>
            <CardDescription>{exhibit.trigger}</CardDescription>
          </CardHeader>
          <CardContent>{exhibit.form}</CardContent>
        </Card>
      </li>
    ))}
  </ul>
);

export const AuthStatesBoard = () => (
  <Container className="py-12 sm:py-16">
    <div className="max-w-2xl">
      <Badge variant="accent">Mockup · every state, side by side</Badge>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight">Sign-in and sign-up states</h1>
      <p className="text-muted-foreground mt-3">
        The layout directions argue about surroundings; this board fixes the behavior inside the
        form. Every exhibit traces to UC-002 or the shared contract schemas. Success has no exhibit
        because it has no UI: the user is redirected with the session cookie set.
      </p>
    </div>

    <h2 className="mt-12 text-xl font-semibold tracking-tight">Sign in</h2>
    <ExhibitGrid exhibits={signInStates} />

    <h2 className="mt-12 text-xl font-semibold tracking-tight">Sign up</h2>
    <ExhibitGrid exhibits={signUpStates} />
  </Container>
);
