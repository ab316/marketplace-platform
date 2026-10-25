import type { OrganizationRepository } from '../ports.ts';

/**
 * Internal lookup used by other modules to honour organization deactivation (UC-003 E6).
 *
 * Not exposed over HTTP and takes no actor: it answers a structural question ("may this
 * organization transact?"), not a user-facing one, so there is nothing to authorize. Consumers
 * reach it through a port adapted in `src/bootstrap/`, never by importing this module's
 * internals.
 */
export class OrganizationDirectory {
  readonly #organizations: OrganizationRepository;

  constructor(organizations: OrganizationRepository) {
    this.#organizations = organizations;
  }

  /**
   * Deactivated organizations are the exception, so listing them is cheaper than joining every
   * catalogue query against organization status.
   */
  async deactivatedOrganizationIds(): Promise<readonly string[]> {
    const page = await this.#organizations.search({
      status: 'deactivated',
      limit: MAX_DEACTIVATED,
      offset: 0,
    });

    return page.items.map((organization) => organization.id);
  }

  /** `false` for an unknown organization too: nothing unknown may transact. */
  async isActive(organizationId: string): Promise<boolean> {
    const organization = await this.#organizations.findById(organizationId);
    return organization?.isActive ?? false;
  }
}

/**
 * A practical ceiling for a pre-launch marketplace. If deactivated organizations ever approach
 * this many, the catalogue should filter by a join instead of an exclusion list.
 */
const MAX_DEACTIVATED = 1000;
