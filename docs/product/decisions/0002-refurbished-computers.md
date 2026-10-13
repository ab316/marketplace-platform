# Product Decision 0002: Focus on Refurbished Computers

## Status

Accepted — 2026-10-13

Refines [PD-0001](0001-product-direction.md) with a concrete marketplace niche.

## Context

The trust-centered product model is defined, but the marketplace needs a concrete category for its first visible workflow. The founder prefers physical products to services so shipment and delivery can become part of the product, and wants room to expand the transaction lifecycle over time.

## Decision

The marketplace will focus on refurbished computers sold by seller organizations to buyers.

The first use case and demo should be grounded in this niche. Refurbished laptops are the proposed starting category; the exact first-demo assortment and purchase rules remain to be defined.

New computers, mobile phones, and other electronics are possible later expansions, outside the initial niche. Services and home décor are not the initial marketplace focus.

## Options considered

- **Services:** support delivery approval and protected payments, but do not fit the desired physical shipment and delivery direction.
- **Home décor and desk accessories:** offer a straightforward physical-goods demo and room for richer logistics and customization.
- **New and refurbished electronics:** offer catalog, fulfillment, and after-sales depth, but spanning device categories and conditions immediately would enlarge the first slice.
- **Refurbished computers:** chosen for a focused starting point with room for device condition, inspection, fulfillment, recovery, and resale workflows.

## Consequences

- Keep the existing candidate first journey: seller publishes a listing, buyer creates an order, and the order timeline shows `Awaiting payment` and the next action.
- Define required specifications and condition disclosures, individual-device versus pooled inventory, and stock reservation/expiry behavior in the first use case before implementation.
- Shipment tracking, delivery confirmation, returns, inspections, warranty claims, repairs, and trade-ins are future expansion opportunities, not newly committed MVP scope.
- The niche decision does not settle grading thresholds, warranty promises, delivery policies, or payment-release changes.
- The existing phased approach remains: a thin visible workflow first, with simulated payments before real provider integration.

## Affected documents

- [Product brief](../product-brief.md)
- [MVP scope](../mvp-scope.md)
- [Discovery](../discovery.md)
- [Roadmap](../roadmap.md)
- [Project state](../../PROJECT_STATE.md)

## Review triggers

Revisit if product discovery requires a different category or the niche cannot support the intended first transaction workflow. Evaluate broader electronics categories after the core trust loop is working.
