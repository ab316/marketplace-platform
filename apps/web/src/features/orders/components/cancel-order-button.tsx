'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ConfirmDialog } from '../../../components/feedback/confirm-dialog.tsx';
import { FormErrorBanner } from '../../../components/feedback/form-error-banner.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { cancelOrderAction } from '../actions.ts';

/**
 * UC-013 C1: cancelling is final and the unit goes straight back on sale, so it sits behind a
 * confirmation. Success refreshes the page into its cancelled state — the page itself is the
 * feedback; a refusal (already resolved, payment in progress) is shown inline and the refresh
 * brings the true current state (UC-013 A1/A2).
 */
export const CancelOrderButton = ({ orderId }: { readonly orderId: string }) => {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      {message !== null && <FormErrorBanner message={message} />}
      <ConfirmDialog
        trigger={
          <Button variant="secondary" className="text-danger w-full">
            Cancel this order
          </Button>
        }
        title="Cancel this order?"
        description="Cancelling is final: the unit goes straight back on sale and this order can never be paid or revived. Nothing has been charged."
        confirmLabel="Cancel the order"
        pendingLabel="Cancelling…"
        cancelLabel="Keep the order"
        onConfirm={async () => {
          const result = await cancelOrderAction({ orderId });
          setMessage(result.ok ? null : (result.message ?? null));
          router.refresh();
        }}
      />
      <p className="text-muted-foreground text-xs">
        Cancelling is final: the unit goes straight back on sale. Nothing has been paid.
      </p>
    </div>
  );
};
