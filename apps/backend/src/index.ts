import { createServer } from './api/create-server.ts';
import { composeApp } from './bootstrap/compose-app.ts';
import { loadConfig } from './bootstrap/config.ts';
import { startReservationExpiryJob } from './jobs/reservation-expiry-job.ts';

const config = loadConfig();
const app = composeApp(config);
const server = await createServer(app);

const expiryJob = startReservationExpiryJob({
  orders: app.orders,
  intervalMs: config.expirySweepIntervalMs,
  batchSize: config.expirySweepBatchSize,
  logger: server.log,
});

await server.listen({ host: config.host, port: config.port });
server.log.info({ persistence: config.persistence }, 'backend started');

const shutdown = async (signal: string): Promise<void> => {
  server.log.info({ signal }, 'shutting down');
  expiryJob.stop();
  await server.close();
  await app.dispose();
  process.exit(0);
};

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}
