import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ArchiveListingButton } from '../../../src/features/seller-listings/components/archive-listing-button.tsx';
import type { ArchiveFailure } from '../../../src/features/seller-listings/types.ts';

describe('ArchiveListingButton (UC-009)', () => {
  it('does nothing until the seller confirms', async () => {
    const action = vi.fn<() => Promise<ArchiveFailure>>();
    const user = userEvent.setup();
    render(<ArchiveListingButton action={action} />);

    await user.click(screen.getByRole('button', { name: 'Archive listing' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Archive this listing?' });
    expect(dialog).toHaveTextContent(/Orders already placed continue as normal/);
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Archive listing' })).toHaveFocus();
  });

  it('shows why archiving failed', async () => {
    const action = vi
      .fn<() => Promise<ArchiveFailure>>()
      .mockResolvedValue({ formError: 'You can no longer archive this listing.' });
    const user = userEvent.setup();
    render(<ArchiveListingButton action={action} />);

    await user.click(screen.getByRole('button', { name: 'Archive listing' }));
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Archive' })
    );

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('You can no longer archive this listing.');
  });
});
