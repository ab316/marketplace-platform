import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn.ts';

/**
 * Loading placeholder. `aria-hidden` because the surrounding region announces the loading state;
 * announcing every shimmering block would be noise.
 */
export const Skeleton = ({ className, ...props }: ComponentProps<'div'>) => (
  <div
    aria-hidden="true"
    className={cn('bg-muted animate-pulse rounded-md', className)}
    {...props}
  />
);
