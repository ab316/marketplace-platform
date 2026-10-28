import type { ComponentProps } from 'react';

import { cn } from '../../lib/cn.ts';

/**
 * Horizontal page rhythm. One place to change the maximum line length and gutters, so pages stay
 * aligned without each one re-deciding its own padding.
 */
export const Container = ({
  className,
  width = 'default',
  ...props
}: ComponentProps<'div'> & { width?: 'default' | 'narrow' | 'wide' }) => (
  <div
    className={cn(
      'mx-auto w-full px-4 sm:px-6 lg:px-8',
      width === 'narrow' && 'max-w-3xl',
      width === 'default' && 'max-w-6xl',
      width === 'wide' && 'max-w-7xl',
      className
    )}
    {...props}
  />
);
