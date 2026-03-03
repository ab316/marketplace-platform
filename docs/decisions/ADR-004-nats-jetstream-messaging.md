# ADR-004: NATS JetStream as Integration Event Broker

Date: 2026-03-03  
Status: Accepted  
Owners: Platform Team

## Context

The platform uses an event-driven architecture with a transactional outbox pattern (ADR-002). Integration events must be relayed from the outbox table to consumer modules reliably. We need a message broker that satisfies:

- **At-least-once delivery** — integration events must not be lost on crash (NFR §1).
- **Durable subscriptions** — consumers must resume from where they left off after restarts.
- **Pub/sub fan-out** — one integration event may be consumed by multiple modules (ADR-001).
- **Ordered delivery per subject** — enables lifecycle reconstruction (NFR §9).
- **Multi-instance safe** — the monolith may run as multiple instances behind a load balancer.
- **Low operational overhead** — single-team project, modular monolith (ADR-001, Core Principles).
- **Evolutionary** — must support future extraction of modules into services.

Additionally, the system needs background job processing (retries, delays, scheduled tasks) for payment orchestration and workflow processing.

## Decision

We will use **NATS with JetStream** as the integration event broker and **BullMQ** (backed by Redis/ioredis) for background job scheduling.

### NATS JetStream — Integration Events

- JetStream streams store integration events durably.
- The outbox poller publishes events to JetStream subjects.
- Consumer modules subscribe via durable JetStream consumers with at-least-once acknowledgment.
- Subject naming follows the integration event naming convention: `<module>.<EventName>.v<version>` (e.g., `orders.OrderCreated.v1`).
- NATS Core subjects may be used for fire-and-forget patterns (real-time notifications, health checks) if needed later.

### BullMQ — Background Jobs

- Retries with backoff, scheduled/delayed jobs, cron-like recurring tasks.
- Used for payment orchestration timers, cleanup tasks, and workflow scheduling.
- Backed by Redis (ioredis), which is already in the stack.

## Consequences

### Positive

- Single lightweight binary — minimal operational overhead compared to RabbitMQ (Erlang VM) or Kafka (JVM cluster).
- At-least-once delivery with durable consumers satisfies NFR §1.
- Message replay capability — consumers can re-read historical events from a stream, enabling projection rebuilds.
- Subject-based routing maps cleanly to integration event naming conventions.
- Separation of concerns: JetStream handles event distribution, BullMQ handles job scheduling — each tool used for what it does best.
- Multi-instance safe — JetStream consumer groups ensure each event is processed once across instances.
- Future-proof — NATS clustering supports service extraction without changing the messaging model.

### Negative / Trade-offs

- NATS JetStream has a smaller ecosystem and community than RabbitMQ — fewer blog posts, Stack Overflow answers, and third-party tools.
- JetStream consumer model (push vs pull, ack policies, max deliver) has a learning curve.
- Dead-letter queue semantics require manual implementation (NAK + max deliver + advisory subjects), unlike RabbitMQ's built-in DLX.
- Two messaging systems in the stack (NATS + Redis/BullMQ) — operational cost of running both.

## Alternatives considered

1. Apache Kafka
   - Pros: Unmatched throughput, perfect ordering, full replay, strong ecosystem for event streaming.
   - Cons: Massive operational overhead (JVM cluster, Zookeeper/KRaft). Way over-engineered for the expected event volume (hundreds to low thousands per minute). Node.js client (`kafkajs`) has had maintainability concerns. Contradicts "Clarity > Cleverness" and "Avoid premature distribution".

2. RabbitMQ
   - Pros: Mature, battle-tested, rich routing (exchanges, bindings), native dead-letter queues, excellent Node.js library (`amqplib`).
   - Cons: Heavier operational footprint (Erlang VM, management plugin). More configuration surface area (exchanges, bindings, DLX policies). No native message replay — once acknowledged, messages are gone. The richer routing features are not needed since the system uses simple subject-based pub/sub.

3. NATS Core (without JetStream)
   - Pros: Extremely lightweight, blazing fast, near-zero configuration.
   - Cons: No persistence. At-most-once delivery only. Messages lost if no subscriber is connected. Violates NFR §1 ("no event lost on crash"). Unacceptable as the sole integration event transport.

4. In-process event dispatch (no external broker)
   - Pros: Simplest implementation, zero infrastructure, perfectly sufficient for a single-instance monolith.
   - Cons: Not multi-instance safe. The monolith may run as multiple instances, so an external broker is required for consumer group semantics and durable delivery.

## Notes / Links

- Related ADRs: ADR-001 (Modular Monolith), ADR-002 (Persistence & Event Strategy)
- Related docs: [Messaging Technology Analysis](file:///home/abdullah/.gemini/antigravity/brain/c51a810f-ea4c-457c-88d6-0fcbe6fca66d/messaging-technology-analysis.md)
- Related diagrams: N/A
- Related PRs/issues: N/A
