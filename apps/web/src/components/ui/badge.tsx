import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn.ts';

/**
 * Small status label.
 *
 * Colour is never the only signal (REPO_MAP.md §8): a badge always carries text, so a
 * colour-blind or monochrome reader loses nothing. Do not add an icon-only variant.
 */
const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-muted text-muted-foreground border-transparent',
        accent: 'bg-accent text-accent-foreground border-transparent',
        success: 'bg-success/12 text-success border-success/25',
        warning: 'bg-warning/15 text-warning-foreground border-warning/35',
        danger: 'bg-danger/10 text-danger border-danger/25',
        outline: 'text-foreground border-border',
      },
    },
    defaultVariants: { variant: 'neutral' },
  }
);

export type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);

export { badgeVariants };
