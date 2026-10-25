import type { Clock, IdGenerator } from '@acme/core-contracts';

import { AlreadyInOrganizationError, UserNotFoundError } from '../../domain/errors.ts';
import type { OrganizationRole } from '../../domain/roles.ts';
import { type User, normalizeEmail } from '../../domain/user.ts';
import type { ActorContext } from '../actor-context.ts';
import { loadOrganizationForMember } from '../load-organization.ts';
import { type OrganizationMemberView, toMemberViews } from '../organization-view.ts';
import type { OrganizationRepository, UserRepository } from '../ports.ts';

export interface AddMemberCommand {
  readonly actor: ActorContext;
  readonly organizationId: string;
  readonly email: string;
  readonly role: OrganizationRole;
}

export interface ChangeMemberRoleCommand {
  readonly actor: ActorContext;
  readonly organizationId: string;
  readonly userId: string;
  readonly role: OrganizationRole;
}

export interface RemoveMemberCommand {
  readonly actor: ActorContext;
  readonly organizationId: string;
  readonly userId: string;
}

interface MemberCommandDependencies {
  readonly organizations: OrganizationRepository;
  readonly users: UserRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

/**
 * Adds an existing account to the organization (UC-003 M1).
 *
 * The person must already have signed up: inviting an unregistered email needs email delivery
 * and is a later feature. One organization per user, so someone who already belongs elsewhere
 * cannot be added.
 */
export class AddMember {
  readonly #deps: MemberCommandDependencies;

  constructor(deps: MemberCommandDependencies) {
    this.#deps = deps;
  }

  async execute(command: AddMemberCommand): Promise<readonly OrganizationMemberView[]> {
    const { organizations, users, clock, ids } = this.#deps;

    const organization = await loadOrganizationForMember(
      organizations,
      command.organizationId,
      command.actor,
      'members:write'
    );

    const user = await users.findByEmail(normalizeEmail(command.email));
    if (user === null) {
      throw new UserNotFoundError({ email: command.email });
    }

    const current = await organizations.findByMemberUserId(user.id);
    if (current !== null) {
      throw new AlreadyInOrganizationError(
        current.id === organization.id
          ? 'That user is already a member of this organization.'
          : 'That user already belongs to another organization.'
      );
    }

    organization.addMember({
      userId: user.id,
      role: command.role,
      actorUserId: command.actor.userId,
      now: clock.now(),
      auditEntryId: ids.next(),
    });

    await organizations.save(organization);
    return toMemberViews(organization, await loadMemberUsers(users, organization.members));
  }
}

/** Changes a member's role (UC-003 M2), never the caller's own. */
export class ChangeMemberRole {
  readonly #deps: MemberCommandDependencies;

  constructor(deps: MemberCommandDependencies) {
    this.#deps = deps;
  }

  async execute(command: ChangeMemberRoleCommand): Promise<readonly OrganizationMemberView[]> {
    const { organizations, users, clock, ids } = this.#deps;

    const organization = await loadOrganizationForMember(
      organizations,
      command.organizationId,
      command.actor,
      'members:write'
    );

    organization.changeMemberRole({
      userId: command.userId,
      role: command.role,
      actorUserId: command.actor.userId,
      now: clock.now(),
      auditEntryId: ids.next(),
    });

    await organizations.save(organization);
    return toMemberViews(organization, await loadMemberUsers(users, organization.members));
  }
}

/** Removes a member (UC-003 M3). They keep their account and become an ordinary buyer. */
export class RemoveMember {
  readonly #deps: MemberCommandDependencies;

  constructor(deps: MemberCommandDependencies) {
    this.#deps = deps;
  }

  async execute(command: RemoveMemberCommand): Promise<readonly OrganizationMemberView[]> {
    const { organizations, users, clock, ids } = this.#deps;

    const organization = await loadOrganizationForMember(
      organizations,
      command.organizationId,
      command.actor,
      'members:write'
    );

    organization.removeMember({
      userId: command.userId,
      actorUserId: command.actor.userId,
      now: clock.now(),
      auditEntryId: ids.next(),
    });

    await organizations.save(organization);
    return toMemberViews(organization, await loadMemberUsers(users, organization.members));
  }
}

const loadMemberUsers = (
  users: UserRepository,
  members: readonly { userId: string }[]
): Promise<readonly User[]> => users.findManyByIds(members.map((member) => member.userId));
