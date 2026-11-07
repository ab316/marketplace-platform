import type { OrganizationRepository, OrganizationSummary } from '../ports.ts';

/**
 * Internal lookup used by other modules to honour organization deactivation (UC-003 E6) and to
 * name the seller on buyer-facing listings (UC-012).
 *
 * Not exposed over HTTP and takes no actor: it answers structural questions ("may this
 * organization transact?", "what is it called?"), not user-facing ones, so there is nothing to
 * authorize. Consumers reach it through a port adapted in `src/bootstrap/`, never by importing
 * this module's internals. Only the organization's name is published this way; everything else
 * about an organization stays behind its own authorized routes.
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

  /** `null` for an unknown organization: nothing unknown may transact or be shown as a seller. */
  async find(organizationId: string): Promise<OrganizationSummary | null> {
    const [summary] = await this.#organizations.findSummariesByIds([organizationId]);
    return summary ?? null;
  }

  /**
   * One read for a whole page of listings, so naming the seller on every catalogue row costs no
   * round trip per row. Unknown ids are absent from the result.
   */
  async findMany(organizationIds: readonly string[]): Promise<readonly OrganizationSummary[]> {
    return this.#organizations.findSummariesByIds(organizationIds);
  }
}

/**
 * A practical ceiling for a pre-launch marketplace. If deactivated organizations ever approach
 * this many, the catalogue should filter by a join instead of an exclusion list.
 */
const MAX_DEACTIVATED = 1000;
