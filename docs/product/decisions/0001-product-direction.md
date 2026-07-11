# Product Decision 0001: Build a Trust-Centered Marketplace Product

## Status

Accepted — 2026-07-09

Supersedes the earlier portfolio-focused product vision (`docs/product/vision.md`, removed; see git history). Related architecture decisions: ADR-002 (outbox events), ADR-003 (append-only financial ledger) in `docs/decisions/`.

## Context

The project started as a production-grade marketplace platform with escrow, order workflows, payment processing, fulfillment, disputes, refunds, settlement, auditability, and reliable event-driven processing.

The product direction is now broader than proving implementation architecture. The product should be defined as a complete marketplace experience where users can discover listings, place orders, pay safely, track fulfillment, resolve problems, and understand money movement.

## Decision

The product will be positioned as a trust-centered marketplace product.

The core product promise is:

> Buyers and sellers can complete transactions with clear expectations, protected payments, visible progress, and reliable resolution paths.

The repository will contain product documentation for vision, users, journeys, features, MVP scope, backlog, business rules, success metrics, idea iteration, and product decisions.

Product language should describe end-to-end user and marketplace behavior. Technical implementation details can exist elsewhere, but product documents should focus on what the product does, for whom, and why it matters.

## Consequences

- Product docs should avoid describing the project as only a technical platform.
- Features should be defined through user journeys, states, policies, and outcomes.
- The MVP should prove a complete trusted transaction.
- The repository becomes the primary place for product brainstorming and iteration.
- Architecture decisions should support product promises such as trust, clarity, correctness, resilience, and auditability.

## Alternatives considered

### Keep project framed mainly as infrastructure capability

Rejected because it under-represents the product experience and weakens the marketplace story.

### Split product into separate experience and service tracks

Rejected for product documentation because it creates unnecessary separation. Users experience the marketplace as one product.

### Focus only on escrow payments

Rejected because trust depends on the full transaction lifecycle: listing quality, order state, fulfillment, timeline, dispute handling, refund rules, settlement, and operator visibility.

## Review triggers

Revisit this decision if:

- The product pivots away from marketplace transactions.
- Escrow is no longer central to the trust model.
- The MVP scope no longer includes a complete order lifecycle.
- The repository no longer acts as the product planning workspace.
