import type { Clock, IdGenerator } from '@acme/core-contracts';

import { AlreadyInOrganizationError } from '../../domain/errors.ts';
import { Organization } from '../../domain/organization.ts';
import { type OrganizationView, toOrganizationView } from '../organization-view.ts';
import type { OrganizationRepository } from '../ports.ts';

export interface CreateOrganizationCommand {
  readonly actorUserId: string;
  readonly name: string;
  readonly description?: string | undefined;
}

/**
 * Self-serve seller onboarding (PD-0003, UC-003 C1–C3): the creator becomes the organization's
 * first owner. A user may only ever belong to one organization.
 */
export class CreateOrganization {
  readonly #organizations: OrganizationRepository;
  readonly #clock: Clock;
  readonly #ids: IdGenerator;

  constructor(organizations: OrganizationRepository, clock: Clock, ids: IdGenerator) {
    this.#organizations = organizations;
    this.#clock = clock;
    this.#ids = ids;
  }

  async execute(command: CreateOrganizationCommand): Promise<OrganizationView> {
    const existing = await this.#organizations.findByMemberUserId(command.actorUserId);
    if (existing !== null) {
      throw new AlreadyInOrganizationError('You already belong to an organization.', {
        organizationId: existing.id,
      });
    }

    const organization = Organization.found({
      id: this.#ids.next(),
      name: command.name,
      description: command.description ?? null,
      founderUserId: command.actorUserId,
      now: this.#clock.now(),
      auditEntryId: this.#ids.next(),
    });

    await this.#organizations.insert(organization);
    return toOrganizationView(organization);
  }
}
