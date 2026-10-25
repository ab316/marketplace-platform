import type { Clock, IdGenerator } from '@acme/core-contracts';

import { OrganizationNotFoundError } from '../../domain/errors.ts';
import type { Organization } from '../../domain/organization.ts';
import { type ActorContext, assertPlatformAdmin } from '../actor-context.ts';
import { loadOrganizationForMember } from '../load-organization.ts';
import { type OrganizationView, toOrganizationView } from '../organization-view.ts';
import type { OrganizationRepository } from '../ports.ts';

export interface UpdateOrganizationProfileCommand {
  readonly actor: ActorContext;
  readonly organizationId: string;
  readonly name?: string | undefined;
  readonly description?: string | undefined;
}

export interface OrganizationLifecycleCommand {
  readonly actor: ActorContext;
  readonly organizationId: string;
  readonly reason: string;
}

interface LifecycleDependencies {
  readonly organizations: OrganizationRepository;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

/** Edits the organization's public profile. Owners only. */
export class UpdateOrganizationProfile {
  readonly #deps: LifecycleDependencies;

  constructor(deps: LifecycleDependencies) {
    this.#deps = deps;
  }

  async execute(command: UpdateOrganizationProfileCommand): Promise<OrganizationView> {
    const { organizations, clock, ids } = this.#deps;

    const organization = await loadOrganizationForMember(
      organizations,
      command.organizationId,
      command.actor,
      'organization:write'
    );

    organization.updateProfile({
      name: command.name,
      description: command.description,
      actorUserId: command.actor.userId,
      now: clock.now(),
      auditEntryId: ids.next(),
    });

    await organizations.save(organization);
    return toOrganizationView(organization);
  }
}

/**
 * Retires an organization (UC-003 A3). Marketplace staff only.
 *
 * Nothing is deleted (PD-0003): the organization's listings stop being discoverable and its
 * members stop being able to write, but listings, orders, and audit history all survive so the
 * marketplace stays auditable.
 */
export class DeactivateOrganization {
  readonly #deps: LifecycleDependencies;

  constructor(deps: LifecycleDependencies) {
    this.#deps = deps;
  }

  async execute(command: OrganizationLifecycleCommand): Promise<OrganizationView> {
    const { organizations, clock, ids } = this.#deps;
    const organization = await loadForStaff(organizations, command);

    organization.deactivate({
      reason: command.reason,
      actorUserId: command.actor.userId,
      now: clock.now(),
      auditEntryId: ids.next(),
    });

    await organizations.save(organization);
    return toOrganizationView(organization);
  }
}

/** Restores a deactivated organization. Marketplace staff only. */
export class ReactivateOrganization {
  readonly #deps: LifecycleDependencies;

  constructor(deps: LifecycleDependencies) {
    this.#deps = deps;
  }

  async execute(command: OrganizationLifecycleCommand): Promise<OrganizationView> {
    const { organizations, clock, ids } = this.#deps;
    const organization = await loadForStaff(organizations, command);

    organization.reactivate({
      reason: command.reason,
      actorUserId: command.actor.userId,
      now: clock.now(),
      auditEntryId: ids.next(),
    });

    await organizations.save(organization);
    return toOrganizationView(organization);
  }
}

const loadForStaff = async (
  organizations: OrganizationRepository,
  command: OrganizationLifecycleCommand
): Promise<Organization> => {
  assertPlatformAdmin(command.actor);

  const organization = await organizations.findById(command.organizationId);
  if (organization === null) {
    throw new OrganizationNotFoundError(command.organizationId);
  }
  return organization;
};
