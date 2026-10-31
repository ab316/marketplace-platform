/**
 * Public surface of the sign-in/sign-up mockups. Routes import from here; nothing reaches into
 * the folder's internals. When a direction is chosen, the winner graduates into a real `auth`
 * feature module (Server Actions per ADR-011) and this whole folder is deleted.
 */
export {
  authMockDirections,
  authMockPages,
  authStatesMock,
  type AuthMockDirection,
} from './mock-routes.ts';
export { AuthMockSwitcher } from './components/auth-mock-switcher.tsx';
export { FocusedSignIn, FocusedSignUp } from './variants/focused-auth.tsx';
export { SplitSignIn, SplitSignUp } from './variants/split-auth.tsx';
export { AuthStatesBoard } from './variants/auth-states.tsx';
