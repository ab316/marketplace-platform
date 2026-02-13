---
name: Feature
about: Propose or define a new feature following the official workflow
title: 'Feature: <Short description>'
labels: feature
assignees: ''
---

# Feature Overview

## Summary

Describe the feature in 2–3 sentences.

## Feature Type

- [ ] New domain capability
- [ ] Modification of existing behavior
- [ ] Cross-module interaction
- [ ] External integration
- [ ] Infrastructure enhancement
- [ ] Observability improvement
- [ ] Refactor (no behavior change)

---

# Alignment

## Product Vision

Explain how this aligns with:
docs/product/vision.md

## Non-Functional Requirements

Does this impact:

- [ ] Financial safety
- [ ] Performance
- [ ] Scalability
- [ ] Security
- [ ] Observability
- [ ] Reliability

Explain impact briefly.

---

# Use Case

## Use Case Document

- [ ] New use-case created
- [ ] Existing use-case updated

File:
docs/product/use-cases/UC-XXX-<Name>.md

## Actor

Who triggers this feature?

## Main Flow

High-level steps.

## Error/Alternate Flows

List major edge cases.

---

# Module Ownership

## Owning Module

Which module owns this behavior?

## Cross-Module Interaction?

- [ ] Yes
- [ ] No

If yes, specify modules involved and interaction mechanism:

- Command
- Query
- Integration Event

If new module:

- [ ] MODULE_CATALOG.md updated

---

# Domain Design

## Aggregates Affected

List aggregates.

## New Entities / Value Objects?

List if applicable.

## Invariants

What must always remain true?

---

# CQRS Design

## Commands

List commands to be introduced/modified.

## Queries

List queries to be introduced/modified.

## Transaction Boundary

Where is the transaction applied?

---

# Event Strategy

## Domain Events

List internal events (if any).

## Integration Events

List integration events (if any).

For each integration event:

- Name (versioned, e.g., EventName.v1)
- Producer module
- Consumer module(s)

- [ ] EVENT_CATALOG.md updated (if applicable)

---

# Infrastructure Impact

- [ ] New database table
- [ ] Schema migration required
- [ ] External service integration
- [ ] Messaging change
- [ ] Outbox modification

Explain briefly.

---

# Testing Plan

## Unit Tests

What domain/application logic will be tested?

## Integration Tests

What infra behavior must be tested?

## API Tests

What endpoint changes require coverage?

---

# Observability

- [ ] Structured logging added
- [ ] Correlation ID propagated
- [ ] Metrics added (if needed)
- [ ] Sensitive data excluded from logs

---

# ADR Requirement

Does this change architecture?

- [ ] Yes → ADR required
- [ ] No

If yes:
docs/decisions/ADR-XXX-<Title>.md

---

# Risk Assessment

What could go wrong?

- Edge cases:
- Failure modes:
- Financial risks:
- Data consistency risks:

Mitigation plan:

---

# Definition of Done

- [ ] Use-case written/updated
- [ ] Module README updated
- [ ] Events documented
- [ ] Tests added
- [ ] Observability added
- [ ] No architecture violations
- [ ] Documentation updated
