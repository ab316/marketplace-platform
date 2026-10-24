# Orders Module

Location: `apps/backend/src/modules/orders/`

Bounded context: buyer orders on refurbished-laptop listings — creation with an immutable listing snapshot, `awaiting_payment` state, 24-hour expiry rule, buyer cancellation, and the order timeline ([UC-001](../../../../../docs/product/use-cases/UC-001-buyer-orders-refurbished-laptop.md)).

## Responsibilities

- Order lifecycle (current slice): `awaiting_payment → cancelled` (buyer cancel or expiry). Payment/fulfillment states arrive with later phases.
- Immutable listing snapshot at order time (what the buyer was promised).
- Order timeline entries (`order_created`, `order_cancelled`) answering what happened, when, who, what next.
- 24h unpaid-expiry rule (`UNPAID_ORDER_TTL_HOURS`): the expiry timestamp is set and displayed; automated enforcement lands with the payment slice.

Not responsible for: listing content/stock (goes through the listings public API), payments, settlement.

Single source of truth for: the `Order` aggregate, `orders` and `order_timeline_entries` tables.

## Public API (application layer)

Created by `createOrdersModule()` in `orders.module.ts` (ADR-007).

Commands: `createOrder` (reserves a unit via the listings public API, then persists order + timeline; releases the unit if persistence fails), `cancelOrder` (owner-only; releases the reserved unit).
Queries: `getOrder` (owner-only).

## Cross-module collaboration

- **listings** — via its public application API only (`ListingsGateway` port): `reserveListingUnit`, `releaseListingUnit`. No infrastructure imports.

## Events

Publishes/consumes no integration events yet (single visible surface; add via outbox + `EVENT_CATALOG.md` when a consumer appears).

## Persistence

- Tables: `orders`, `order_timeline_entries` (owned). Optimistic locking via `version` on `orders`.

## Known limitations (UC-001 scope)

- Buyer identity is the `x-user-id` header (demo), not real auth.
- No cross-module DB transaction: reserve → insert order is two steps with compensating release on failure. Revisit when transactions/outbox are introduced.
- Expiry (A2) is not yet enforced by a job.
