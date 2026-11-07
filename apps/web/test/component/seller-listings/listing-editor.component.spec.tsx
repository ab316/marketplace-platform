import type { UpdateListingRequest } from '@acme/api-contracts';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ListingEditor } from '../../../src/features/seller-listings/components/listing-editor.tsx';
import type {
  PublishFailure,
  SaveFailure,
  SaveResult,
} from '../../../src/features/seller-listings/types.ts';
import { emptyDraft, readyDraft } from '../../msw/listing-fixtures.ts';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn<() => void>() }) }));

type Create = (input: UpdateListingRequest) => Promise<SaveFailure>;
type Save = (input: UpdateListingRequest) => Promise<SaveResult>;
type Publish = () => Promise<PublishFailure>;

const readiness = () => screen.getByRole('region', { name: /missing|ready|saved/i });

describe('ListingEditor (UC-005, UC-007, UC-008)', () => {
  it('saves an incomplete new listing, sending empty fields as null', async () => {
    const createAction = vi.fn<Create>().mockResolvedValue({});
    const user = userEvent.setup();
    render(<ListingEditor createAction={createAction} />);

    expect(within(readiness()).getByText('Not saved yet')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Title'), 'Half done');
    await user.type(screen.getByLabelText('Price'), '7990');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => {
      expect(createAction).toHaveBeenCalledOnce();
    });
    expect(createAction.mock.calls[0]?.[0]).toMatchObject({
      title: 'Half done',
      description: null,
      priceMinor: 799_000,
      quantityTotal: null,
      specifications: { brand: null },
    });
  });

  it('refuses a malformed value on its field without calling the action', async () => {
    const createAction = vi.fn<Create>();
    const user = userEvent.setup();
    render(<ListingEditor createAction={createAction} />);

    await user.type(screen.getByLabelText('Battery health floor'), '120');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByLabelText('Battery health floor')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(createAction).not.toHaveBeenCalled();
  });

  it('puts server issues on their fields, mapping priceMinor to the kronor field', async () => {
    const saveAction = vi.fn<Save>().mockResolvedValue({
      ok: false,
      fieldErrors: { priceKronor: 'Price must be greater than zero.' },
    });
    const user = userEvent.setup();
    render(
      <ListingEditor
        draft={readyDraft()}
        saveAction={saveAction}
        publishAction={vi.fn<Publish>()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Price must be greater than zero.')).toBeInTheDocument();
    expect(screen.getByLabelText('Price')).toHaveAttribute('aria-invalid', 'true');
  });

  it('updates readiness from the saved draft and shows the save time', async () => {
    const saveAction = vi.fn<Save>().mockResolvedValue({ ok: true, draft: readyDraft() });
    const user = userEvent.setup();
    render(
      <ListingEditor
        draft={emptyDraft({ title: 'Almost there' })}
        saveAction={saveAction}
        publishAction={vi.fn<Publish>()}
      />
    );
    expect(within(readiness()).getByText('15 details missing')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Model'), 'X');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Ready to publish')).toBeInTheDocument();
    expect(screen.getByText(/^Saved at /)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
  });

  it('only offers publishing for a ready draft with no unsaved changes', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <ListingEditor
        draft={emptyDraft()}
        saveAction={vi.fn<Save>()}
        publishAction={vi.fn<Publish>()}
      />
    );
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByText('Complete the details above to publish.')).toBeInTheDocument();
    unmount();

    render(
      <ListingEditor
        draft={readyDraft()}
        saveAction={vi.fn<Save>()}
        publishAction={vi.fn<Publish>()}
      />
    );
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    await user.type(screen.getByLabelText('Title'), '!');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByText('Save your changes before publishing.')).toBeInTheDocument();
  });

  it('confirms before publishing, and shows the server issues when publishing is refused', async () => {
    const publishAction = vi.fn<Publish>().mockResolvedValue({
      issues: [{ path: 'condition.knownDefects', message: 'Required to publish.' }],
    });
    const user = userEvent.setup();
    render(
      <ListingEditor
        draft={readyDraft()}
        saveAction={vi.fn<Save>()}
        publishAction={publishAction}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Publish' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Publish this listing?' });
    // The safe choice takes initial focus.
    expect(within(dialog).getByRole('button', { name: 'Keep editing' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(publishAction).toHaveBeenCalledOnce();
    expect(screen.getByText('Some details are missing or invalid.')).toBeInTheDocument();
    expect(within(readiness()).getByRole('link', { name: 'Known defects' })).toBeInTheDocument();
  });

  it('moves focus to a field from its readiness link', async () => {
    const user = userEvent.setup();
    render(
      <ListingEditor
        draft={emptyDraft()}
        saveAction={vi.fn<Save>()}
        publishAction={vi.fn<Publish>()}
      />
    );

    await user.click(within(readiness()).getByRole('link', { name: 'Battery health floor' }));

    expect(screen.getByLabelText('Battery health floor')).toHaveFocus();
  });

  it('stops editing when another member published the listing first', async () => {
    const saveAction = vi.fn<Save>().mockResolvedValue({ ok: false, blocked: 'published' });
    const user = userEvent.setup();
    render(
      <ListingEditor
        draft={readyDraft()}
        saveAction={saveAction}
        publishAction={vi.fn<Publish>()}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText(/published by another member/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View listing' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  });

  it('marks a pre-list brand as not on the list', () => {
    render(
      <ListingEditor
        draft={readyDraft({
          specifications: { ...readyDraft().specifications, brand: 'Commodore' },
        })}
        saveAction={vi.fn<Save>()}
        publishAction={vi.fn<Publish>()}
      />
    );

    expect(screen.getByRole('option', { name: 'Commodore (not on the list)' })).toBeDisabled();
    expect(screen.getByLabelText('Brand')).toHaveAttribute('aria-invalid', 'true');
  });
});
