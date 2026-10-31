import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SignInForm } from '../../../src/features/auth/components/sign-in-form.tsx';
import type { AuthActionFailure } from '../../../src/features/auth/types.ts';

type SignInAction = (input: unknown, next?: string) => Promise<AuthActionFailure>;

/**
 * User-visible behavior of the sign-in form (REPO_MAP.md §11): what blocks a submit, what a
 * failure looks like, and that failures stay generic (UC-002 E2). The Server Action is a plain
 * async stub — the real action's behavior is owned by the auth-actions integration test.
 */
describe('SignInForm', () => {
  it('validates with the contract schema before calling the action', async () => {
    const action = vi.fn<SignInAction>();
    const user = userEvent.setup();
    render(<SignInForm action={action} />);

    await user.type(screen.getByLabelText(/Email/), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(action).not.toHaveBeenCalled();
  });

  it('submits the typed credentials and the next path to the action', async () => {
    const action = vi
      .fn<SignInAction>()
      .mockResolvedValue({ formError: 'Invalid email or password.' });
    const user = userEvent.setup();
    render(<SignInForm action={action} next="/orders/123" />);

    await user.type(screen.getByLabelText(/Email/), 'kim@example.com');
    await user.type(screen.getByLabelText(/Password/), 'a-long-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith(
        { email: 'kim@example.com', password: 'a-long-password' },
        '/orders/123'
      );
    });
  });

  it('shows a failure as one generic banner, not a field error', async () => {
    const action = vi
      .fn<SignInAction>()
      .mockResolvedValue({ formError: 'Invalid email or password.' });
    const user = userEvent.setup();
    render(<SignInForm action={action} />);

    await user.type(screen.getByLabelText(/Email/), 'kim@example.com');
    await user.type(screen.getByLabelText(/Password/), 'wrong-password-x');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Invalid email or password.');
    // Neither field is blamed: the inputs stay valid, only the banner reports the failure.
    expect(screen.getByLabelText(/Email/)).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/Password/)).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('disables the form while the action is pending', async () => {
    const action = vi.fn<SignInAction>().mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<SignInForm action={action} />);

    await user.type(screen.getByLabelText(/Email/), 'kim@example.com');
    await user.type(screen.getByLabelText(/Password/), 'a-long-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const button = await screen.findByRole('button', { name: 'Signing in…' });
    expect(button).toBeDisabled();
    expect(screen.getByLabelText(/Email/)).toBeDisabled();
  });

  it('has no dead forgot-password link while reset does not exist (P1-009)', () => {
    render(<SignInForm action={vi.fn<SignInAction>()} />);

    expect(screen.queryByRole('link', { name: /forgot/i })).not.toBeInTheDocument();
    expect(screen.getByText(/contact support/i)).toBeInTheDocument();
  });
});
