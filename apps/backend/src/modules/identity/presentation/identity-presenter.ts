import type {
  CurrentUser,
  Organization as OrganizationResponse,
  OrganizationAuditEntry as OrganizationAuditEntryResponse,
  OrganizationAuditResponse,
  OrganizationListResponse,
  OrganizationMember as OrganizationMemberResponse,
  OrganizationMemberListResponse,
  SessionResponse,
} from '@acme/api-contracts';

import type { ActorContext } from '../application/actor-context.ts';
import type {
  OrganizationAuditEntryView,
  OrganizationMemberView,
  OrganizationView,
} from '../application/organization-view.ts';
import type { OrganizationListView } from '../application/queries/organization-queries.ts';

/** Plain-language wording for the audit trail, rendered at the boundary like order timelines. */
const SUMMARIES: Record<
  OrganizationAuditEntryView['type'],
  (details: Readonly<Record<string, unknown>>) => string
> = {
  organization_created: () => 'Organization created',
  organization_profile_updated: () => 'Organization profile updated',
  member_added: (details) => `Member added as ${String(details['role'])}`,
  member_role_changed: (details) =>
    `Member role changed from ${String(details['previousRole'])} to ${String(details['role'])}`,
  member_removed: () => 'Member removed',
  organization_deactivated: () => 'Organization deactivated by marketplace staff',
  organization_reactivated: () => 'Organization reactivated by marketplace staff',
};

const summarize = (entry: OrganizationAuditEntryView): string =>
  SUMMARIES[entry.type](entry.details);

export const toCurrentUser = (actor: ActorContext): CurrentUser => ({
  id: actor.userId,
  email: actor.email,
  displayName: actor.displayName,
  isPlatformAdmin: actor.isPlatformAdmin,
  membership:
    actor.membership === null
      ? null
      : {
          organizationId: actor.membership.organizationId,
          organizationName: actor.membership.organizationName,
          organizationStatus: actor.membership.organizationStatus,
          role: actor.membership.role,
        },
});

export const toSessionResponse = (
  token: string,
  expiresAt: Date,
  actor: ActorContext
): SessionResponse => ({
  token,
  expiresAt: expiresAt.toISOString(),
  user: toCurrentUser(actor),
});

export const toOrganizationResponse = (view: OrganizationView): OrganizationResponse => ({
  id: view.id,
  name: view.name,
  description: view.description,
  status: view.status,
  memberCount: view.memberCount,
  createdAt: view.createdAt.toISOString(),
  deactivatedAt: view.deactivatedAt?.toISOString() ?? null,
});

export const toOrganizationListResponse = (
  view: OrganizationListView
): OrganizationListResponse => ({
  items: view.items.map(toOrganizationResponse),
  total: view.total,
});

const toMemberResponse = (view: OrganizationMemberView): OrganizationMemberResponse => ({
  userId: view.userId,
  email: view.email,
  displayName: view.displayName,
  role: view.role,
  addedAt: view.addedAt.toISOString(),
});

export const toMemberListResponse = (
  views: readonly OrganizationMemberView[]
): OrganizationMemberListResponse => ({ items: views.map(toMemberResponse) });

const toAuditEntryResponse = (
  view: OrganizationAuditEntryView
): OrganizationAuditEntryResponse => ({
  id: view.id,
  sequence: view.sequence,
  type: view.type,
  occurredAt: view.occurredAt.toISOString(),
  actorUserId: view.actorUserId,
  summary: summarize(view),
  details: view.details,
});

export const toAuditResponse = (
  views: readonly OrganizationAuditEntryView[]
): OrganizationAuditResponse => ({ items: views.map(toAuditEntryResponse) });
