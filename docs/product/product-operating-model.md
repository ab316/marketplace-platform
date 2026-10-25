# Product Operating Model

## Purpose

This repository should contain enough product thinking to make meaningful product decisions without relying on scattered notes outside the codebase.

The product operating model defines how ideas move from rough brainstorming into clear product scope, feature specs, backlog items, scheduled roadmap work, and implementation-ready work — and how finished work is recorded.

## Product workflow

```text
Idea
→ problem framing
→ user journey
→ feature hypothesis
→ business rules
→ acceptance criteria
→ backlog item
→ scheduled into a roadmap phase
→ feature spec (Level 2+ work; see decision levels below)
→ use case — settled behavior, the handoff to engineering
→ implementation — use case marked Implemented, backlog item removed
→ release
→ measurement
→ iteration
```

The use case is the gate for Level 2+ work (see decision levels below): a feature is implementation-ready only when its behavior is settled as one or more use cases in `docs/product/use-cases/`, distilled from the feature spec. Level 1 improvements refine behavior that is already settled, so they bypass the spec _and_ the gate: the backlog item's acceptance criteria are the handoff, and the affected existing use case is amended when its documented behavior changes. If a "small" change turns out to introduce a new journey or policy, it is not Level 1 — escalate it.

### Framing an idea

Weak ideas read as a solution. Strong ideas read as a question with a trade-off:

- Weak: "Add auto-release."
- Better: "Should escrow be automatically released if the buyer does not respond within a defined confirmation window?"

Keep the smallest useful version explicit, e.g. instead of "build a complete dispute center with evidence, messages, escalation, AI summary, SLA, appeals, and analytics," start with "buyer can open a dispute with a reason and explanation; operator can decide full refund or release; the decision is recorded on the order timeline."

## Backlog, roadmap, and what is built

Three documents, three questions. Each piece of information has one home, so nothing has to be kept in sync by hand.

| Question                          | Home                                           | Holds                                                                                  |
| --------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| What would we like to build?      | [`product-backlog.md`](./product-backlog.md)   | Every unbuilt product item, with priority (importance) and status. Product work only.  |
| What is scheduled, in what order? | [`roadmap.md`](./roadmap.md)                   | Phases that list backlog IDs, their gates, engineering-only work, and success metrics. |
| What does the product do today?   | [`use-cases/README.md`](./use-cases/README.md) | Each use case's status, the backlog IDs it absorbed, and its known gaps.               |

The lifecycle of a backlog item:

1. **Capture.** Anything we would like the product to do becomes a backlog item: a one-line row for P2/P3 ideas, a user story with acceptance criteria once it is P0/P1 or being shaped. Longer thinking goes in [`ideas/`](./ideas/README.md), linked from the item. Engineering-only work is not a backlog item; it is scheduled directly in the roadmap and decided in ADRs.
2. **Shape.** `Idea` → `Needs shaping` → `Ready`, following the decision levels below.
3. **Schedule.** Picking an item into a roadmap phase sets its status to `Scheduled (<phase>)` and adds its ID to that phase. Shaping can finish after scheduling — a phase's gates say what must be settled before code.
4. **Finish.** The PR that completes an item deletes it from the backlog, marks the use case `Implemented` (or amends it, for Level 1), and records the item's ID in the use case's row of the index. A partly finished item stays in the backlog with its status naming what is already built.
5. **Close the phase.** When every item and gate of a phase is done, the phase shrinks to one line under the roadmap's Done section.

Backlog IDs are never reused; the use-case index keeps the retired ones.

## Repository as product workspace

Product work should be captured in the repo when it changes what the product is, how it behaves, or what needs to be built.

Examples:

- A new feature idea
- A change to order lifecycle rules
- A new dispute policy
- A new dashboard metric
- A new checkout or fulfillment journey
- A decision to remove or postpone a feature
- A change in MVP scope
- A new product risk
- A new experiment

## Where product work lives

| Product artifact                   | Location                                  |
| ---------------------------------- | ----------------------------------------- |
| Unsettled thinking, open questions | `docs/product/discovery.md`               |
| Rough ideas                        | `docs/product/ideas/`                     |
| Feature specs                      | `docs/product/feature-specs/`             |
| Everything we'd like to build      | `docs/product/product-backlog.md`         |
| Scheduled work and its order       | `docs/product/roadmap.md`                 |
| MVP scope                          | `docs/product/mvp-scope.md`               |
| Business rules                     | `docs/product/business-rules-policies.md` |
| Product decisions                  | `docs/product/decisions/`                 |
| Success metrics                    | `docs/product/success-metrics.md`         |
| Settled behavior, ready to build   | `docs/product/use-cases/`                 |
| What is built today                | `docs/product/use-cases/README.md`        |
| Templates                          | `docs/product/templates/`                 |

## Product ↔ engineering boundary

Product and engineering evolve together but keep separate records, like management and an engineering department:

- **Product side (`docs/product/`)** answers _what and why_: journeys, features, policies, scope, metrics, product decisions (PDs). It is written in user and marketplace language and must stay readable without knowing the codebase.
- **Engineering side (`docs/architecture/`, `docs/decisions/`, `docs/ENGINEERING_STANDARDS.md`)** answers _how_: module boundaries, events, persistence, invariants, architecture decisions (ADRs).
- **The handoff is the use case** (`docs/product/use-cases/`): settled product behavior, precise enough to implement, still implementation-free. Engineering artifacts reference use cases; product docs never reference modules, tables, or frameworks. (Level 1 improvements are the exception — their handoff is the backlog item's acceptance criteria; see the product workflow above.)
- **Constraints flow both ways explicitly.** Product promises (e.g. "never hide money movement") become non-functional requirements and ADRs. Engineering limits (e.g. "partial refunds need ledger changes") come back as scope notes on backlog items or PDs — recorded on the product side in product language, with a link to the technical source.

## Idea quality checklist

Before an idea becomes backlog work, it should answer:

1. Who is the user?
2. What problem does the user have?
3. What is the current workaround?
4. What product behavior should change?
5. What is the expected user outcome?
6. What business rule or policy is affected?
7. What could go wrong?
8. How will success be measured?
9. What is the smallest useful version?
10. What should explicitly not be included yet?

## Feature definition checklist

A feature is ready to build when it has:

- Problem statement
- Target user
- User journey
- Main flow
- Edge cases
- Empty states
- Error states
- Status changes
- Notifications or timeline entries
- Permissions
- Business rules
- Acceptance criteria
- Success metric
- Out-of-scope items

## Product decision levels

Not every idea needs the same level of process.

### Level 1: Small product improvement

Examples:

- Rename a confusing status
- Add a missing empty state
- Add a filter to an existing list
- Improve timeline copy

Expected artifact:

- Backlog item with acceptance criteria
- On completion: the affected use case amended, its index row updated, and the backlog item removed

### Level 2: Feature addition

Examples:

- Add offers
- Add fulfillment proof upload
- Add buyer confirmation window
- Add dispute evidence collection

Expected artifacts:

- Feature spec
- Backlog items, scheduled into a roadmap phase
- One or more approved use cases distilled from the spec (the engineering handoff)
- Business rule updates if needed

### Level 3: Product model change

Examples:

- Change escrow release rules
- Add partial settlement
- Add milestone-based fulfillment
- Add organization-level payout policies

Expected artifacts:

- Product decision record
- Updated business rules
- Updated roadmap
- Feature specs
- New or amended use cases for every behavior the change touches
- Migration or compatibility notes if needed

## Prioritization model

Prioritize features using four questions:

1. **Trust impact:** Does this increase trust in the transaction?
2. **Transaction impact:** Does this help more orders complete successfully?
3. **Operational impact:** Does this reduce support, dispute, or reconciliation burden?
4. **Learning impact:** Does this teach something important about the product direction?

Suggested scoring:

| Score | Meaning              |
| ----- | -------------------- |
| 3     | Strong direct impact |
| 2     | Moderate impact      |
| 1     | Minor impact         |
| 0     | No meaningful impact |

A feature with high trust and transaction impact should usually be prioritized before a feature that is only cosmetically useful.

## Product review cadence

Suggested repo-based product review:

### Weekly

- Review new ideas in `docs/product/ideas/`
- Promote promising ideas into specs or backlog items
- Close weak ideas with a short reason
- Update MVP scope if necessary

### Per feature

- Confirm the user journey
- Confirm states and edge cases
- Confirm timeline and notification behavior
- Confirm acceptance criteria
- Confirm success metric

### Per release

- Shrink finished roadmap phases into the Done section
- Check the use-case index matches what shipped
- Update success metrics
- Document major decisions
- Add follow-up ideas discovered during implementation

## Definition of product done

A feature is product-complete when:

- The user can understand what the feature does
- The next action is clear in all major states
- Failure states are handled
- Permissions are clear
- Important actions are visible in the timeline or activity history
- Money movement is clear when relevant
- Business rules are documented
- The feature has acceptance criteria
- The feature can be measured after release

## Brainstorming prompts

Use these when expanding the product or shaping a rough idea in `discovery.md` / `ideas/`.

### Trust prompts

- What would make the buyer hesitate before paying?
- What would make the seller hesitate before fulfilling?
- What does each party need to see to trust the transaction?
- What could feel unfair?
- What decisions need an explanation?

### Timeline prompts

- What does the user think is happening right now?
- What actually happened behind the scenes?
- What should be visible to the user?
- What should be operator-only?
- What is the next action?

### Money prompts

- Where is the money right now?
- Who can cause it to move?
- What policy allows the movement?
- What does the buyer see? What does the seller see? What does the operator need to inspect?

### Dispute prompts

- What evidence is needed?
- What response should the other party provide?
- What decisions are possible?
- What happens to escrow during review?
- How is the final decision explained?

### Dashboard prompts

- What does this user need to act on today?
- Which orders are risky or stuck?
- Which numbers help decision-making? Which are vanity metrics?
- What should be filterable?

### AI prompts

- What source records would the AI use?
- Does AI summarize or decide?
- How does the user verify the answer?
- What happens if the AI is wrong?
- Should the AI output be saved or temporary?

## Keeping product docs useful

- Prefer concrete user journeys over abstract descriptions.
- Prefer explicit rules over vague intentions.
- Prefer small release slices over large wish lists.
- Prefer measurable outcomes over "nice to have" language.
- Keep rejected ideas with a short reason when the reasoning is useful.
- After release, fold back what was learned: what shipped, what was learned, metrics observed, follow-up ideas — into the idea/spec or `roadmap.md`, not a new file.
