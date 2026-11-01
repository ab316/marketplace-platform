import type { Organization, OrganizationRole } from '@acme/api-contracts';
import { AlertTriangle } from 'lucide-react';

import { Badge } from '../../../components/ui/badge.tsx';
import { Card, CardContent } from '../../../components/ui/card.tsx';

const ROLE_WORD: Record<OrganizationRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  viewer: 'Viewer',
};

const dateFormatter = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' });

/**
 * The seller home's organization card (UC-003; design `docs/design/seller-organization-setup.md`).
 * Synchronous and presentational per ADR-013; the page shell fetches and passes plain props.
 *
 * A deactivated organization shows the status banner and the page around this card offers no
 * write actions — absent, not disabled (UC-003 E6).
 */
export const OrganizationSummary = ({
  organization,
  role,
}: {
  readonly organization: Organization;
  readonly role: OrganizationRole;
}) => (
  <div className="flex flex-col gap-4">
    {organization.status === 'deactivated' ? (
      <div
        role="alert"
        className="border-warning/35 bg-warning/10 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
      >
        <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          Your organization was deactivated by marketplace staff
          {organization.deactivatedAt === null
            ? ''
            : ` on ${dateFormatter.format(new Date(organization.deactivatedAt))}`}
          . Its listings are hidden from buyers and seller actions are paused; existing orders
          continue. Contact support if you believe this is a mistake.
        </p>
      </div>
    ) : null}

    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">{organization.name}</h2>
          <Badge variant={organization.status === 'active' ? 'success' : 'warning'}>
            {organization.status === 'active' ? 'Active' : 'Deactivated'}
          </Badge>
        </div>

        <p className="text-muted-foreground text-sm">
          {organization.description ?? 'No description yet.'}
        </p>

        <dl className="text-muted-foreground grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-3">
          <div className="flex gap-2">
            <dt className="font-medium">Your role:</dt>
            <dd>{ROLE_WORD[role]}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Members:</dt>
            <dd>{organization.memberCount}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Created:</dt>
            <dd>{dateFormatter.format(new Date(organization.createdAt))}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  </div>
);
