# Product Documentation

This folder is the product brain of the Marketplace Platform: the product idea, feature definitions, backlog, roadmap, business rules, and product decisions live here so the product can evolve together with the implementation.

The goal is not only to document what has already been built. The goal is to make the repository the main place where new product ideas are captured, shaped, challenged, prioritized, and translated into concrete work.

**Boundary:** this folder describes what the product does, for whom, and why — in user and marketplace language. How it is built lives on the engineering side (`docs/architecture/`, `docs/decisions/` ADRs, `docs/ENGINEERING_STANDARDS.md`). The two meet at use cases (`use-cases/`) and non-functional requirements (`../architecture/non-functional-requirements.md`): product defines the behavior and policies; engineering owns the implementation and its decisions.

## Product framing

Marketplace Platform is a trust-centered marketplace product where organizations can list assets or services, buyers can transact safely, and all parties can follow the order from discovery through payment, fulfillment, dispute handling, refund, settlement, and completion.

The product focuses on three promises:

1. **Trust**: buyers and sellers need confidence that money, fulfillment, and disputes are handled fairly.
2. **Clarity**: users should always understand what is happening, what is expected next, and why a status changed.
3. **Correctness**: payments, refunds, settlements, audit trails, and operational decisions must be reliable and explainable.

## How to use this folder

Start with [`product-brief.md`](./product-brief.md) for the product and [`roadmap.md`](./roadmap.md) for current focus. For the full idea → use-case process (lifecycle, checklists, decision levels, brainstorming prompts), see [`product-operating-model.md`](./product-operating-model.md) — that is the one process doc; don't duplicate it here.

## Source-of-truth order

When product docs disagree, use this precedence:

1. [`roadmap.md`](./roadmap.md) owns current focus, sequencing, and what should be built next.
2. [`mvp-scope.md`](./mvp-scope.md) owns the product boundary for the MVP trust loop.
3. [`business-rules-policies.md`](./business-rules-policies.md) owns accepted product behavior and policy rules.
4. [`use-cases/`](./use-cases/) owns settled implementation-ready behavior. (Exception: Level 1 improvements are gated by backlog acceptance criteria instead — see [`product-operating-model.md`](./product-operating-model.md).)
5. [`product-backlog.md`](./product-backlog.md) is a planning queue; backlog status never overrides roadmap, scope, rules, or use cases.
6. [`discovery.md`](./discovery.md) and [`ideas/`](./ideas/README.md) are intentionally unsettled unless promoted into a decision, use case, or roadmap change.

If a backlog item or idea conflicts with roadmap/scope/rules, treat it as needing product clarification before implementation.

## Documents

| Document                                                                   | Purpose                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`product-brief.md`](./product-brief.md)                                   | One-page product summary                                            |
| [`product-operating-model.md`](./product-operating-model.md)               | How product ideas move from brainstorming to implementation         |
| [`vision-problem-strategy.md`](./vision-problem-strategy.md)               | Vision, problem, strategy, positioning                              |
| [`users-and-marketplace-journeys.md`](./users-and-marketplace-journeys.md) | Target users and end-to-end journeys                                |
| [`feature-catalog.md`](./feature-catalog.md)                               | Complete feature map                                                |
| [`mvp-scope.md`](./mvp-scope.md)                                           | MVP scope, non-goals, slicing guidance                              |
| [`product-backlog.md`](./product-backlog.md)                               | Prioritized product backlog                                         |
| [`business-rules-policies.md`](./business-rules-policies.md)               | Marketplace rules and policy decisions                              |
| [`success-metrics.md`](./success-metrics.md)                               | Product, trust, operations, and quality metrics                     |
| [`roadmap.md`](./roadmap.md)                                               | Execution roadmap: current focus, phases, what's next               |
| [`discovery.md`](./discovery.md)                                           | Living scratchpad: open questions, unsettled thinking, decision log |
| [`ideas/`](./ideas/README.md)                                              | Idea inbox (one file per idea)                                      |
| [`feature-specs/`](./feature-specs/README.md)                              | Accepted feature specs (product design, still implementation-free)  |
| [`decisions/`](./decisions/README.md)                                      | Product decision records (PDs)                                      |
| [`use-cases/`](./use-cases/)                                               | Settled behavior, ready to build — the handoff to engineering       |
| [`templates/`](./templates/)                                               | Idea, spec, experiment, and decision templates                      |

## Product question

The core question for every feature is:

> Does this make marketplace transactions safer, clearer, easier to complete, or easier to recover when something goes wrong?
