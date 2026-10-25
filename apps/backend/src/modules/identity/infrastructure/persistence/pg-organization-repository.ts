import type { Kysely, Transaction } from 'kysely';

import type { Database } from '../../../../shared/infrastructure/database/schema.ts';
import type {
  OrganizationPage,
  OrganizationRepository,
  OrganizationSearchCriteria,
} from '../../application/ports.ts';
import { AlreadyInOrganizationError, OrganizationConcurrencyError } from '../../domain/errors.ts';
import {
  type Membership,
  Organization,
  type OrganizationAuditEntry,
  type OrganizationAuditEntryType,
  type OrganizationState,
  type OrganizationStatus,
} from '../../domain/organization.ts';
import { isOrganizationRole } from '../../domain/roles.ts';

const AUDIT_ENTRY_TYPES: readonly OrganizationAuditEntryType[] = [
  'organization_created',
  'organization_profile_updated',
  'member_added',
  'member_role_changed',
  'member_removed',
  'organization_deactivated',
  'organization_reactivated',
];

/** The column has a CHECK constraint, but the row type is `string`, so narrow it explicitly. */
const toAuditEntryType = (value: string): OrganizationAuditEntryType =>
  AUDIT_ENTRY_TYPES.find((known) => known === value) ?? 'organization_profile_updated';

const toDetails = (value: unknown): Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null ? { ...value } : {};

interface OrganizationRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: number;
  created_at: Date;
  updated_at: Date;
  deactivated_at: Date | null;
}

const MEMBERSHIP_UNIQUE_CONSTRAINT = 'organization_memberships_user_unique';

const isMembershipConflict = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === '23505' &&
  'constraint' in error &&
  error.constraint === MEMBERSHIP_UNIQUE_CONSTRAINT;

export class PgOrganizationRepository implements OrganizationRepository {
  readonly #db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.#db = db;
  }

  async findById(organizationId: string): Promise<Organization | null> {
    const row = await this.#db
      .selectFrom('organizations')
      .selectAll()
      .where('id', '=', organizationId)
      .executeTakeFirst();

    return row === undefined ? null : Organization.restore(await this.#hydrate(row));
  }

  async findByMemberUserId(userId: string): Promise<Organization | null> {
    const row = await this.#db
      .selectFrom('organizations')
      .innerJoin(
        'organization_memberships',
        'organization_memberships.organization_id',
        'organizations.id'
      )
      .selectAll('organizations')
      .where('organization_memberships.user_id', '=', userId)
      .executeTakeFirst();

    return row === undefined ? null : Organization.restore(await this.#hydrate(row));
  }

  /**
   * The organization, its members, and its audit trail are one aggregate, so they are written
   * together. This is a single-aggregate write, not the general transaction strategy, which
   * ADR-007 leaves open.
   */
  async insert(organization: Organization): Promise<void> {
    const state = organization.state;

    await this.#guardMembershipConflict(async () => {
      await this.#db.transaction().execute(async (trx) => {
        await trx.insertInto('organizations').values(toRow(state)).execute();
        await this.#writeMembers(trx, state);
        await this.#appendAudit(trx, state);
      });
    });
  }

  async save(organization: Organization): Promise<void> {
    const state = organization.state;

    await this.#guardMembershipConflict(async () => {
      await this.#db.transaction().execute(async (trx) => {
        const { id, version, ...columns } = toRow(state);

        const result = await trx
          .updateTable('organizations')
          .set({ ...columns, version: version + 1 })
          .where('id', '=', id)
          .where('version', '=', version)
          .executeTakeFirst();

        if (result.numUpdatedRows === 0n) {
          throw new OrganizationConcurrencyError(id);
        }

        // The member list is small and fully owned by the aggregate, so replacing it is both
        // simpler and safer than diffing. The version guard above serializes concurrent writers,
        // which is what keeps the last-owner rule from being bypassed by two racing demotions.
        await trx
          .deleteFrom('organization_memberships')
          .where('organization_id', '=', id)
          .execute();
        await this.#writeMembers(trx, state);
        await this.#appendAudit(trx, state);
      });
    });
  }

  async search(criteria: OrganizationSearchCriteria): Promise<OrganizationPage> {
    let base = this.#db.selectFrom('organizations');
    if (criteria.status !== undefined) {
      base = base.where('status', '=', criteria.status);
    }

    const rows = await base
      .selectAll()
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(criteria.limit)
      .offset(criteria.offset)
      .execute();

    const counted = await base
      .select((builder) => builder.fn.countAll<string>().as('total'))
      .executeTakeFirst();

    const items = await Promise.all(
      rows.map(async (row) => Organization.restore(await this.#hydrate(row)))
    );

    return { items, total: Number(counted?.total ?? 0) };
  }

  async #hydrate(row: OrganizationRow): Promise<OrganizationState> {
    const [memberRows, auditRows] = await Promise.all([
      this.#db
        .selectFrom('organization_memberships')
        .selectAll()
        .where('organization_id', '=', row.id)
        .orderBy('added_at', 'asc')
        .orderBy('user_id', 'asc')
        .execute(),
      this.#db
        .selectFrom('organization_audit_entries')
        .selectAll()
        .where('organization_id', '=', row.id)
        .orderBy('sequence', 'asc')
        .execute(),
    ]);

    const members: Membership[] = memberRows.map((member) => ({
      userId: member.user_id,
      role: isOrganizationRole(member.role) ? member.role : 'viewer',
      addedAt: member.added_at,
      addedByUserId: member.added_by_user_id,
    }));

    const auditTrail: OrganizationAuditEntry[] = auditRows.map((entry) => ({
      id: entry.id,
      sequence: entry.sequence,
      type: toAuditEntryType(entry.type),
      occurredAt: entry.occurred_at,
      actorUserId: entry.actor_user_id,
      details: toDetails(entry.details),
    }));

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      status:
        row.status === 'deactivated' ? 'deactivated' : ('active' satisfies OrganizationStatus),
      members,
      auditTrail,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deactivatedAt: row.deactivated_at,
    };
  }

  async #writeMembers(trx: Transaction<Database>, state: OrganizationState): Promise<void> {
    if (state.members.length === 0) {
      return;
    }

    await trx
      .insertInto('organization_memberships')
      .values(
        state.members.map((member) => ({
          organization_id: state.id,
          user_id: member.userId,
          role: member.role,
          added_at: member.addedAt,
          added_by_user_id: member.addedByUserId,
        }))
      )
      .execute();
  }

  /** Audit entries are append-only, so re-offering known entries is a no-op. */
  async #appendAudit(trx: Transaction<Database>, state: OrganizationState): Promise<void> {
    if (state.auditTrail.length === 0) {
      return;
    }

    await trx
      .insertInto('organization_audit_entries')
      .values(
        state.auditTrail.map((entry) => ({
          id: entry.id,
          organization_id: state.id,
          sequence: entry.sequence,
          type: entry.type,
          actor_user_id: entry.actorUserId,
          occurred_at: entry.occurredAt,
          details: JSON.stringify(entry.details),
        }))
      )
      .onConflict((builder) => builder.columns(['organization_id', 'sequence']).doNothing())
      .execute();
  }

  async #guardMembershipConflict(write: () => Promise<void>): Promise<void> {
    try {
      await write();
    } catch (error) {
      if (isMembershipConflict(error)) {
        throw new AlreadyInOrganizationError('That user already belongs to an organization.');
      }
      throw error;
    }
  }
}

const toRow = (state: OrganizationState) => ({
  id: state.id,
  name: state.name,
  description: state.description,
  status: state.status,
  version: state.version,
  created_at: state.createdAt,
  updated_at: state.updatedAt,
  deactivated_at: state.deactivatedAt,
});
