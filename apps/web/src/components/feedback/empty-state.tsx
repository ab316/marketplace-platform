import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '../../lib/cn.ts';

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly icon?: LucideIcon;
  readonly action?: ReactNode;
  readonly className?: string;
}

/**
 * The "nothing here yet" state, which REPO_MAP.md §8 treats as part of a feature rather than an
 * afterthought. An empty state should say what would put something here, which is why
 * `description` and `action` exist.
 */
export const EmptyState = ({
  title,
  description,
  icon: Icon,
  action,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      'border-border flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-14 text-center',
      className
    )}
  >
    {Icon !== undefined ? (
      <Icon className="text-muted-foreground size-6" aria-hidden="true" />
    ) : null}
    <div className="flex flex-col gap-1">
      <p className="font-medium">{title}</p>
      {description !== undefined ? (
        <p className="text-muted-foreground max-w-prose text-sm">{description}</p>
      ) : null}
    </div>
    {action}
  </div>
);
