import 'server-only';
import { type Organization, organizationSchema } from '@acme/api-contracts';

import { apiRequest } from '../api-client.ts';

/**
 * The caller's own organization for the seller home (UC-003). The id comes from the actor's
 * membership — never from user input — so the backend's membership check is the only
 * authorization in play, exactly as ADR-011 §4 wants it.
 */
export const getOrganization = async (organizationId: string): Promise<Organization> =>
  apiRequest({
    path: `/api/organizations/${organizationId}`,
    schema: organizationSchema,
  });
