# ADR-007: Pure Dependency Injection with Composition Roots

Date: 2026-10-12  
Status: Accepted  
Owners: Platform Team

## Context

The engineering standards require constructor injection, a composition root, and no magic DI containers (../ENGINEERING_STANDARDS.md §2.7). The backend nevertheless declared InversifyJS as a dependency, and nothing recorded how wiring should work, so the first feature would have settled the question by accident.

Constraints influencing this decision:

- Application code must depend on abstractions (ports), never on concrete infrastructure, and must not import frameworks (manifest `layerRules`: application `frameworkImportsAllowed: false`).
- TypeScript only type-checks. esbuild produces the production bundle, and Vitest by default compiles tests with Oxc, so runtime code would be emitted by two different compilers.

InversifyJS requires TypeScript's legacy decorators (`experimentalDecorators`), `emitDecoratorMetadata`, and `reflect-metadata`. Decorator metadata needs type information that esbuild does not have. A probe of the same `@injectable()` class with an un-annotated constructor parameter resolved under Vitest and failed in the esbuild bundle with `Found unexpected missing metadata on type "PlaceOrder"`, so tests would pass while the deployed service fails at resolution time. Metadata also only helps for concrete-class parameters, because interfaces erase to `Object`; every port dependency needs an explicit `@inject(TOKEN)` anyway. Enabling `experimentalDecorators` would additionally switch every decorator in the project, including `packages/decorators`, to legacy semantics.

## Decision

We use **Pure DI**: dependencies are passed through constructors and wired by hand in composition roots. No DI container, no `reflect-metadata`, no legacy decorators.

1. **Application layer** declares ports as interfaces and receives them through constructors. It imports ports with `import type`, so it has no runtime dependency on any implementation.

2. **Each module has one composition root**, `modules/<module>/<module>.module.ts`. It is the only file in the module that instantiates infrastructure, and it returns the module's public API (commands and queries). Other modules receive that API, never the module's internals.

3. **The application composition root** lives in `src/bootstrap/`. It loads config, creates shared resources (database pool, clock, logger, message bus), calls each module factory in dependency order, and owns shutdown.

4. **Decorators** in `packages/decorators` use standard ECMAScript decorators only. They take no parameters from a container and read no type metadata.

5. **Tests compile TypeScript with esbuild**, the production compiler. No JavaScript engine runs standard decorators natively yet, and Vite's default Oxc transform does not lower them (oxc-project/oxc#9170), so a decorated class fails under Vitest with `SyntaxError: Invalid or unexpected token` while working in the esbuild bundle. `apps/backend/vitest.config.ts` disables Oxc and transforms `.ts` files with esbuild, and `test/unit/toolchain/standard-decorators.test.ts` guards it. Files that Node runs directly with type stripping (`scripts/`, `*.config.ts`) must not use decorators.

```ts
// modules/orders/application/ports.ts
export interface OrderRepository {
  save(order: Order): Promise<void>;
}

// modules/orders/application/place-order.ts
import type { Clock } from '@acme/core-contracts';

import type { OrderRepository } from './ports.ts';

export class PlaceOrder {
  readonly #orders: OrderRepository;
  readonly #clock: Clock;

  constructor(orders: OrderRepository, clock: Clock) {
    this.#orders = orders;
    this.#clock = clock;
  }

  async execute(command: PlaceOrderCommand): Promise<OrderId> {
    // domain logic, this.#orders.save(...)
  }
}

// modules/orders/orders.module.ts
export function createOrdersModule({ db, clock }: { db: Kysely<Database>; clock: Clock }) {
  return { placeOrder: new PlaceOrder(new PgOrderRepository(db), clock) };
}
export type OrdersModule = ReturnType<typeof createOrdersModule>;
```

### Out of scope: transactions

How command handlers open transactions and keep state changes and outbox inserts in one transaction (ADR-002) is deliberately left open. It will get its own ADR when the first transactional command is built. Candidates include a unit-of-work port passed to handlers and a `@Transactional()` decorator from `packages/decorators`. Whatever is chosen is wired through the composition roots above.

## Consequences

### Positive

- Wiring errors are compile errors: a missing or mistyped dependency fails `tsc` instead of a runtime resolution.
- Tests and production run code emitted by the same compiler, and nothing depends on compiler-specific metadata.
- Application and domain code import no framework, so they stay portable and the boundary rules hold.
- Unit tests construct handlers directly with in-memory fakes; no container setup or reset.
- The existing boundary check already fits: `<module>.module.ts` sits outside the layer folders and may import its own infrastructure, while cross-module infrastructure imports remain violations.

### Negative / Trade-offs

- Wiring is written by hand and grows with the number of classes; per-module composition roots keep it local.
- Lifetimes (singleton, per-request) are expressed in code rather than declared on bindings.
- No auto-wiring, interception, or container-driven plugin discovery.
- The Vitest config departs from Vite's default transform. Revisit once Oxc lowers standard decorators.

## Alternatives considered

1. InversifyJS with decorators
   - Pros: Familiar; auto-wiring of concrete classes; declarative scopes.
   - Cons: Requires legacy decorators, `emitDecoratorMetadata`, and `reflect-metadata`; esbuild cannot emit metadata, so tests and production diverge; framework decorators in the application layer; resolution errors at runtime; contradicts the "no magic DI containers" standard.
2. InversifyJS without decorators (`toResolvedValue(factory, [TOKENS])`)
   - Pros: No metadata problem; declarative scopes.
   - Cons: Factories are written by hand anyway, adding tokens and a runtime container on top of Pure DI; resolution errors still surface at runtime.
3. typed-inject
   - Pros: No decorators; dependency lists are type-checked at compile time.
   - Cons: Classes carry `static inject` token lists; adds a library and a container concept the current module count does not need. Revisit if wiring becomes a measurable burden.
4. awilix
   - Pros: No decorators; name-based auto-wiring with low ceremony.
   - Cons: Resolution by name is not type-checked; errors surface at runtime.

## Notes / Links

- Related ADRs: ADR-001 (Modular Monolith), ADR-002 (Persistence & Event Strategy)
- Related standards: ../ENGINEERING_STANDARDS.md §2.7, `apps/backend/src/bootstrap/README.md`, `apps/backend/src/modules/TEMPLATE_README.md`, `packages/decorators/README.md`
- Related PRs/issues: N/A
