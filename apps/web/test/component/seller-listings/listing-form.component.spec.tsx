import type { CreateListingRequest } from '@acme/api-contracts';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ListingForm } from '../../../src/features/seller-listings/components/listing-form.tsx';
import { toListingFormValues } from '../../../src/features/seller-listings/form-schema.ts';
import type { ListingActionFailure } from '../../../src/features/seller-listings/types.ts';
import { makeListing } from '../../fixtures/listing.ts';

type Action = (input: CreateListingRequest) => Promise<ListingActionFailure>;

/**
 * The listing form's states (design contract `/seller/listings/new` and `/edit`): blank, field
 * errors with focus on the first, pending, pre-filled for edit, and the form-level banner.
 */

const fillValidListing = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText(/^Title/), 'ThinkPad T14 Gen 3');
  await user.type(screen.getByLabelText(/^Description/), 'Off-lease, refurbished.');
  await user.type(screen.getByLabelText(/^Brand/), 'Lenovo');
  await user.type(screen.getByLabelText(/^Model/), 'ThinkPad T14 Gen 3');
  await user.type(screen.getByLabelText(/^Processor/), 'Ryzen 5 PRO 6650U');
  await user.type(screen.getByLabelText(/^Memory/), '16');
  await user.selectOptions(screen.getByLabelText(/^Storage type/), 'nvme');
  await user.type(screen.getByLabelText(/^Storage \(GB\)/), '256');
  await user.type(screen.getByLabelText(/^Screen size/), '14');
  await user.selectOptions(screen.getByLabelText(/^Condition grade/), 'B');
  await user.type(screen.getByLabelText(/^Battery health/), '85');
  await user.type(screen.getByLabelText(/^Known defects/), 'none');
  await user.type(screen.getByLabelText(/^Price/), '7 490');
  await user.type(screen.getByLabelText(/^Quantity/), '12');
  await user.type(screen.getByLabelText(/^Fulfillment/), 'Ships in 2 days.');
};

describe('ListingForm', () => {
  it('says every field is required to save and offers the curated brands as suggestions', () => {
    render(<ListingForm mode="new" cancelHref="/seller/listings" action={vi.fn<Action>()} />);

    expect(screen.getByText(/Every field is required to save a draft/)).toBeInTheDocument();
    const brand = screen.getByLabelText(/^Brand/);
    const listId = brand.getAttribute('list');
    expect(listId).not.toBeNull();
    const datalist = document.getElementById(listId ?? '');
    expect(datalist?.querySelectorAll('option').length).toBeGreaterThan(10);
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/seller/listings'
    );
  });

  it('shows field-level errors, focuses the first, and makes no request on an empty submit', async () => {
    const action = vi.fn<Action>();
    const user = userEvent.setup();
    render(<ListingForm mode="new" cancelHref="/seller/listings" action={action} />);

    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0);
    expect(screen.getByLabelText(/^Title/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Price/)).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => {
      expect(screen.getByLabelText(/^Title/)).toHaveFocus();
    });
    expect(action).not.toHaveBeenCalled();
  });

  it('marks both cycle bounds invalid when only one is given', async () => {
    const action = vi.fn<Action>();
    const user = userEvent.setup();
    render(<ListingForm mode="new" cancelHref="/seller/listings" action={action} />);

    await fillValidListing(user);
    await user.type(screen.getByLabelText(/^Battery cycles, from/), '150');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Enter both bounds or leave both empty.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Battery cycles, from/)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText(/^Battery cycles, to/)).toHaveAttribute('aria-invalid', 'true');
    expect(action).not.toHaveBeenCalled();
  });

  it('submits the contract-shaped request with the price in öre', async () => {
    const action = vi.fn<Action>().mockResolvedValue({});
    const user = userEvent.setup();
    render(<ListingForm mode="new" cancelHref="/seller/listings" action={action} />);

    await fillValidListing(user);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => {
      expect(action).toHaveBeenCalledTimes(1);
    });
    const request = action.mock.calls[0]?.[0];
    expect(request?.title).toBe('ThinkPad T14 Gen 3');
    expect(request?.priceMinor).toBe(749_000);
    expect(request?.currency).toBe('SEK');
    expect(request?.quantityTotal).toBe(12);
    expect(request?.specifications.storageType).toBe('nvme');
    expect(request?.specifications.ramGb).toBe(16);
    expect(request?.condition.grade).toBe('B');
    expect(request?.condition.guarantees).toEqual({ batteryHealthMinPercent: 85 });
  });

  it('shows the form-level banner the action returns and keeps the typed values', async () => {
    const action = vi.fn<Action>().mockResolvedValue({
      formError: 'This organization is deactivated and cannot be changed.',
    });
    const user = userEvent.setup();
    render(<ListingForm mode="new" cancelHref="/seller/listings" action={action} />);

    await fillValidListing(user);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/deactivated/);
    expect(screen.getByLabelText(/^Title/)).toHaveValue('ThinkPad T14 Gen 3');
  });

  it('disables the controls and renames the button while pending', async () => {
    const action = vi.fn<Action>().mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<ListingForm mode="new" cancelHref="/seller/listings" action={action} />);

    await fillValidListing(user);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    const button = await screen.findByRole('button', { name: 'Saving draft…' });
    expect(button).toBeDisabled();
    expect(screen.getByLabelText(/^Title/)).toBeDisabled();
  });

  it('pre-fills every field for edit and labels the submit accordingly', () => {
    const listing = makeListing({ price: { amountMinor: 749_050, currency: 'SEK' } });
    render(
      <ListingForm
        mode="edit"
        defaultValues={toListingFormValues(listing)}
        cancelHref="/seller/listings/lst_1"
        action={vi.fn<Action>()}
      />
    );

    expect(screen.getByRole('form', { name: 'Edit listing' })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Title/)).toHaveValue(listing.title);
    expect(screen.getByLabelText(/^Price/)).toHaveValue('7490.50');
    expect(screen.getByLabelText(/^Storage type/)).toHaveValue('nvme');
    expect(screen.getByLabelText(/^Battery cycles, to/)).toHaveValue('400');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });
});
