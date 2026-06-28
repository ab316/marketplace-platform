# Design References

UI/UX design happens **outside this repo** — in Figma and specialized UI/design AI tools. This folder is where finished design enters the workflow as an **input** the agents and implementers consume. It is not where design is produced.

See the "Design" section of `AGENTS.md` for how design fits the development loop.

## What lives here

One lightweight spec per feature/surface, named after the feature (e.g. `seller-withdrawal.md`), created from `TEMPLATE.md`. Each spec:

- links to the **Figma source** (the canonical visual truth),
- captures what implementers and reviewers need without opening Figma: route, user states, key components, interaction notes, accessibility requirements,
- is referenced from the related use case (`docs/product/use-cases/`) and/or GitHub issue.

## How it's used

- `/implement` builds **against** the spec.
- `/review` checks the built UI **against** it — all states present, accessibility covered, interaction matches.

Keep specs short. The Figma file holds pixels; this file holds the durable, reviewable contract that survives link rot and gives agents enough to work from.
