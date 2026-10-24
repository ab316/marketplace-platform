import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

const HOUR_IN_MS = 60 * 60 * 1000;

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HOST: z.string().min(1).default('127.0.0.1'),
    PORT: z.coerce.number().int().min(0).max(65_535).default(3000),
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
  };
};
