import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ListingDetail } from '../../../src/features/seller-listings/components/listing-detail.tsx';
import type { ListingActionFailure } from '../../../src/features/seller-listings/types.ts';
import { activeListing, archivedListing, makeListing } from '../../fixtures/listing.ts';

type Action = (listingId: string) => Promise<ListingActionFailure>;

/**
 * The detail page's status × canWrite matrix (design contract `/seller/listings/[listingId]`):
 * which actions appear, what the status note says, and the archive dialog (UC-008 W2) — cancel
 * sends nothing, confirm calls the action, a failure shows in the card.
 */

const renderDetail = (
  listing = makeListing(),
  { canWrite = true, publish = vi.fn<Action>(), archive = vi.fn<Action>() } = {}
) => {
  render(
    <ListingDetail
      listing={listing}
      canWrite={canWrite}
      publishAction={publish}
      archiveAction={archive}
    />
  );
  return { publish, archive };
};

const statusCard = () => screen.getByRole('complementary', { name: 'Status and actions' });

describe('ListingDetail', () => {
  it('shows every disclosure in product language', () => {
    renderDetail();

    expect(screen.getByText('Lenovo ThinkPad T14 Gen 3')).toBeInTheDocument();
    expect(screen.getByText('256 GB NVMe')).toBeInTheDocument();
    expect(screen.getByText(/Light wear · cosmetic only/)).toBeInTheDocument();
    expect(screen.getByText('at least 85%')).toBeInTheDocument();
    expect(screen.getByText('150–400')).toBeInTheDocument();
    expect(screen.getByText(/7\s?490\s?kr/)).toBeInTheDocument();
  });

  it('offers Publish and Edit on a draft the member may write', () => {
    const listing = makeListing();
    renderDetail(listing);

    const card = statusCard();
    expect(within(card).getByText('Draft')).toBeInTheDocument();
    expect(within(card).getByText(/Not visible to buyers/)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /Publish listing/ })).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /Edit draft/ })).toHaveAttribute(
      'href',
      `/seller/listings/${listing.id}/edit`
    );
    expect(within(card).queryByRole('button', { name: /Archive/ })).not.toBeInTheDocument();
  });

  it('calls the publish action with the listing id', async () => {
    const listing = makeListing();
    const publish = vi.fn<Action>().mockResolvedValue({});
    const user = userEvent.setup();
    renderDetail(listing, { publish });

    await user.click(screen.getByRole('button', { name: /Publish listing/ }));

    await waitFor(() => {
      expect(publish).toHaveBeenCalledWith(listing.id);
    });
  });

  it('offers only Archive on an active listing and explains why there is no Edit (UC-007 A2)', () => {
    renderDetail(activeListing());

    const card = statusCard();
    expect(within(card).getByText('Active')).toBeInTheDocument();
    expect(
      within(card).getByText(/Visible in the catalogue since 21 October 2026/)
    ).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /View as a buyer/ })).toHaveAttribute(
      'href',
      '/listings?q=ThinkPad%20T14%20Gen%203'
    );
    expect(within(card).getByRole('button', { name: /Archive listing/ })).toBeInTheDocument();
    expect(within(card).queryByRole('link', { name: /Edit/ })).not.toBeInTheDocument();
    expect(within(card).getByText(/Published content can.t be edited/)).toBeInTheDocument();
    expect(within(card).getByText('7')).toBeInTheDocument();
    expect(within(card).getByText('2')).toBeInTheDocument();
    expect(within(card).getByText('3')).toBeInTheDocument();
  });

  it('notes an active listing with no available units is hidden', () => {
    renderDetail(activeListing({ availableQuantity: 0, reservedQuantity: 9, soldQuantity: 3 }));

    expect(screen.getByText(/hidden while no units are available/)).toBeInTheDocument();
  });

  it('shows no actions at all on an archived listing (UC-008 W4)', () => {
    renderDetail(archivedListing());

    const card = statusCard();
    expect(within(card).getByText('Archived')).toBeInTheDocument();
    expect(within(card).getByText(/Withdrawn from sale on 27 October 2026/)).toBeInTheDocument();
    expect(within(card).getByText(/can.t be re-published/)).toBeInTheDocument();
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
    expect(within(card).queryByRole('link')).not.toBeInTheDocument();
  });

  it('hides every write affordance from a member who may not write', () => {
    renderDetail(activeListing(), { canWrite: false });

    const card = statusCard();
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
    expect(
      within(card).getByText(/Your role can view this listing but not change it/)
    ).toBeInTheDocument();
  });

  describe('archive dialog (UC-008 W2)', () => {
    it('opens with the consequences, and Cancel sends nothing', async () => {
      const archive = vi.fn<Action>();
      const user = userEvent.setup();
      renderDetail(activeListing({ title: 'The T14 batch' }), { archive });

      await user.click(screen.getByRole('button', { name: /Archive listing/ }));

      const dialog = await screen.findByRole('alertdialog', { name: 'Archive this listing?' });
      expect(dialog).toHaveTextContent('The T14 batch');
      expect(dialog).toHaveTextContent(/leaves the catalogue/);
      expect(dialog).toHaveTextContent(/2 reserved units and 3 sold stay as they are/);
      expect(dialog).toHaveTextContent(/publish a new listing/);
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();

      await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
      expect(archive).not.toHaveBeenCalled();
    });

    it('confirming calls the archive action with the listing id', async () => {
      const listing = activeListing();
      const archive = vi.fn<Action>().mockResolvedValue({});
      const user = userEvent.setup();
      renderDetail(listing, { archive });

      await user.click(screen.getByRole('button', { name: /Archive listing/ }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Archive listing' }));

      await waitFor(() => {
        expect(archive).toHaveBeenCalledWith(listing.id);
      });
    });

    it('shows a failure from the action in the status card', async () => {
      const archive = vi.fn<Action>().mockResolvedValue({
        formError: 'Too many attempts. Wait a minute, then try again.',
      });
      const user = userEvent.setup();
      renderDetail(activeListing(), { archive });

      await user.click(screen.getByRole('button', { name: /Archive listing/ }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Archive listing' }));

      expect(await within(statusCard()).findByRole('alert')).toHaveTextContent(/Too many attempts/);
    });
  });
});
