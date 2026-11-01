import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CreateOrganizationForm } from '../../../src/features/seller-organization/components/create-organization-form.tsx';
import type { CreateOrganizationFailure } from '../../../src/features/seller-organization/types.ts';

type CreateAction = (input: unknown) => Promise<CreateOrganizationFailure>;

describe('CreateOrganizationForm', () => {
  it('rejects an empty name with the contract schema before calling the action', async () => {
    const action = vi.fn<CreateAction>();
    const user = userEvent.setup();
    render(<CreateOrganizationForm action={action} />);

    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(screen.getByLabelText(/Organization name/)).toHaveAttribute('aria-invalid', 'true');
    expect(action).not.toHaveBeenCalled();
  });

  it('submits name and optional description to the action', async () => {
    const action = vi.fn<CreateAction>().mockResolvedValue({});
    const user = userEvent.setup();
    render(<CreateOrganizationForm action={action} />);

    await user.type(screen.getByLabelText(/Organization name/), 'Nordic Refurb AB');
    await user.type(screen.getByLabelText(/Description/), 'Laptops from Malmö');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Nordic Refurb AB', description: 'Laptops from Malmö' })
      );
    });
  });

  it('shows a form-level banner for a rate-limited or failed submit', async () => {
    const action = vi.fn<CreateAction>().mockResolvedValue({
      formError: 'Too many attempts. Wait a minute, then try again.',
    });
    const user = userEvent.setup();
    render(<CreateOrganizationForm action={action} />);

    await user.type(screen.getByLabelText(/Organization name/), 'Nordic Refurb AB');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Too many attempts/);
  });

  it('disables the controls while the action is pending', async () => {
    const action = vi.fn<CreateAction>().mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<CreateOrganizationForm action={action} />);

    await user.type(screen.getByLabelText(/Organization name/), 'Nordic Refurb AB');
    await user.click(screen.getByRole('button', { name: 'Create organization' }));

    const button = await screen.findByRole('button', { name: 'Creating organization…' });
    expect(button).toBeDisabled();
    expect(screen.getByLabelText(/Organization name/)).toBeDisabled();
  });
});
