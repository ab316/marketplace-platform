'use client';

import { type ReactElement, useState, useTransition } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog.tsx';

export interface ConfirmDialogProps {
  /** The button that opens the dialog. Focus returns to it when the dialog closes. */
  readonly trigger: ReactElement;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly pendingLabel: string;
  readonly cancelLabel: string;
  /** Runs on confirm. The dialog stays open, with both buttons disabled, until it settles. */
  readonly onConfirm: () => Promise<void>;
}

/**
 * The publish and archive confirmations (design "Key components"). The safe choice comes first,
 * so it takes initial focus. A step that succeeds navigates away; one that fails closes the
 * dialog and lets the page show why.
 */
export const ConfirmDialog = ({
  trigger,
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel,
  onConfirm,
}: ConfirmDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={(next) => (isPending ? undefined : setOpen(next))}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            aria-busy={isPending || undefined}
            onClick={(event) => {
              // Keep the dialog open while the step runs; it closes on failure below.
              event.preventDefault();
              startTransition(async () => {
                await onConfirm();
                setOpen(false);
              });
            }}
          >
            {isPending ? pendingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
