import { pino } from 'pino';

import { createServer } from './api/create-server.ts';
import { composeApp } from './bootstrap/compose-app.ts';
import { loadConfig } from './bootstrap/config.ts';
import { startPaymentTimeoutJob } from './jobs/payment-timeout-job.ts';
import { startReservationExpiryJob } from './jobs/reservation-expiry-job.ts';

const config = loadConfig();
const log = pino({ level: config.logLevel });
const app = composeApp(config, { logger: log });
const server = await createServer(app, log);

const expiryJob = startReservationExpiryJob({
  orders: app.orders,
  intervalMs: config.expirySweepIntervalMs,
  batchSize: config.expirySweepBatchSize,
  logger: server.log,
});

const paymentTimeoutJob = startPaymentTimeoutJob({
  payments: app.payments.api,
  intervalMs: config.paymentTimeoutSweepIntervalMs,
  batchSize: config.paymentTimeoutSweepBatchSize,
  logger: server.log,
});

await server.listen({ host: config.host, port: config.port });
server.log.info({ persistence: config.persistence }, 'backend started');

const shutdown = async (signal: string): Promise<void> => {
  server.log.info({ signal }, 'shutting down');
  expiryJob.stop();
  paymentTimeoutJob.stop();
  await server.close();
  await app.dispose();
  process.exit(0);
};

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}
