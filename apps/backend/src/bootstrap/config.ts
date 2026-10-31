import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const HOUR_IN_MS = 60 * 60 * 1000;
const MINUTE_IN_MS = 60 * 1000;

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('127.0.0.1'),
    // Not 3000: that port collides with nearly every other Node tool on a developer machine.
    // `pnpm dev` passes this in from the repo-root `.env`.
    PORT: z.coerce.number().int().min(0).max(65_535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    /**
     * `memory` keeps everything in process so the API runs with no dependencies; `postgres` uses
     * the migrated schema. Memory mode is for local exploration and tests only.
     */
    PERSISTENCE: z.enum(['memory', 'postgres']).default('memory'),
    DATABASE_URL: z.string().min(1).optional(),
    /** UC-001: an unpaid order holds its unit for 24 hours. */
    ORDER_RESERVATION_TTL_HOURS: z.coerce.number().positive().default(24),
    /** `0` disables the reservation-expiry sweep. */
    ORDER_EXPIRY_SWEEP_INTERVAL_MS: z.coerce.number().int().min(0).default(60_000),
    ORDER_EXPIRY_SWEEP_BATCH_SIZE: z.coerce.number().int().min(1).max(1000).default(100),
    /** How long a session stays usable before the user signs in again (ADR-008). */
    SESSION_TTL_HOURS: z.coerce
      .number()
      .positive()
      .default(24 * 7),
    /** Phase 4 runs on the built-in simulated provider only (PD-0004 §9, ADR-009 §2). */
    PAYMENT_PROVIDER: z.enum(['simulated']).default('simulated'),
    /** Shared secret for HMAC-signed provider callbacks. The default is for local exploration only. */
    PAYMENT_PROVIDER_WEBHOOK_SECRET: z.string().min(16).default('local-dev-webhook-secret'),
    /** PD-0004 §2: how long a payment in progress protects the order from expiry. */
    PAYMENT_ATTEMPT_TIMEOUT_MINUTES: z.coerce.number().positive().default(15),
    /** `0` disables the payment-timeout sweep. */
    PAYMENT_TIMEOUT_SWEEP_INTERVAL_MS: z.coerce.number().int().min(0).default(60_000),
    PAYMENT_TIMEOUT_SWEEP_BATCH_SIZE: z.coerce.number().int().min(1).max(1000).default(100),
    /** PD-0004 §1: 8% marketplace fee, as basis points. */
    PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10_000).default(800),
  })
  .refine((value) => value.PERSISTENCE !== 'postgres' || value.DATABASE_URL !== undefined, {
    message: 'DATABASE_URL is required when PERSISTENCE is "postgres".',
    path: ['DATABASE_URL'],
  });

export interface Config {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly host: string;
  readonly port: number;
  readonly logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  readonly persistence: 'memory' | 'postgres';
  readonly databaseUrl: string | undefined;
  readonly reservationTtlMs: number;
  readonly expirySweepIntervalMs: number;
  readonly expirySweepBatchSize: number;
  readonly sessionTtlMs: number;
  readonly paymentProvider: 'simulated';
  readonly paymentWebhookSecret: string;
  readonly paymentAttemptTimeoutMs: number;
  readonly paymentTimeoutSweepIntervalMs: number;
  readonly paymentTimeoutSweepBatchSize: number;
  readonly platformFeeBps: number;
}

/**
 * The only place that reads the environment (ADR-007). Everything else receives a validated
 * `Config`.
 */
export const loadConfig = (): Config => {
  loadDotenv({ quiet: true });

  // oxlint-disable-next-line node/no-process-env -- the composition root owns environment access
  const parsed = environmentSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  const env = parsed.data;
  return {
    nodeEnv: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    persistence: env.PERSISTENCE,
    databaseUrl: env.DATABASE_URL,
    reservationTtlMs: env.ORDER_RESERVATION_TTL_HOURS * HOUR_IN_MS,
    expirySweepIntervalMs: env.ORDER_EXPIRY_SWEEP_INTERVAL_MS,
    expirySweepBatchSize: env.ORDER_EXPIRY_SWEEP_BATCH_SIZE,
    sessionTtlMs: env.SESSION_TTL_HOURS * HOUR_IN_MS,
    paymentProvider: env.PAYMENT_PROVIDER,
    paymentWebhookSecret: env.PAYMENT_PROVIDER_WEBHOOK_SECRET,
    paymentAttemptTimeoutMs: env.PAYMENT_ATTEMPT_TIMEOUT_MINUTES * MINUTE_IN_MS,
    paymentTimeoutSweepIntervalMs: env.PAYMENT_TIMEOUT_SWEEP_INTERVAL_MS,
    paymentTimeoutSweepBatchSize: env.PAYMENT_TIMEOUT_SWEEP_BATCH_SIZE,
    platformFeeBps: env.PLATFORM_FEE_BPS,
  };
};
