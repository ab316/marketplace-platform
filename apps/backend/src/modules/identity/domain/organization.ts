import {
  InvalidOrganizationDataError,
  LastOwnerError,
  MemberNotFoundError,
  OrganizationStateError,
  SelfMembershipChangeError,
} from './errors.ts';
import type { OrganizationRole } from './roles.ts';

export type OrganizationStatus = 'active' | 'deactivated';

export type OrganizationAuditEntryType =
  | 'organization_created'
  | 'organization_profile_updated'
  | 'member_added'
  | 'member_role_changed'
  | 'member_removed'
  | 'organization_deactivated'
  | 'organization_reactivated';

/** One recorded change to the organization or its membership. Append-only. */
export interface OrganizationAuditEntry {
  readonly id: string;
  readonly sequence: number;
  readonly type: OrganizationAuditEntryType;
  readonly occurredAt: Date;
  readonly actorUserId: string | null;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface Membership {
  readonly userId: string;
  readonly role: OrganizationRole;
  readonly addedAt: Date;
  readonly addedByUserId: string | null;
}

export interface OrganizationState {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: OrganizationStatus;
  readonly members: readonly Membership[];
  readonly auditTrail: readonly OrganizationAuditEntry[];
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly deactivatedAt: Date | null;
}

export interface FoundOrganizationInput {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly founderUserId: string;
  readonly now: Date;
  readonly auditEntryId: string;
}

export interface AddMemberInput {
  readonly userId: string;
  readonly role: OrganizationRole;
  readonly actorUserId: string;
  readonly now: Date;
  readonly auditEntryId: string;
}

export interface ChangeMemberRoleInput {
  readonly userId: string;
  readonly role: OrganizationRole;
  readonly actorUserId: string;
  readonly now: Date;
  readonly auditEntryId: string;
}

export interface RemoveMemberInput {
  readonly userId: string;
  readonly actorUserId: string;
  readonly now: Date;
  readonly auditEntryId: string;
}

export interface UpdateProfileInput {
  readonly name?: string | undefined;
  readonly description?: string | undefined;
  readonly actorUserId: string;
  readonly now: Date;
  readonly auditEntryId: string;
}

export interface LifecycleInput {
  readonly reason: string;
  readonly actorUserId: string;
  readonly now: Date;
  readonly auditEntryId: string;
}

/**
 * A seller organization and the people who act for it.
 *
 * Membership lives inside this aggregate so the rules that span members are enforced in one
 * place, under one optimistic-locking guard (UC-003).
 *
 * Invariants:
 * - At least one owner at all times; the last owner can be neither demoted nor removed.
 * - A user appears at most once in the member list.
 * - Nobody may change or remove their own membership.
 * - A deactivated organization accepts no writes other than reactivation.
 * - Every change appends an audit entry, so the history is always complete.
 */
export class Organization {
  #state: OrganizationState;

  private constructor(state: OrganizationState) {
    this.#state = state;
  }

  static found(input: FoundOrganizationInput): Organization {
    const name = input.name.trim();
    if (name.length === 0) {
      throw new InvalidOrganizationDataError('An organization name is required.');
    }

    const founder: Membership = {
      userId: input.founderUserId,
      role: 'owner',
      addedAt: input.now,
      addedByUserId: null,
    };

    return new Organization({
      id: input.id,
      name,
      description: normalizeDescription(input.description),
      status: 'active',
      members: [founder],
      auditTrail: [
        {
          id: input.auditEntryId,
          sequence: 1,
          type: 'organization_created',
          occurredAt: input.now,
          actorUserId: input.founderUserId,
          details: { name },
        },
      ],
      version: 1,
      createdAt: input.now,
      updatedAt: input.now,
      deactivatedAt: null,
    });
  }

  /** Rehydrates persisted state without re-running founding rules. */
  static restore(state: OrganizationState): Organization {
    return new Organization(state);
  }

  get state(): OrganizationState {
    return this.#state;
  }

  get id(): string {
    return this.#state.id;
  }

  get name(): string {
    return this.#state.name;
  }

  get status(): OrganizationStatus {
    return this.#state.status;
  }

  get version(): number {
    return this.#state.version;
  }

  get members(): readonly Membership[] {
    return this.#state.members;
  }

  get auditTrail(): readonly OrganizationAuditEntry[] {
    return this.#state.auditTrail;
  }

  get isActive(): boolean {
    return this.#state.status === 'active';
  }

  memberFor(userId: string): Membership | null {
    return this.#state.members.find((member) => member.userId === userId) ?? null;
  }

  addMember(input: AddMemberInput): void {
    this.#assertWritable();
    if (this.memberFor(input.userId) !== null) {
      throw new InvalidOrganizationDataError('That user is already a member.', {
        userId: input.userId,
      });
    }

    const member: Membership = {
      userId: input.userId,
      role: input.role,
      addedAt: input.now,
      addedByUserId: input.actorUserId,
    };

    this.#apply({
      members: [...this.#state.members, member],
      entry: {
        id: input.auditEntryId,
        type: 'member_added',
        actorUserId: input.actorUserId,
        details: { userId: input.userId, role: input.role },
      },
      now: input.now,
    });
  }

  changeMemberRole(input: ChangeMemberRoleInput): void {
    this.#assertWritable();
    if (input.userId === input.actorUserId) {
      throw new SelfMembershipChangeError();
    }

    const existing = this.memberFor(input.userId);
    if (existing === null) {
      throw new MemberNotFoundError(input.userId);
    }
    if (existing.role === input.role) {
      throw new InvalidOrganizationDataError('That member already has this role.', {
        userId: input.userId,
        role: input.role,
      });
    }

    const members = this.#state.members.map((member) =>
      member.userId === input.userId ? { ...member, role: input.role } : member
    );
    assertHasOwner(members);

    this.#apply({
      members,
      entry: {
        id: input.auditEntryId,
        type: 'member_role_changed',
        actorUserId: input.actorUserId,
        details: { userId: input.userId, previousRole: existing.role, role: input.role },
      },
      now: input.now,
    });
  }

  removeMember(input: RemoveMemberInput): void {
    this.#assertWritable();
    if (input.userId === input.actorUserId) {
      throw new SelfMembershipChangeError();
    }

    const existing = this.memberFor(input.userId);
    if (existing === null) {
      throw new MemberNotFoundError(input.userId);
    }

    const members = this.#state.members.filter((member) => member.userId !== input.userId);
    assertHasOwner(members);

    this.#apply({
      members,
      entry: {
        id: input.auditEntryId,
        type: 'member_removed',
        actorUserId: input.actorUserId,
        details: { userId: input.userId, previousRole: existing.role },
      },
      now: input.now,
    });
  }

  updateProfile(input: UpdateProfileInput): void {
    this.#assertWritable();

    const name = input.name === undefined ? this.#state.name : input.name.trim();
    if (name.length === 0) {
      throw new InvalidOrganizationDataError('An organization name is required.');
    }
    const description =
      input.description === undefined
        ? this.#state.description
        : normalizeDescription(input.description);

    this.#state = {
      ...this.#state,
      name,
      description,
      updatedAt: input.now,
      auditTrail: [
        ...this.#state.auditTrail,
        this.#nextEntry({
          id: input.auditEntryId,
          type: 'organization_profile_updated',
          actorUserId: input.actorUserId,
          details: { name },
          occurredAt: input.now,
        }),
      ],
    };
  }

  /**
   * Retires an organization without destroying anything (PD-0003). Listings stop being
   * discoverable and seller writes stop, but every listing, order, and audit entry survives.
   */
  deactivate(input: LifecycleInput): void {
    if (this.#state.status === 'deactivated') {
      throw new OrganizationStateError('This organization is already deactivated.', {
        organizationId: this.#state.id,
      });
    }

    this.#state = {
      ...this.#state,
      status: 'deactivated',
      deactivatedAt: input.now,
      updatedAt: input.now,
      auditTrail: [
        ...this.#state.auditTrail,
        this.#nextEntry({
          id: input.auditEntryId,
          type: 'organization_deactivated',
          actorUserId: input.actorUserId,
          details: { reason: input.reason },
          occurredAt: input.now,
        }),
      ],
    };
  }

  reactivate(input: LifecycleInput): void {
    if (this.#state.status === 'active') {
      throw new OrganizationStateError('This organization is already active.', {
        organizationId: this.#state.id,
      });
    }

    this.#state = {
      ...this.#state,
      status: 'active',
      deactivatedAt: null,
      updatedAt: input.now,
      auditTrail: [
        ...this.#state.auditTrail,
        this.#nextEntry({
          id: input.auditEntryId,
          type: 'organization_reactivated',
          actorUserId: input.actorUserId,
          details: { reason: input.reason },
          occurredAt: input.now,
        }),
      ],
    };
  }

  #assertWritable(): void {
    if (this.#state.status !== 'active') {
      throw new OrganizationStateError(
        'This organization is deactivated and cannot be changed. Contact marketplace staff.',
        { organizationId: this.#state.id }
      );
    }
  }

  #apply(change: {
    members: readonly Membership[];
    entry: Omit<OrganizationAuditEntry, 'sequence' | 'occurredAt'>;
    now: Date;
  }): void {
    this.#state = {
      ...this.#state,
      members: change.members,
      updatedAt: change.now,
      auditTrail: [
        ...this.#state.auditTrail,
        this.#nextEntry({ ...change.entry, occurredAt: change.now }),
      ],
    };
  }

  #nextEntry(entry: Omit<OrganizationAuditEntry, 'sequence'>): OrganizationAuditEntry {
    return { ...entry, sequence: this.#state.auditTrail.length + 1 };
  }
}

function assertHasOwner(members: readonly Membership[]): void {
  if (!members.some((member) => member.role === 'owner')) {
    throw new LastOwnerError();
  }
}

const normalizeDescription = (description: string | null | undefined): string | null => {
  if (description === null || description === undefined) {
    return null;
  }
  const trimmed = description.trim();
  return trimmed.length === 0 ? null : trimmed;
};
