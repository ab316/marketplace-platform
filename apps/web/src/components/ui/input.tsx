import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn.ts';

/**
 * Text input primitive.
 *
 * Deliberately has no built-in label: every control needs a programmatic label (REPO_MAP.md §8),
 * and pairing it here would tempt callers to skip the association. Use `<Field>`.
 */
export const Input = ({ className, type = 'text', ...props }: ComponentProps<'input'>) => (
  <input
    type={type}
    className={cn(
      'bg-surface text-foreground h-10 w-full rounded-lg border border-input px-3 text-sm',
      'placeholder:text-muted-foreground transition-colors',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'aria-[invalid=true]:border-danger',
      className
    )}
    {...props}
  />
);
