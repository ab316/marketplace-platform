import type {
  Organization,
  OrganizationAuditEntryType,
  OrganizationStatus,
} from '../domain/organization.ts';
import type { OrganizationRole } from '../domain/roles.ts';
import type { User } from '../domain/user.ts';

export interface OrganizationView {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: OrganizationStatus;
  readonly memberCount: number;
  readonly createdAt: Date;
  readonly deactivatedAt: Date | null;
}

export interface OrganizationMemberView {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: OrganizationRole;
  readonly addedAt: Date;
}

export interface OrganizationAuditEntryView {
  readonly id: string;
  readonly sequence: number;
  readonly type: OrganizationAuditEntryType;
  readonly occurredAt: Date;
  readonly actorUserId: string | null;
  readonly details: Readonly<Record<string, unknown>>;
}

export const toOrganizationView = (organization: Organization): OrganizationView => {
  const state = organization.state;
  return {
    id: state.id,
    name: state.name,
    description: state.description,
    status: state.status,
    memberCount: state.members.length,
    createdAt: state.createdAt,
    deactivatedAt: state.deactivatedAt,
  };
};

/** Members are joined with their user records so the caller sees names, not opaque ids. */
export const toMemberViews = (
  organization: Organization,
  users: readonly User[]
): readonly OrganizationMemberView[] => {
  const byId = new Map(users.map((user) => [user.id, user]));

  return organization.members.map((member) => {
    const user = byId.get(member.userId);
    return {
      userId: member.userId,
      email: user?.email ?? '',
      displayName: user?.displayName ?? '',
      role: member.role,
      addedAt: member.addedAt,
    };
  });
};

export const toAuditEntryViews = (
  organization: Organization
): readonly OrganizationAuditEntryView[] =>
  organization.auditTrail.map((entry) => ({
    id: entry.id,
    sequence: entry.sequence,
    type: entry.type,
    occurredAt: entry.occurredAt,
    actorUserId: entry.actorUserId,
    details: entry.details,
  }));
