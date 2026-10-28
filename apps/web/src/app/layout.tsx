import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { SiteFooter } from '../components/layout/site-footer.tsx';
import { SiteHeader } from '../components/layout/site-header.tsx';

import '../styles/globals.css';
import { Providers } from './providers.tsx';

export const metadata: Metadata = {
  title: {
    default: 'Marketplace — refurbished computers, bought with confidence',
    template: '%s · Marketplace',
  },
  description:
    'A trust-centered marketplace for refurbished computers: escrowed payments, verified sellers, and a complete record of every order.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbf9' },
    { media: '(prefers-color-scheme: dark)', color: '#101512' },
  ],
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  // `suppressHydrationWarning` is required by next-themes, which sets the theme class on <html>
  // before React hydrates so there is no flash of the wrong theme.
  <html lang="en" suppressHydrationWarning>
    <body className={`${GeistSans.variable} ${GeistMono.variable} flex min-h-dvh flex-col`}>
      <Providers>
        {/* First tab stop: lets keyboard users bypass the header navigation. */}
        <a
          href="#main"
          className="bg-surface text-foreground focus:ring-ring sr-only rounded-md px-4 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </Providers>
    </body>
  </html>
);

export default RootLayout;
