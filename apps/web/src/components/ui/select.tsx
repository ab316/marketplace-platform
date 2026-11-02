import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn.ts';

/**
 * Native `<select>` styled to sit beside `Input`.
 *
 * Native on purpose: the fields that need it so far have three options each, and the browser's
 * own control gives keyboard, screen-reader, and mobile behaviour for free. Reach for a Radix
 * Select only when a field genuinely needs search or grouping.
 *
 * Deliberately has no built-in label: every control needs a programmatic label (REPO_MAP.md §8).
 * Use `<Field>`.
 */
export const Select = ({ className, children, ...props }: ComponentProps<'select'>) => (
  <div className="relative">
    <select
      className={cn(
        'bg-surface text-foreground h-10 w-full appearance-none rounded-lg border border-input pr-9 pl-3 text-sm',
        'transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-danger',
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden="true"
      className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
    />
  </div>
);
