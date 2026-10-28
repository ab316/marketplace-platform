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
    .default('http://localhost:3000'),

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
