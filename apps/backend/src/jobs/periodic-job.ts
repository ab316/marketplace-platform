import type { FastifyBaseLogger } from 'fastify';

export interface PeriodicJobOptions {
  readonly name: string;
  /** `0` disables the job. */
  readonly intervalMs: number;
  readonly logger: FastifyBaseLogger;
  /** Returns a summary to log, or `null` when there was nothing to report. */
  readonly run: () => Promise<Record<string, number> | null>;
}

export interface PeriodicJob {
  stop(): void;
}

/**
 * A plain interval is enough while scheduled work is small; move to the job runner when it
 * grows. A slow run is skipped rather than queued, so a job never overlaps itself in one process.
 * Multi-instance safety is deferred (roadmap "Backend reliability", ADR-005).
 */
export const startPeriodicJob = (options: PeriodicJobOptions): PeriodicJob => {
  if (options.intervalMs === 0) {
    return { stop: () => undefined };
  }

  let running = false;

  const tick = async (): Promise<void> => {
    if (running) {
      return;
    }
    running = true;

    try {
      const summary = await options.run();
      if (summary !== null) {
        options.logger.info(summary, `${options.name} completed`);
      }
    } catch (error) {
      options.logger.error({ err: error }, `${options.name} failed`);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => {
    void tick();
  }, options.intervalMs);

  // Never hold the process open just for a sweep.
  timer.unref();

  return { stop: () => clearInterval(timer) };
};
