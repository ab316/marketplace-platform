import type { ColumnType, Generated } from 'kysely';

/**
 * Hand-maintained mirror of the migrated schema (ADR-006). Keep it in step with
 * `apps/backend/migrations/`.
 */

export interface ListingsTable {
  id: string;
  organization_id: string;
  status: string;
  title: string;
  description: string;
  brand: string;
  model: string;
  cpu: string;
  ram_gb: number;
  storage_type: string;
  storage_gb: number;
  screen_size_inches: number;
  condition_grade: string;
  battery_health_min_percent: number;
  battery_cycle_min: number | null;
  battery_cycle_max: number | null;
  known_defects: string;
  /** SEK minor units (öre). */
  price_minor: number;
  currency: string;
  quantity_total: number;
  quantity_reserved: number;
  fulfillment_expectations: string;
  /** Optimistic-locking guard; every write bumps it. */
  version: number;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
  archived_at: Date | null;
}

/** jsonb: written as a serialized string, read back as a parsed object. */
type JsonColumn<T> = ColumnType<T, string, string>;

export interface OrdersTable {
  id: string;
  buyer_user_id: string;
  listing_id: string;
  seller_organization_id: string;
  status: string;
  cancellation_reason: string | null;
  /** SEK minor units (öre). One unit per order, so this equals the listing price. */
  total_minor: number;
  currency: string;
  listing_snapshot: JsonColumn<unknown>;
  version: number;
  created_at: Date;
  expires_at: Date;
  cancelled_at: Date | null;
}

export interface OrderTimelineEntriesTable {
  id: string;
  order_id: string;
  sequence: number;
  type: string;
  actor_user_id: string | null;
  occurred_at: Date;
  details: JsonColumn<unknown>;
}

export interface UsersTable {
  id: string;
  /** Lowercased before writing; unique. */
  email: string;
  display_name: string;
  platform_role: string;
  created_at: Date;
  updated_at: Date;
}

/** Separated from `users` so a password digest is never selected by an ordinary user read. */
export interface UserCredentialsTable {
  user_id: string;
  password_hash: string;
  updated_at: Date;
}

export interface SessionsTable {
  id: string;
  user_id: string;
  /** SHA-256 of the opaque bearer token (ADR-008). */
  token_hash: string;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
}

export interface OrganizationsTable {
  id: string;
  name: string;
  description: string | null;
  status: string;
  /** Optimistic-locking guard; every write bumps it. */
  version: number;
  created_at: Date;
  updated_at: Date;
  deactivated_at: Date | null;
}

export interface OrganizationMembershipsTable {
  organization_id: string;
  user_id: string;
  role: string;
  added_at: Date;
  added_by_user_id: string | null;
}

export interface OrganizationAuditEntriesTable {
  id: string;
  organization_id: string;
  sequence: number;
  type: string;
  actor_user_id: string | null;
  occurred_at: Date;
  details: JsonColumn<unknown>;
}

// --- Ledger (ADR-003, ADR-009): append-only journal, derived balances -----------------------

export interface LedgerAccountsTable {
  /** `<kind>:<owner_id>`, derived so accounts can be created on first use without a race. */
  id: string;
  kind: string;
  owner_id: string;
  normal_balance: string;
  currency: string;
  created_at: Date;
}

/** Never updated or deleted; the database enforces it with triggers. */
export interface LedgerJournalEntriesTable {
  id: string;
  /** Assigned by the database in posting order. */
  sequence: Generated<number>;
  idempotency_key: string;
  kind: string;
  reference_type: string;
  reference_id: string;
  description: string;
  occurred_at: Date;
}

/** Never updated or deleted. Every entry's debits equal its credits, checked at commit. */
export interface LedgerJournalLinesTable {
  id: string;
  entry_id: string;
  account_id: string;
  side: string;
  /** Strictly positive SEK minor units. */
  amount_minor: number;
  currency: string;
}

/** Projection of the journal; rebuildable from `ledger_journal_lines`. */
export interface LedgerAccountBalancesTable {
  account_id: string;
  balance_minor: number;
  entry_count: number;
  updated_at: Date;
}

export interface Database {
  listings: ListingsTable;
  orders: OrdersTable;
  order_timeline_entries: OrderTimelineEntriesTable;
  users: UsersTable;
  user_credentials: UserCredentialsTable;
  sessions: SessionsTable;
  organizations: OrganizationsTable;
  organization_memberships: OrganizationMembershipsTable;
  organization_audit_entries: OrganizationAuditEntriesTable;
  ledger_accounts: LedgerAccountsTable;
  ledger_journal_entries: LedgerJournalEntriesTable;
  ledger_journal_lines: LedgerJournalLinesTable;
  ledger_account_balances: LedgerAccountBalancesTable;
}
