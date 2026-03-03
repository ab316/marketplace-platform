# ADR-005: Stateless Horizontal Scaling for Modular Monolith

Date: 2026-03-03
Status: Accepted  
Owners: Platform Team

## Context

While ADR-001 establishes a Modular Monolith architecture, it does not explicitly dictate how instances of the monolith are deployed and scaled. As traffic grows and availability requirements increase, a single instance of the monolithic application will become a bottleneck and a single point of failure.

To ensure high availability, fault tolerance, and the ability to handle increased load, we must be able to run multiple instances (e.g., pods in a Kubernetes cluster) of the modular monolith concurrently behind a load balancer.

Running multiple instances concurrently introduces challenges for state management, background job processing, and event handling. If the application relies on local state (e.g., storing session data in-memory, local file system locks, or in-memory job queues), running multiple instances will lead to inconsistent behavior, data loss, and race conditions.

## Decision

We will design the Modular Monolith to be strictly **stateless at the application tier**, enabling horizontal scaling (running multiple instances concurrently).

To achieve this, all modules must adhere to the following principles:

1. **Stateless APIs**: All HTTP requests must be stateless. Session state or any necessary context must be passed by the client (e.g., via JWTs) or stored in an external shared datastore. Local memory and the local filesystem must not be used for shared or persistent state.
2. **Idempotency**: Event handlers, cron jobs, and background workers must be idempotent to safely handle at-least-once delivery or retries without producing unintended side effects.
3. **Distributed Locking / Competing Consumers**: For background tasks or event processing, we will leverage a competing consumer pattern (e.g., NATS JetStream Consumer Groups as per ADR-004) or distributed locking (e.g., via our database) to ensure that a task or event is processed by exactly one instance of the monolith when exclusive processing is required.
4. **Externalized Shared State**: Any state that must be shared across requests or background jobs must be stored in a centralized, external datastore (e.g., Postgres, Redis) accessible by all instances.

## Consequences

### Positive

- **High Availability**: The system can tolerate the failure of one or more instances without affecting overall availability.
- **Scalability**: We can scale horizontally by adding more instances/pods to handle peak traffic organically.
- **Zero-Downtime Deployments**: Rolling updates are straightforward since instances can be replaced and rotated independently without losing state.
- **Easier Microservices Extraction**: Building a shared-nothing, horizontally scalable monolith forces loose coupling with external state, making it significantly easier to extract modules into independent microservices later if justified.

### Negative / Trade-offs

- **Increased Complexity**: Developers cannot rely on simple in-memory state, local caching, or file storage for cross-request functionality.
- **Concurrency Challenges**: Mandates handling distributed concurrency, locking, and idempotency from day one, which increases the cognitive load per feature.
- **Infrastructure Dependency**: Requires reliable external datastores and message brokers (Postgres, NATS JetStream) to coordinate state, increasing the minimum infrastructure footprint.

## Alternatives considered

1. **Stateful Monolith (Single Instance or Sticky Sessions)**
   - Pros: Simpler mental model for developers; can use fast local memory maps and in-memory message buses.
   - Cons: Cannot scale horizontally effectively; represents a single point of failure; hard to achieve zero-downtime deployments; sticky sessions introduce load balancing complexities.
2. **Microservices from the start**
   - Pros: Independent scaling of individual components based on their specific resource needs.
   - Cons: Too much operational overhead too early, as already documented in ADR-001.

## Notes / Links

- Related ADRs: ADR-001 (Modular Monolith), ADR-002 (Persistence & Event Strategy), ADR-004 (NATS JetStream Messaging).
- Related diagrams: N/A
- Related PRs/issues: N/A
