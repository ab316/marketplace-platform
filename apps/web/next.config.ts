import type { NextConfig } from 'next';

/**
 * Security headers applied to every response. The backend sets its own via @fastify/helmet;
 * these cover the documents the browser loads from the web app itself.
 *
 * A Content-Security-Policy is deliberately absent: Next.js needs a per-request nonce for its
 * inline bootstrap scripts, so a correct CSP belongs in middleware alongside real feature work
 * rather than as a static header that would either break hydration or be too loose to help.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // The workspace package ships TypeScript source with explicit .ts import specifiers
  // (see packages/api-contracts), so Next must compile it rather than treat it as pre-built.
  transpilePackages: ['@acme/api-contracts'],

  typedRoutes: true,

  // Never silence this: a type error must fail the build, not reach production.
  typescript: { ignoreBuildErrors: false },

  headers: () => Promise.resolve([{ source: '/:path*', headers: securityHeaders }]),
};

export default nextConfig;
