import { config as loadDotenv } from 'dotenv';
import pino from 'pino';

import { buildServer } from './api/server.ts';
import { composeApp } from './bootstrap/compose-app.ts';
import { loadConfig } from './bootstrap/config.ts';

loadDotenv();

const logger = pino();

const config = loadConfig();
const app = composeApp(config);
const server = buildServer(app);

const shutdown = async () => {
  await server.close();
  await app.dispose();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());

try {
  const address = await server.listen({ port: config.port, host: config.host });
  logger.info({ address }, 'backend listening');
} catch (error) {
  logger.error(error, 'failed to start backend');
  process.exit(1);
}
