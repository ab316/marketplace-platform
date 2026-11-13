'use client';

import { useState } from 'react';

import { ConfirmDialog } from '../../../components/feedback/confirm-dialog.tsx';
import { FormErrorBanner } from '../../../components/feedback/form-error-banner.tsx';
import { Button } from '../../../components/ui/button.tsx';
import type { ArchiveFailure } from '../types.ts';

/**
 * Archive with confirmation (UC-009). Secondary, not destructive red: archiving is final but harms
 * nothing (design "User states"). Success and "already archived" redirect from the action.
 */
export const ArchiveListingButton = ({
  action,
}: {
  readonly action: () => Promise<ArchiveFailure>;
}) => {
  const [failure, setFailure] = useState<string | undefined>(undefined);

  return (
    <div className="flex flex-col items-start gap-3">
      {failure === undefined ? null : <FormErrorBanner message={failure} />}
      <ConfirmDialog
        trigger={<Button variant="secondary">Archive listing</Button>}
        title="Archive this listing?"
        description="It leaves the catalogue and takes no new orders. Orders already placed continue as normal. Archiving can't be undone."
        confirmLabel="Archive"
        pendingLabel="Archiving…"
        cancelLabel="Cancel"
        onConfirm={async () => {
          setFailure(undefined);
          const result = await action();
          setFailure(result.formError);
        }}
      />
    </div>
  );
};
