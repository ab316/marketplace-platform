# Feature Idea: AI Condition Grade Assistant

## Status

Idea — backlog [P3-018](../product-backlog.md). Captured 2026-11-07 while shaping [seller listing management](../feature-specs/seller-listing-management.md) (decision D5).

## Product question

Can AI help sellers choose the condition grade that honestly matches the listing, either by checking the grade a seller picked against what they wrote or by suggesting a grade in the first place?

## User problem

Condition grades (A Like new, B Light wear, C Visible wear; [business rules](../business-rules-policies.md#condition-grades)) are self-assessed. A seller may grade generously, or simply misread the definitions, and write "noticeable dents on the lid" under grade A. Buyers filter and decide on grade (UC-006), so a wrong grade is a broken promise that turns into a dispute after payment.

## Affected users

- Seller
- Buyer
- Marketplace operator

## Affected journey

- Listing creation
- Discovery
- Dispute

## Rough idea

Two assistants on the listing form, sharing one model of the grade definitions:

1. **Consistency check:** when a draft is saved or published, compare the chosen grade with the description, the known defects, and the battery guarantees. If they disagree, warn the seller: "You described visible dents; grade A means no visible marks. Consider grade C."
2. **Grade suggestion:** from the seller's description and known defects, propose a grade with a one-line reason the seller can accept or override.

Later, when photos exist (P2-007), either assistant could use them too.

## Why it might matter

- **Trust:** grades become more consistent across sellers, so the grade filter means something.
- **Operational:** fewer condition disputes; operators could see where a seller overrode a warning.
- **Learning:** a low-stakes AI assist. It advises, the seller decides, and nothing moves money.

## Smallest useful version

A non-blocking consistency warning at publish time, based on text only. The seller can always proceed. Whether they overrode a warning is recorded for operators.

## Risks and trade-offs

- **AI decides vs AI advises:** blocking publication on an AI judgement would be unfair and hard to explain. Keep it advisory.
- Sellers may learn to write vaguer descriptions to avoid warnings. That works against disclosure quality, so it is worth watching.
- Suggestions could anchor sellers on a grade they would not have chosen.
- Cost and latency on every save. Checking at publish only is cheaper.

## Open questions

- Is an overridden warning visible to buyers, to operators only, or to no one?
- Does the check run on save, on publish, or both?
- How is the assistant's accuracy measured? Against operator dispute outcomes?
- What happens when the definitions change? Are old listings re-checked?

## Decision

- Keep exploring. Revisit once grade-related disputes exist to learn from (after P1-004/P1-005).

## Notes

- Related: [idea 003](./003-correcting-published-listings.md) (AI guard on listing edits) and P2-002 (listing quality score and guidance), which this could become part of.
