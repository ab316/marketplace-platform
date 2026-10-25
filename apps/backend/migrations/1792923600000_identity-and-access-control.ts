import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Identity and access control (UC-002, UC-003, PD-0003, ADR-008): accounts, opaque sessions,
 * seller organizations, fixed-role membership, and an append-only organization audit trail.
 *
 * Written by hand and reviewed deliberately (ADR-006). This migration also adds the foreign keys
 * from `listings` and `orders` to the new tables, which `1792837196504_initial-schema` could not
 * declare because users and organizations did not exist yet.
 */
export function up(pgm: MigrationBuilder): void {
  pgm.createTable('users', {
    id: { type: 'text', primaryKey: true },
    /** Normalized to lowercase before writing, so uniqueness is case-insensitive. */
    email: { type: 'text', notNull: true },
    display_name: { type: 'text', notNull: true },
    platform_role: { type: 'text', notNull: true, default: 'member' },
    created_at: { type: 'timestamptz', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true },
  });

  pgm.addConstraint('users', 'users_platform_role_known', {
    check: "platform_role IN ('member', 'platform_admin')",
  });
  // One account per email address, enforced by the database so concurrent sign-ups cannot both win.
  pgm.addConstraint('users', 'users_email_unique', { unique: ['email'] });

  /**
   * Credentials are a separate table so ordinary user reads never select a password digest and
   * it cannot leak through a `SELECT *` on `users`.
   */
  pgm.createTable('user_credentials', {
    user_id: { type: 'text', primaryKey: true, references: 'users', onDelete: 'CASCADE' },
    /** Argon2id digest; records its own parameters (ADR-008). */
    password_hash: { type: 'text', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true },
  });

  pgm.createTable('sessions', {
    id: { type: 'text', primaryKey: true },
    user_id: { type: 'text', notNull: true, references: 'users', onDelete: 'CASCADE' },
    /** SHA-256 of the opaque bearer token; the token itself is never stored (ADR-008). */
    token_hash: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    revoked_at: { type: 'timestamptz' },
  });

  pgm.addConstraint('sessions', 'sessions_token_hash_unique', { unique: ['token_hash'] });
  // Supports revoking every session a user holds when their password changes.
  pgm.createIndex('sessions', 'user_id');

  pgm.createTable('organizations', {
    id: { type: 'text', primaryKey: true },
    name: { type: 'text', notNull: true },
    description: { type: 'text' },
    status: { type: 'text', notNull: true },
    version: { type: 'integer', notNull: true, default: 1 },
    created_at: { type: 'timestamptz', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true },
    deactivated_at: { type: 'timestamptz' },
  });

  pgm.addConstraint('organizations', 'organizations_status_known', {
    check: "status IN ('active', 'deactivated')",
  });
  // Organizations are deactivated, never deleted (PD-0003), so the two columns must agree.
  pgm.addConstraint('organizations', 'organizations_deactivated_fields_consistent', {
    check: "(status = 'deactivated') = (deactivated_at IS NOT NULL)",
  });
  pgm.createIndex('organizations', ['status', 'created_at']);

  pgm.createTable('organization_memberships', {
    organization_id: {
      type: 'text',
      notNull: true,
      references: 'organizations',
      onDelete: 'CASCADE',
    },
    user_id: { type: 'text', notNull: true, references: 'users', onDelete: 'RESTRICT' },
    role: { type: 'text', notNull: true },
    added_at: { type: 'timestamptz', notNull: true },
    added_by_user_id: { type: 'text', references: 'users', onDelete: 'SET NULL' },
  });

  pgm.addConstraint('organization_memberships', 'organization_memberships_pkey', {
    primaryKey: ['organization_id', 'user_id'],
  });
  pgm.addConstraint('organization_memberships', 'organization_memberships_role_known', {
    check: "role IN ('owner', 'manager', 'viewer')",
  });
  // One organization per user (PD-0003), enforced by the database itself.
  pgm.addConstraint('organization_memberships', 'organization_memberships_user_unique', {
    unique: ['user_id'],
  });

  pgm.createTable('organization_audit_entries', {
    id: { type: 'text', primaryKey: true },
    organization_id: {
      type: 'text',
      notNull: true,
      references: 'organizations',
      onDelete: 'CASCADE',
    },
    sequence: { type: 'integer', notNull: true },
    type: { type: 'text', notNull: true },
    actor_user_id: { type: 'text' },
    occurred_at: { type: 'timestamptz', notNull: true },
    details: { type: 'jsonb', notNull: true, default: '{}' },
  });

  pgm.addConstraint('organization_audit_entries', 'organization_audit_entries_type_known', {
    check:
      "type IN ('organization_created', 'organization_profile_updated', 'member_added', 'member_role_changed', 'member_removed', 'organization_deactivated', 'organization_reactivated')",
  });
  // Append-only ordering: one entry per position, so a replayed write cannot duplicate history.
  pgm.addConstraint('organization_audit_entries', 'organization_audit_entries_sequence_unique', {
    unique: ['organization_id', 'sequence'],
  });
  pgm.addConstraint('organization_audit_entries', 'organization_audit_entries_sequence_positive', {
    check: 'sequence >= 1',
  });

  // --- Referential integrity for the tables that pre-date identity -------------------------
  //
  // Both are RESTRICT: a listing's organization and an order's buyer must keep existing, which is
  // what makes the "nothing is ever hard-deleted" promise structural rather than conventional.
  pgm.addConstraint('listings', 'listings_organization_fk', {
    foreignKeys: {
      columns: 'organization_id',
      references: 'organizations(id)',
      onDelete: 'RESTRICT',
    },
  });
  pgm.addConstraint('orders', 'orders_buyer_fk', {
    foreignKeys: { columns: 'buyer_user_id', references: 'users(id)', onDelete: 'RESTRICT' },
  });
  pgm.addConstraint('orders', 'orders_seller_organization_fk', {
    foreignKeys: {
      columns: 'seller_organization_id',
      references: 'organizations(id)',
      onDelete: 'RESTRICT',
    },
  });
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropConstraint('orders', 'orders_seller_organization_fk');
  pgm.dropConstraint('orders', 'orders_buyer_fk');
  pgm.dropConstraint('listings', 'listings_organization_fk');

  pgm.dropTable('organization_audit_entries');
  pgm.dropTable('organization_memberships');
  pgm.dropTable('organizations');
  pgm.dropTable('sessions');
  pgm.dropTable('user_credentials');
  pgm.dropTable('users');
}
