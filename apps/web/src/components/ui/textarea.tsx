import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn.ts';

/**
 * Multi-line text primitive, the plain-text sibling of `Input`.
 *
 * Deliberately has no built-in label: every control needs a programmatic label (REPO_MAP.md §8),
 * and pairing it here would tempt callers to skip the association. Use `<Field>`.
 */
export const Textarea = ({ className, ...props }: ComponentProps<'textarea'>) => (
  <textarea
    className={cn(
      'bg-surface text-foreground min-h-24 w-full rounded-lg border border-input px-3 py-2 text-sm',
      'placeholder:text-muted-foreground transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'aria-[invalid=true]:border-danger',
      className
    )}
    {...props}
  />
);
