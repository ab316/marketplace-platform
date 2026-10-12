# Bootstrap

App startup, config loading, and the application composition root (ADR-007).

There is no DI container. The composition root:

1. Loads and validates config (the only place that reads `process.env`).
2. Creates shared resources: database pool, clock, logger, message bus.
3. Calls each module factory (`modules/<module>/<module>.module.ts`) in dependency order, passing shared resources and the public APIs of modules it depends on.
4. Owns shutdown: disposes resources in reverse creation order.

```ts
export function composeApp(config: Config) {
  const db = createDb(config.databaseUrl);
  const clock: Clock = { now: () => new Date() };

  const orders = createOrdersModule({ db, clock });
  const payments = createPaymentsModule({ db, clock, orders }); // orders' public API only

  return { orders, payments, dispose: () => db.destroy() };
}
```

Presentation (HTTP routes), jobs, and message consumers receive what they need from the composed app; they never construct infrastructure themselves.
