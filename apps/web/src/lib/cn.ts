import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge conditional class names, with later Tailwind utilities winning over earlier conflicting
 * ones. This is what lets a component accept a `className` override without `!important`.
 */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
