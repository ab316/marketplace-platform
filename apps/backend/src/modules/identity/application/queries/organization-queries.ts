import type { ActorContext } from '../actor-context.ts';
import { assertPlatformAdmin } from '../actor-context.ts';
import { loadOrganizationForReader } from '../load-organization.ts';
import {
  type OrganizationAuditEntryView,
  type OrganizationMemberView,
  type OrganizationView,
  toAuditEntryViews,
  toMemberViews,
  toOrganizationView,
} from '../organization-view.ts';
import type { OrganizationRepository, UserRepository } from '../ports.ts';

export interface OrganizationQuery {
  readonly actor: ActorContext;
  readonly organizationId: string;
}

export interface ListOrganizationsQuery {
  readonly actor: ActorContext;
  readonly status?: 'active' | 'deactivated' | undefined;
  readonly limit: number;
  readonly offset: number;
}

export interface OrganizationListView {
  readonly items: readonly OrganizationView[];
  readonly total: number;
}

/** Organization profile, visible to its members and to marketplace staff. */
export class GetOrganization {
  readonly #organizations: OrganizationRepository;

  constructor(organizations: OrganizationRepository) {
    this.#organizations = organizations;
  }

  async execute(query: OrganizationQuery): Promise<OrganizationView> {
    const organization = await loadOrganizationForReader(
      this.#organizations,
      query.organizationId,
      query.actor
    );
    return toOrganizationView(organization);
  }
}

/** Member list, visible to its members and to marketplace staff. */
export class ListOrganizationMembers {
  readonly #organizations: OrganizationRepository;
  readonly #users: UserRepository;

  constructor(organizations: OrganizationRepository, users: UserRepository) {
    this.#organizations = organizations;
    this.#users = users;
  }

  async execute(query: OrganizationQuery): Promise<readonly OrganizationMemberView[]> {
    const organization = await loadOrganizationForReader(
      this.#organizations,
      query.organizationId,
      query.actor
    );

    const users = await this.#users.findManyByIds(
      organization.members.map((member) => member.userId)
    );
    return toMemberViews(organization, users);
  }
}

/** Append-only history of membership and lifecycle changes (UC-003 M4). */
export class GetOrganizationAudit {
  readonly #organizations: OrganizationRepository;

  constructor(organizations: OrganizationRepository) {
    this.#organizations = organizations;
  }

  async execute(query: OrganizationQuery): Promise<readonly OrganizationAuditEntryView[]> {
    const organization = await loadOrganizationForReader(
      this.#organizations,
      query.organizationId,
      query.actor
    );
    return toAuditEntryViews(organization);
  }
}

/** Cross-organization listing for marketplace staff (UC-003 A1). */
export class ListOrganizations {
  readonly #organizations: OrganizationRepository;

  constructor(organizations: OrganizationRepository) {
    this.#organizations = organizations;
  }

  async execute(query: ListOrganizationsQuery): Promise<OrganizationListView> {
    assertPlatformAdmin(query.actor);

    const page = await this.#organizations.search({
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });

    return { items: page.items.map(toOrganizationView), total: page.total };
  }
}
