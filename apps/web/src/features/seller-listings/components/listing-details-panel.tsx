import type { DetailSection } from '../view-models.ts';

/**
 * Every disclosure, read-only, grouped as the editor groups them (design "Key components").
 * Used for published listings and for drafts a member cannot edit. Synchronous.
 */
export const ListingDetailsPanel = ({
  sections,
}: {
  readonly sections: readonly DetailSection[];
}) => (
  <div className="flex flex-col gap-6">
    {sections.map((section) => (
      <section key={section.title} aria-label={section.title} className="flex flex-col gap-2">
        <h2 className="text-base font-semibold">{section.title}</h2>
        <dl className="divide-border border-border divide-y rounded-lg border text-sm">
          {section.rows.map((row) => (
            <div key={row.label} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[12rem_1fr]">
              <dt className="text-muted-foreground font-medium">{row.label}</dt>
              <dd
                className={
                  row.value === null ? 'text-muted-foreground italic' : 'whitespace-pre-line'
                }
              >
                {row.value ?? 'Not entered'}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    ))}
  </div>
);
