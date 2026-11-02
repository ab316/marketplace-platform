import type { ReactNode } from 'react';

/**
 * The heading block every seller listing page shares: the organization as an eyebrow, one `h1`,
 * and an optional action beside it. Keeps the page shells to composition (ADR-013).
 */
export const SellerPageHeader = ({
  eyebrow,
  title,
  action,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly action?: ReactNode;
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <p className="text-muted-foreground text-sm">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
    </div>
    {action}
  </div>
);
