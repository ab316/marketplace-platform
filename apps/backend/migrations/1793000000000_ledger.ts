import type { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Phase 4 — the double-entry ledger (ADR-003, ADR-009).
 *
 * Written by hand and reviewed deliberately (ADR-006). Money is SEK minor units in `bigint`.
 *
 * Accounts, an append-only journal whose immutability and balance are enforced by the database
 * itself, and a rebuildable balance projection.
 */
export function up(pgm: MigrationBuilder): void {
  pgm.createTable('ledger_accounts', {
    id: { type: 'text', primaryKey: true },
    kind: { type: 'text', notNull: true },
    owner_id: { type: 'text', notNull: true },
    normal_balance: { type: 'text', notNull: true },
    currency: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true },
  });
  pgm.addConstraint('ledger_accounts', 'ledger_accounts_kind_known', {
    check:
      "kind IN ('provider_clearing', 'order_escrow', 'seller_balance', 'platform_fee_revenue')",
  });
  pgm.addConstraint('ledger_accounts', 'ledger_accounts_normal_balance_known', {
    check: "normal_balance IN ('debit', 'credit')",
  });
  pgm.addConstraint('ledger_accounts', 'ledger_accounts_currency_supported', {
    check: "currency = 'SEK'",
  });
  pgm.addConstraint('ledger_accounts', 'ledger_accounts_kind_owner_unique', {
    unique: ['kind', 'owner_id'],
  });

  pgm.createTable('ledger_journal_entries', {
    id: { type: 'text', primaryKey: true },
    /** Posting order, independent of the (injectable) clock; the journal is read in this order. */
    sequence: { type: 'bigserial', notNull: true },
    idempotency_key: { type: 'text', notNull: true },
    kind: { type: 'text', notNull: true },
    reference_type: { type: 'text', notNull: true },
    reference_id: { type: 'text', notNull: true },
    description: { type: 'text', notNull: true },
    occurred_at: { type: 'timestamptz', notNull: true },
  });
  pgm.addConstraint('ledger_journal_entries', 'ledger_journal_entries_kind_known', {
    check: "kind IN ('payment_captured', 'payment_reversed', 'funds_released')",
  });
  pgm.addConstraint('ledger_journal_entries', 'ledger_journal_entries_reference_type_known', {
    check: "reference_type IN ('order')",
  });
  // Idempotency: the same business key can never produce a second movement of money.
  pgm.addConstraint('ledger_journal_entries', 'ledger_journal_entries_idempotency_key_unique', {
    unique: ['idempotency_key'],
  });
  pgm.addConstraint('ledger_journal_entries', 'ledger_journal_entries_sequence_unique', {
    unique: ['sequence'],
  });
  pgm.createIndex('ledger_journal_entries', ['reference_type', 'reference_id', 'sequence']);

  pgm.createTable('ledger_journal_lines', {
    id: { type: 'text', primaryKey: true },
    entry_id: {
      type: 'text',
      notNull: true,
      references: 'ledger_journal_entries',
      onDelete: 'RESTRICT',
    },
    account_id: {
      type: 'text',
      notNull: true,
      references: 'ledger_accounts',
      onDelete: 'RESTRICT',
    },
    side: { type: 'text', notNull: true },
    amount_minor: { type: 'bigint', notNull: true },
    currency: { type: 'text', notNull: true },
  });
  pgm.addConstraint('ledger_journal_lines', 'ledger_journal_lines_side_known', {
    check: "side IN ('debit', 'credit')",
  });
  pgm.addConstraint('ledger_journal_lines', 'ledger_journal_lines_amount_positive', {
    check: 'amount_minor > 0',
  });
  pgm.addConstraint('ledger_journal_lines', 'ledger_journal_lines_currency_supported', {
    check: "currency = 'SEK'",
  });
  pgm.createIndex('ledger_journal_lines', 'entry_id');
  pgm.createIndex('ledger_journal_lines', 'account_id');

  pgm.createTable('ledger_account_balances', {
    account_id: {
      type: 'text',
      primaryKey: true,
      references: 'ledger_accounts',
      onDelete: 'CASCADE',
    },
    balance_minor: { type: 'bigint', notNull: true },
    entry_count: { type: 'integer', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true },
  });

  // The journal is append-only (ADR-003 §1): the database refuses to change or remove history.
  pgm.sql(`
    CREATE FUNCTION ledger_forbid_mutation() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'ledger journal is append-only: % on % is not allowed', TG_OP, TG_TABLE_NAME
        USING ERRCODE = 'restrict_violation';
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    CREATE TRIGGER ledger_journal_entries_append_only
      BEFORE UPDATE OR DELETE ON ledger_journal_entries
      FOR EACH ROW EXECUTE FUNCTION ledger_forbid_mutation();
  `);
  pgm.sql(`
    CREATE TRIGGER ledger_journal_lines_append_only
      BEFORE UPDATE OR DELETE ON ledger_journal_lines
      FOR EACH ROW EXECUTE FUNCTION ledger_forbid_mutation();
  `);

  // Double entry (ENGINEERING_STANDARDS §1.2): at commit, every entry must have at least two lines
  // whose debits equal its credits. Deferred so lines can be inserted one statement at a time.
  pgm.sql(`
    CREATE FUNCTION ledger_assert_entry_balances() RETURNS trigger AS $$
    DECLARE
      debits bigint;
      credits bigint;
      line_count integer;
    BEGIN
      SELECT
        COALESCE(SUM(CASE WHEN side = 'debit' THEN amount_minor ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN side = 'credit' THEN amount_minor ELSE 0 END), 0),
        COUNT(*)
      INTO debits, credits, line_count
      FROM ledger_journal_lines
      WHERE entry_id = NEW.entry_id;

      IF line_count < 2 THEN
        RAISE EXCEPTION 'ledger entry % has fewer than two lines', NEW.entry_id
          USING ERRCODE = 'check_violation';
      END IF;
      IF debits <> credits THEN
        RAISE EXCEPTION 'ledger entry % does not balance: debits % credits %', NEW.entry_id, debits, credits
          USING ERRCODE = 'check_violation';
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    CREATE CONSTRAINT TRIGGER ledger_journal_lines_balanced
      AFTER INSERT ON ledger_journal_lines
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION ledger_assert_entry_balances();
  `);
  // An entry with no lines at all would slip past a lines trigger, so check entries too.
  pgm.sql(`
    CREATE FUNCTION ledger_assert_entry_has_lines() RETURNS trigger AS $$
    BEGIN
      IF (SELECT COUNT(*) FROM ledger_journal_lines WHERE entry_id = NEW.id) < 2 THEN
        RAISE EXCEPTION 'ledger entry % has fewer than two lines', NEW.id
          USING ERRCODE = 'check_violation';
      END IF;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    CREATE CONSTRAINT TRIGGER ledger_journal_entries_have_lines
      AFTER INSERT ON ledger_journal_entries
      DEFERRABLE INITIALLY DEFERRED
      FOR EACH ROW EXECUTE FUNCTION ledger_assert_entry_has_lines();
  `);
}

export function down(pgm: MigrationBuilder): void {
  pgm.sql('DROP TRIGGER ledger_journal_entries_have_lines ON ledger_journal_entries;');
  pgm.sql('DROP FUNCTION ledger_assert_entry_has_lines();');
  pgm.sql('DROP TRIGGER ledger_journal_lines_balanced ON ledger_journal_lines;');
  pgm.sql('DROP FUNCTION ledger_assert_entry_balances();');
  pgm.sql('DROP TRIGGER ledger_journal_lines_append_only ON ledger_journal_lines;');
  pgm.sql('DROP TRIGGER ledger_journal_entries_append_only ON ledger_journal_entries;');
  pgm.sql('DROP FUNCTION ledger_forbid_mutation();');

  pgm.dropTable('ledger_account_balances');
  pgm.dropTable('ledger_journal_lines');
  pgm.dropTable('ledger_journal_entries');
  pgm.dropTable('ledger_accounts');
}
