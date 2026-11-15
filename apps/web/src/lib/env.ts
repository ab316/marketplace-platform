import 'server-only';
import { z } from 'zod';

/**
 * Server-side configuration, validated once at first use so a missing variable fails loudly at
 * startup instead of as a confusing runtime error inside a request.
 *
 * `server-only` makes importing this from a Client Component a build error. Nothing here may ever
 * be prefixed `NEXT_PUBLIC_`: the backend URL is internal, and provider secrets (ADR-012) must
 * never approach the browser bundle.
 */
const serverEnvSchema = z.object({
  /** Base URL of the Fastify backend, reachable from the Next.js server. No trailing slash. */
  BACKEND_API_URL: z
    .url()
    .transform((value) => value.replace(/\/+$/, ''))
    .default('http://localhost:4000'),

  /**
   * Name of the httpOnly session cookie (ADR-011). Browsers scope cookies by host, not port, so two
   * local stacks on `localhost` sharing one name overwrite each other's session; `pnpm env:init`
   * gives each git worktree its own. Production keeps the default.
   */
  SESSION_COOKIE_NAME: z
    .string()
    .regex(/^[A-Za-z0-9_]{1,64}$/, 'letters, digits, and underscores only (at most 64)')
    .refine((value) => !value.startsWith('__'), 'the __Host- and __Secure- prefixes are reserved')
    .default('marketplace_session'),

  /** Controls the `Secure` cookie attribute and error verbosity. */
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export const serverEnv = (): ServerEnv => {
  if (cached === undefined) {
    const parsed = serverEnvSchema.safeParse(process.env);

    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`Invalid server environment configuration — ${issues}`);
    }

    cached = parsed.data;
  }

  return cached;
};

export const isProduction = (): boolean => serverEnv().NODE_ENV === 'production';

export const sessionCookieName = (): string => serverEnv().SESSION_COOKIE_NAME;
