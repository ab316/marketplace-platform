/**
 * Fire-and-forget work that must still be awaitable: at shutdown, so nothing is cut off mid-write,
 * and in tests, so an outcome delivered asynchronously can be waited for deterministically.
 *
 * In-process only. Work that must survive a crash belongs in the transactional outbox, which is
 * deferred (roadmap "Backend reliability"); this is for simulations and best-effort follow-ups.
 */
export interface BackgroundTasks {
  run(name: string, task: () => Promise<void>): void;
  /** Resolves once every task started so far (including ones they start) has finished. */
  drain(): Promise<void>;
}

export interface BackgroundTaskLogger {
  error(context: Record<string, unknown>, message: string): void;
}

export const createBackgroundTasks = (logger: BackgroundTaskLogger): BackgroundTasks => {
  const inFlight = new Set<Promise<void>>();

  const run = (name: string, task: () => Promise<void>): void => {
    // Deferred to the next macrotask so the caller's own writes commit before the task observes
    // them (ADR-009 §2: callbacks are delivered after the start has been recorded).
    const promise = new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    })
      .then(task)
      .catch((error: unknown) => {
        logger.error({ err: error, task: name }, 'background task failed');
      })
      .finally(() => {
        inFlight.delete(promise);
      });
    inFlight.add(promise);
  };

  const drain = async (): Promise<void> => {
    while (inFlight.size > 0) {
      // oxlint-disable-next-line no-await-in-loop -- tasks may enqueue more tasks; loop until quiet
      await Promise.all(inFlight);
    }
  };

  return { run, drain };
};
