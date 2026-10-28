import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn.ts';

/**
 * A bordered surface. Depth comes from the hairline border, not a drop shadow — `elevated` adds
 * only a very soft lift for genuinely floating content.
 *
 * Use for repeated entities, not as the default page layout (REPO_MAP.md §8).
 */
export const Card = ({
  className,
  elevated = false,
  ...props
}: ComponentProps<'div'> & { elevated?: boolean }) => (
  <div
    className={cn(
      'bg-surface text-surface-foreground rounded-xl border border-border',
      elevated ? 'shadow-raised' : 'shadow-subtle',
      className
    )}
    {...props}
  />
);

export const CardHeader = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('flex flex-col gap-1.5 p-6 pb-0', className)} {...props} />
);

export const CardTitle = ({ className, ...props }: ComponentProps<'h3'>) => (
  <h3 className={cn('text-base font-semibold', className)} {...props} />
);

export const CardDescription = ({ className, ...props }: ComponentProps<'p'>) => (
  <p className={cn('text-muted-foreground text-sm', className)} {...props} />
);

export const CardContent = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('p-6', className)} {...props} />
);

export const CardFooter = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('flex items-center gap-3 p-6 pt-0', className)} {...props} />
);
