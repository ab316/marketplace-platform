/**
 * Public surface of the auth feature: the UC-002 flows over the web (ADR-011). Routes and the
 * site chrome import from here; nothing reaches into the folder's internals.
 */
export { signInAction, signOutAction, signUpAction } from './actions.ts';
export { SignInForm } from './components/sign-in-form.tsx';
export { SignUpForm } from './components/sign-up-form.tsx';
export { SplitAuthShell } from './components/split-auth-shell.tsx';
export type { AuthActionFailure } from './types.ts';
