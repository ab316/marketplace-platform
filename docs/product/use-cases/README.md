# Use Cases

Settled product behavior, precise enough to build against — the handoff from product to engineering (see [`../product-operating-model.md`](../product-operating-model.md)). Use [`UC-TEMPLATE.md`](UC-TEMPLATE.md) for new ones.

This index is also the record of **what the product does today**. Backlog items leave the [backlog](../product-backlog.md) when they are built; the row of the use case that absorbed them keeps their IDs, so an old reference such as "P0-007" can always be traced here.

## Statuses

- **Draft** — being shaped; not ready to build.
- **Approved** — settled; the implementation gate for Level 2+ work.
- **Implemented** — the behavior is built and merged, exercisable through the API or UI named in the use case. Not the same as released.

Update a row in the same PR that changes its use case's status, absorbs backlog items, or opens or closes a gap. Gaps are places where the built behavior falls short of the use case; follow-ups are deferred work tracked in the backlog. A Level 1 improvement that amends a use case adds its backlog ID to that use case's row.

## Index

| Use case                                                                                        | Status      | Roadmap | Absorbed backlog items                 | Gaps and follow-ups                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------- | ----------- | ------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [UC-001](UC-001-buyer-orders-refurbished-laptop.md) — buyer orders a refurbished laptop         | Implemented | Phase 1 | P0-003, P0-004, P0-005, P0-006, P1-001 | Drafts require every field (P1-012); reservation and order creation are not yet atomic (roadmap "Backend reliability"); repeated cancellation undefined (P1-013); web demo waits for Phase 6. |
| [UC-002](UC-002-user-signs-up-and-signs-in.md) — sign up and sign in                            | Implemented | Phase 2 | —                                      | No email verification (P1-008) or password reset (P1-009).                                                                                                                                    |
| [UC-003](UC-003-seller-organization-and-member-management.md) — seller organization and members | Implemented | Phase 2 | P0-001, P0-002, part of P0-013         | Member email invitations (P2-019); leaving an organization and transferring ownership (P2-020).                                                                                               |
| [UC-004](UC-004-buyer-pays-into-escrow.md) — buyer pays into escrow                             | Implemented | Phase 4 | P0-007, part of P0-013                 | Payment-result writes are ordered but not atomic, and integration events wait for the outbox (ADR-009; roadmap "Backend reliability").                                                        |
