'use client';

import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn.ts';
import { buttonVariants } from './button.tsx';

/**
 * Confirmation for a consequential step (shadcn/ui `AlertDialog` over Radix, ADR-010).
 *
 * Radix supplies what REPO_MAP.md §8 asks of a modal: focus is trapped while open and returned to
 * the trigger on close, Esc closes, and the dialog is labelled by its title and described by its
 * description. It never closes on an outside click, because the user must choose.
 */
export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

export const AlertDialogContent = ({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Content>) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40" />
    <AlertDialogPrimitive.Content
      className={cn(
        'bg-surface text-surface-foreground border-border shadow-raised fixed top-1/2 left-1/2 z-50',
        'flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4',
        'rounded-xl border p-6',
        className
      )}
      {...props}
    />
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
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
);

export const AlertDialogFooter = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
    {...props}
  />
);

/** The safe choice. Put it first in the footer so it receives initial focus. */
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
  <AlertDialogPrimitive.Action className={cn(buttonVariants(), className)} {...props} />
);
