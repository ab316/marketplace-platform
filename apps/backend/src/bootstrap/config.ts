export type Config = {
  databaseUrl: string;
  port: number;
  host: string;
};

// The only place that reads process.env (ADR-007).
// oxlint-disable-next-line node/no-process-env
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const databaseUrl = env['DATABASE_URL'];
  if (databaseUrl === undefined || databaseUrl === '') {
    throw new Error('DATABASE_URL is required');
  }
  const port = env['PORT'];
  return {
    databaseUrl,
    port: port === undefined || port === '' ? 3000 : Number(port),
    host: env['HOST'] ?? '0.0.0.0',
  };
}
