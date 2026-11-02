import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn.ts';

/**
 * Semantic table pieces for comparison-heavy views (REPO_MAP.md §8: tables for operational
 * screens, cards for repeated entities). Real `<table>` markup so screen readers get row and
 * column navigation; callers give every header `scope="col"` and the table a caption.
 */
export const Table = ({ className, ...props }: ComponentProps<'table'>) => (
  <div className="border-border overflow-x-auto rounded-xl border">
    <table className={cn('w-full text-sm', className)} {...props} />
  </div>
);

export const TableHeader = ({ className, ...props }: ComponentProps<'thead'>) => (
  <thead
    className={cn(
      'bg-muted/50 text-muted-foreground text-left text-xs tracking-wide uppercase',
      className
    )}
    {...props}
  />
);

export const TableBody = ({ className, ...props }: ComponentProps<'tbody'>) => (
  <tbody className={cn('divide-border divide-y', className)} {...props} />
);

export const TableRow = ({ className, ...props }: ComponentProps<'tr'>) => (
  <tr className={cn('hover:bg-muted/30', className)} {...props} />
);

export const TableHead = ({ className, ...props }: ComponentProps<'th'>) => (
  <th scope="col" className={cn('px-4 py-3 font-medium', className)} {...props} />
);

export const TableCell = ({ className, ...props }: ComponentProps<'td'>) => (
  <td className={cn('px-4 py-3 align-top', className)} {...props} />
);
