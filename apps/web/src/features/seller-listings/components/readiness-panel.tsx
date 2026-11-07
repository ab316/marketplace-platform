import type { ListingIssue, ListingReadiness } from '@acme/api-contracts';
import { CheckCircle2, CircleDashed } from 'lucide-react';
import type { ReactNode } from 'react';

import { fieldIdFor, formPathFor } from '../schemas/listing-form.schema.ts';

/** Human field names for readiness issues; the path is the request path. */
const FIELD_LABEL: Readonly<Record<string, string>> = {
  title: 'Title',
  description: 'Description',
  'specifications.brand': 'Brand',
  'specifications.model': 'Model',
  'specifications.cpu': 'CPU',
  'specifications.ramGb': 'RAM',
  'specifications.storageType': 'Storage type',
  'specifications.storageGb': 'Storage',
  'specifications.screenSizeInches': 'Screen size',
  'condition.grade': 'Condition grade',
  'condition.guarantees.batteryHealthMinPercent': 'Battery health floor',
  'condition.guarantees.batteryCycleMin': 'Battery cycles (min)',
  'condition.guarantees.batteryCycleMax': 'Battery cycles (max)',
  'condition.knownDefects': 'Known defects',
  priceMinor: 'Price',
  quantityTotal: 'Quantity',
  fulfillmentExpectations: 'Fulfillment expectations',
};

export const issueLabel = (issue: ListingIssue): string => FIELD_LABEL[issue.path] ?? issue.path;

export interface ReadinessPanelProps {
  /** `null` before the first save: there is no server answer to show yet. */
  readonly readiness: ListingReadiness | null;
  /** When true, each issue is a link that moves focus to its field in the editor. */
  readonly linkToFields: boolean;
  /** The publish control and its reason line, when the member may publish. */
  readonly publish?: ReactNode;
}

const focusField = (path: string) => {
  // `focus()` also scrolls the field into view.
  document.getElementById(fieldIdFor(formPathFor(path)))?.focus();
};

/**
 * What still stands between a draft and publishing (UC-005 step 6, UC-008). It shows the
 * server's answer only, so the form never duplicates the publish bar (REPO_MAP.md §6).
 */
export const ReadinessPanel = ({ readiness, linkToFields, publish }: ReadinessPanelProps) => {
  const count = readiness?.issues.length ?? 0;
  const heading =
    readiness === null
      ? 'Not saved yet'
      : readiness.ready
        ? 'Ready to publish'
        : `${count} ${count === 1 ? 'detail' : 'details'} missing`;

  return (
    <section
      aria-labelledby="readiness-heading"
      className="border-border bg-surface flex flex-col gap-3 rounded-xl border p-5"
    >
      <h2
        id="readiness-heading"
        aria-live="polite"
        className="flex items-center gap-2 text-base font-semibold"
      >
        {readiness?.ready === true ? (
          <CheckCircle2 className="text-success size-5" aria-hidden="true" />
        ) : (
          <CircleDashed className="text-muted-foreground size-5" aria-hidden="true" />
        )}
        {heading}
      </h2>

      {readiness === null ? (
        <p className="text-muted-foreground text-sm">
          Save your draft to see what is still needed before you can publish.
        </p>
      ) : readiness.issues.length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-sm">
          {readiness.issues.map((issue) => (
            <li key={`${issue.path}:${issue.message}`}>
              {linkToFields ? (
                <a
                  href={`#${fieldIdFor(formPathFor(issue.path))}`}
                  onClick={(event) => {
                    event.preventDefault();
                    focusField(issue.path);
                  }}
                  className="text-primary hover:underline"
                >
                  {issueLabel(issue)}
                </a>
              ) : (
                <span className="font-medium">{issueLabel(issue)}</span>
              )}
              <span className="text-muted-foreground">: {issue.message}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {readiness === null ? null : (
        <p className="text-muted-foreground text-xs">Reflects your last save.</p>
      )}
      {publish}
    </section>
  );
};
