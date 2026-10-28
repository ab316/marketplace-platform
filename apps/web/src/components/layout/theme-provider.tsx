'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

/**
 * Client boundary for theming only (ADR-010). It wraps the tree but renders no markup of its own,
 * so children passed from a Server Component stay server-rendered.
 */
export const ThemeProvider = ({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) => (
  <NextThemesProvider {...props}>{children}</NextThemesProvider>
);
