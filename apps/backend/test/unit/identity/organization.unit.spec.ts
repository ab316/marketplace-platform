import { describe, expect, it } from 'vitest';

import {
  LastOwnerError,
  MemberNotFoundError,
  OrganizationStateError,
  SelfMembershipChangeError,
} from '../../../src/modules/identity/domain/errors.ts';
import { Organization } from '../../../src/modules/identity/domain/organization.ts';
import type { OrganizationRole } from '../../../src/modules/identity/domain/roles.ts';

const NOW = new Date('2026-10-24T09:00:00.000Z');
const LATER = new Date('2026-10-24T10:00:00.000Z');

let sequence = 0;
const entryId = (): string => `aud_${(sequence += 1)}`;

const foundOrganization = (): Organization =>
  Organization.found({
    id: 'org_1',
    name: 'Nordic Refurb',
    description: null,
    founderUserId: 'usr_owner',
    now: NOW,
    auditEntryId: entryId(),
  });

const withMember = (userId: string, role: OrganizationRole): Organization => {
  const organization = foundOrganization();
  organization.addMember({
    userId,
    role,
    actorUserId: 'usr_owner',
    now: NOW,
    auditEntryId: entryId(),
  });
  return organization;
};

describe('Organization.found', () => {
  it('makes the creator the first owner and records it', () => {
    const organization = foundOrganization();

    expect(organization.status).toBe('active');
    expect(organization.members).toEqual([
      expect.objectContaining({ userId: 'usr_owner', role: 'owner' }),
    ]);
    expect(organization.auditTrail).toEqual([
      expect.objectContaining({ sequence: 1, type: 'organization_created' }),
    ]);
  });

  it('requires a name', () => {
    expect(() =>
      Organization.found({
        id: 'org_1',
        name: '   ',
        description: null,
        founderUserId: 'usr_owner',
        now: NOW,
        auditEntryId: entryId(),
      })
    ).toThrow(/name is required/i);
  });
});

describe('membership rules', () => {
  it('appends an audit entry for every change, in order', () => {
    const organization = withMember('usr_manager', 'manager');
    organization.changeMemberRole({
      userId: 'usr_manager',
      role: 'viewer',
      actorUserId: 'usr_owner',
      now: LATER,
      auditEntryId: entryId(),
    });

    expect(organization.auditTrail.map((entry) => [entry.sequence, entry.type])).toEqual([
      [1, 'organization_created'],
      [2, 'member_added'],
      [3, 'member_role_changed'],
    ]);
  });

  it('rejects adding the same user twice', () => {
    const organization = withMember('usr_manager', 'manager');

    expect(() =>
      organization.addMember({
        userId: 'usr_manager',
        role: 'viewer',
        actorUserId: 'usr_owner',
        now: LATER,
        auditEntryId: entryId(),
      })
    ).toThrow(/already a member/i);
  });

  it('rejects a role change for someone who is not a member', () => {
    const organization = foundOrganization();

    expect(() =>
      organization.changeMemberRole({
        userId: 'usr_stranger',
        role: 'viewer',
        actorUserId: 'usr_owner',
        now: LATER,
        auditEntryId: entryId(),
      })
    ).toThrow(MemberNotFoundError);
  });
});

describe('the last owner is protected', () => {
  it('refuses to demote the only owner', () => {
    const organization = withMember('usr_manager', 'manager');

    expect(() =>
      organization.changeMemberRole({
        userId: 'usr_owner',
        role: 'viewer',
        actorUserId: 'usr_manager',
        now: LATER,
        auditEntryId: entryId(),
      })
    ).toThrow(LastOwnerError);
    expect(organization.memberFor('usr_owner')?.role).toBe('owner');
  });

  it('refuses to remove the only owner', () => {
    const organization = withMember('usr_manager', 'manager');

    expect(() =>
      organization.removeMember({
        userId: 'usr_owner',
        actorUserId: 'usr_manager',
        now: LATER,
        auditEntryId: entryId(),
      })
    ).toThrow(LastOwnerError);
    expect(organization.members).toHaveLength(2);
  });

  it('allows demoting an owner once a second owner exists', () => {
    const organization = withMember('usr_second', 'owner');

    organization.changeMemberRole({
      userId: 'usr_second',
      role: 'viewer',
      actorUserId: 'usr_owner',
      now: LATER,
      auditEntryId: entryId(),
    });

    expect(organization.memberFor('usr_second')?.role).toBe('viewer');
  });
});

describe('nobody changes their own membership', () => {
  it('refuses a self role change, even for an owner', () => {
    const organization = withMember('usr_second', 'owner');

    expect(() =>
      organization.changeMemberRole({
        userId: 'usr_second',
        role: 'manager',
        actorUserId: 'usr_second',
        now: LATER,
        auditEntryId: entryId(),
      })
    ).toThrow(SelfMembershipChangeError);
  });

  it('refuses self removal', () => {
    const organization = withMember('usr_second', 'owner');

    expect(() =>
      organization.removeMember({
        userId: 'usr_second',
        actorUserId: 'usr_second',
        now: LATER,
        auditEntryId: entryId(),
      })
    ).toThrow(SelfMembershipChangeError);
  });
});

const deactivated = (): Organization => {
  const organization = withMember('usr_manager', 'manager');
  organization.deactivate({
    reason: 'Fraud investigation',
    actorUserId: 'usr_staff',
    now: LATER,
    auditEntryId: entryId(),
  });
  return organization;
};

describe('deactivation freezes the organization without deleting anything', () => {
  it('keeps members and history after deactivation', () => {
    const organization = deactivated();

    expect(organization.status).toBe('deactivated');
    expect(organization.members).toHaveLength(2);
    expect(organization.auditTrail.at(-1)).toMatchObject({
      type: 'organization_deactivated',
      details: { reason: 'Fraud investigation' },
    });
  });

  it('refuses member changes while deactivated', () => {
    const organization = deactivated();

    expect(() =>
      organization.addMember({
        userId: 'usr_new',
        role: 'viewer',
        actorUserId: 'usr_owner',
        now: LATER,
        auditEntryId: entryId(),
      })
    ).toThrow(OrganizationStateError);
  });

  it('refuses a second deactivation but allows reactivation', () => {
    const organization = deactivated();

    expect(() =>
      organization.deactivate({
        reason: 'again',
        actorUserId: 'usr_staff',
        now: LATER,
        auditEntryId: entryId(),
      })
    ).toThrow(OrganizationStateError);

    organization.reactivate({
      reason: 'Investigation closed',
      actorUserId: 'usr_staff',
      now: LATER,
      auditEntryId: entryId(),
    });

    expect(organization.status).toBe('active');
    expect(organization.state.deactivatedAt).toBeNull();
  });
});
