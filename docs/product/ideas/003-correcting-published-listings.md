# Feature Idea: Correcting Published Listings

## Status

Idea — backlog [P2-023](../product-backlog.md). Captured 2026-11-07 while shaping [seller listing management](../feature-specs/seller-listing-management.md) (decision D2).

## Product question

Should a seller be able to make minor corrections to a published listing, such as fixing a typo or clarifying the description, and how does the product tell a harmless correction from a change to what is actually being sold?

## User problem

A seller publishes a listing and then spots a typo, a missing sentence, or an unclear fulfillment note. Today a published listing's content is frozen. The only fix is to archive it and publish a new one, which resets its publication date and splits its stock and order history across two listings.

## Affected users

- Seller
- Buyer
- Marketplace operator

## Affected journey

- Listing creation
- Discovery
- Order creation
- Dispute

## Rough idea

Allow a narrow class of edits on an `Active` listing:

1. **Corrections** (typos, wording, formatting) in title, description, known defects, and fulfillment expectations.
2. **Later, possibly:** broader description changes that add information without changing the offer.

Changes to the offer itself stay forbidden: specifications, condition grade and guarantees, price, brand and model. Those mean a new listing, because buyers compare and order on them.

The hard part is free text. A description edit can quietly change the offer ("16 GB RAM" → "8 GB RAM", "no scratches" → "minor scratches"). An **AI change classifier** could compare the old and new text and flag edits that:

- contradict or alter the structured specifications or condition;
- add or remove a defect, accessory, or guarantee;
- change fulfillment promises materially (shipping time, what is included).

A flagged edit is refused with an explanation, or held for operator review. A clean edit applies immediately.

## Why it might matter

- **Trust:** buyers see accurate, well-written listings. Sellers are not punished for a typo.
- **Transaction:** fewer archive-and-recreate cycles, and stable listings that keep their place.
- **Operational:** fewer "the listing said X" disputes caused by sloppy text that could not be fixed.
- **Learning:** a contained first use of AI as a guardrail rather than a decision-maker.

## Smallest useful version

Typo-level corrections only. An edit to a free-text field is allowed when it is small: a bounded character difference with no change to numbers, units, or defect words. It is applied immediately and recorded with actor and time. No AI.

## Risks and trade-offs

- **Bait and switch:** any edit path is a way to change the offer after buyers have looked. Mitigations: order snapshots already protect placed orders (UC-001 B5); the edit history must be visible to operators (P1-019), and perhaps to buyers ("edited on …").
- **AI false negatives** let a material change through; **false positives** frustrate honest sellers. The AI should advise or flag, never be the only control.
- Explaining to a seller why an edit was refused, without seeming arbitrary.
- An order placed a minute before a correction has a snapshot with the typo. That is acceptable, but it must be understood.

## Open questions

- Which fields are correctable at all? Is price ever editable (for example, a price drop)?
- Does a buyer see that a listing was edited, and what changed?
- Is a flagged edit refused, or queued for operator review?
- How does this interact with restocking (P1-011), which also changes a live listing?
- What source text does the AI see, and is its judgement stored with the edit?

## Decision

- Keep exploring. Revisit when the archive-then-recreate metric in the seller listing management spec shows sellers working around frozen content.

## Notes

- Depends on listing activity history ([P1-019](../product-backlog.md)) so every correction is attributable.
- Related: [idea 004](./004-ai-condition-grade-assistant.md), which uses AI on the same listing content.
