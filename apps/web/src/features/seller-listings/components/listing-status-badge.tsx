import type { ListingStatus } from '@acme/api-contracts';

import { Badge } from '../../../components/ui/badge.tsx';

const LABEL: Record<ListingStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

const VARIANT: Record<ListingStatus, 'neutral' | 'success' | 'outline'> = {
  draft: 'neutral',
  active: 'success',
  archived: 'outline',
};

/** The listing lifecycle status as a word plus colour, never colour alone (REPO_MAP.md §8). */
export const ListingStatusBadge = ({ status }: { readonly status: ListingStatus }) => (
  <Badge variant={VARIANT[status]}>{LABEL[status]}</Badge>
);
