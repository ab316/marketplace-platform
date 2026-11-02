import { AlertTriangle } from 'lucide-react';

import { formatLongDate } from '../../../lib/formatting/date.ts';

/**
 * Shown on every seller page of a deactivated organization (UC-003 E6). The page around it
 * offers no write actions — absent, not disabled. The date is optional because the actor's
 * membership carries the status but not the timestamp; pages that fetch the organization show it.
 */
export const DeactivationBanner = ({
  deactivatedAt,
}: {
  readonly deactivatedAt?: string | null | undefined;
}) => (
  <div
    role="alert"
    className="border-warning/35 bg-warning/10 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
  >
    <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <p>
      Your organization was deactivated by marketplace staff
      {deactivatedAt === null || deactivatedAt === undefined
        ? ''
        : ` on ${formatLongDate(deactivatedAt)}`}
      . Its listings are hidden from buyers and seller actions are paused; existing orders continue.
      Contact support if you believe this is a mistake.
    </p>
  </div>
);
