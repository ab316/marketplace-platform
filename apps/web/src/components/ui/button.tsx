import { Slot } from '@radix-ui/react-slot';
import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn.ts';

/**
 * Design-system primitive: no product or business knowledge (REPO_MAP.md §3).
 *
 * `asChild` renders the caller's element (typically a `next/link`) with these styles, so a
 * navigation control stays a real anchor — keyboard and screen-reader behaviour come from the
 * correct element rather than from added handlers.
 */
const buttonVariants = cva(
  cn(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg',
    'font-medium transition-colors duration-150',
    'disabled:pointer-events-none disabled:opacity-50',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"
  ),
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-subtle',
        secondary: 'bg-surface text-foreground border border-border hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        danger: 'bg-danger text-danger-foreground hover:opacity-90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export const Button = ({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) => {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      // Buttons default to `submit` in HTML, which silently submits enclosing forms.
      {...(asChild ? {} : { type: type ?? 'button' })}
      {...props}
    />
  );
};

export { buttonVariants };
