import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SignUpForm } from '../../../src/features/auth/components/sign-up-form.tsx';
import type { AuthActionFailure } from '../../../src/features/auth/types.ts';

type SignUpAction = (input: unknown, next?: string) => Promise<AuthActionFailure>;

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/Display name/), 'Kim Larsson');
  await user.type(screen.getByLabelText(/Email/), 'kim@example.com');
  await user.type(screen.getByLabelText(/Password/), 'a-long-password');
};

describe('SignUpForm', () => {
  it('rejects a too-short password with the contract schema before calling the action', async () => {
    const action = vi.fn<SignUpAction>();
    const user = userEvent.setup();
    render(<SignUpForm action={action} />);

    await user.type(screen.getByLabelText(/Display name/), 'Kim Larsson');
    await user.type(screen.getByLabelText(/Email/), 'kim@example.com');
    await user.type(screen.getByLabelText(/Password/), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(screen.getByLabelText(/Password/)).toHaveAttribute('aria-invalid', 'true');
    expect(action).not.toHaveBeenCalled();
  });

  it('renders an email-already-registered failure on the email field (UC-002 E1)', async () => {
    const action = vi.fn<SignUpAction>().mockResolvedValue({
      fieldErrors: { email: 'That email address is already registered — sign in instead.' },
    });
    const user = userEvent.setup();
    render(<SignUpForm action={action} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true');
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/already registered/);
  });

  it('disables the form while the action is pending, spanning sign-up and the chained sign-in', async () => {
    const action = vi.fn<SignUpAction>().mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<SignUpForm action={action} />);

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    const button = await screen.findByRole('button', { name: 'Creating account…' });
    expect(button).toBeDisabled();
  });

  it('tells sellers there is no separate account type (PD-0003)', () => {
    render(<SignUpForm action={vi.fn<SignUpAction>()} />);

    expect(screen.getByText(/Selling on Acme Tech\?/)).toBeInTheDocument();
    expect(screen.getByText(/seller organization/)).toBeInTheDocument();
  });
});
