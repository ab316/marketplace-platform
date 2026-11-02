'use client';

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn.ts';
import { buttonVariants } from './button.tsx';

/**
 * Confirmation dialog for actions that cannot be undone, on Radix `AlertDialog` (ADR-010).
 *
 * Why AlertDialog rather than Dialog: it renders `role="alertdialog"`, moves focus into the
 * dialog on open and back to the trigger on close, closes on Escape and the Cancel action, and
 * does **not** close on an outside click — the behaviour an irreversible action needs and that
 * hand-rolled dialogs reliably get wrong (REPO_MAP.md §8).
 *
 * Use `AlertDialogCancel` for the safe choice and `AlertDialogAction` for the destructive one;
 * keep Cancel first in reading order so it is also first in focus order.
 */
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export const AlertDialogContent = ({
  className,
  children,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content>) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
    <AlertDialogPrimitive.Content
      className={cn(
        'bg-surface text-surface-foreground border-border shadow-raised fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6',
        className
      )}
      {...props}
    >
      {children}
    </AlertDialogPrimitive.Content>
  </AlertDialogPrimitive.Portal>
);

export const AlertDialogTitle = ({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Title>) => (
  <AlertDialogPrimitive.Title className={cn('text-lg font-semibold', className)} {...props} />
);

export const AlertDialogDescription = ({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) => (
  <AlertDialogPrimitive.Description
    className={cn('text-muted-foreground mt-3 text-sm', className)}
    {...props}
  />
);

export const AlertDialogFooter = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('mt-6 flex justify-end gap-3', className)} {...props} />
);

export const AlertDialogCancel = ({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Cancel>) => (
  <AlertDialogPrimitive.Cancel
    className={cn(buttonVariants({ variant: 'secondary' }), className)}
    {...props}
  />
);

export const AlertDialogAction = ({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Action>) => (
  <AlertDialogPrimitive.Action
    className={cn(buttonVariants({ variant: 'danger' }), className)}
    {...props}
  />
);
