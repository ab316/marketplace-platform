import { Money } from '@acme/core-domain';
import { type Kysely, sql } from 'kysely';

import { readEnum } from '../../../../shared/infrastructure/database/row-values.ts';
import type { Database } from '../../../../shared/infrastructure/database/schema.ts';
import type { AccountBalance, LedgerRepository } from '../../application/ports.ts';
import {
  type AccountRef,
  type BalanceSide,
  NORMAL_BALANCE,
  accountId,
  balanceDelta,
  parseAccountId,
} from '../../domain/account.ts';
import { JournalEntryConflictError } from '../../domain/errors.ts';
import {
  JOURNAL_ENTRY_KINDS,
  JournalEntry,
  type JournalEntryState,
  type JournalLine,
} from '../../domain/journal-entry.ts';

const BALANCE_SIDES: readonly BalanceSide[] = ['debit', 'credit'];
const PG_UNIQUE_VIOLATION = '23505';

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === PG_UNIQUE_VIOLATION;

interface EntryRow {
  readonly id: string;
  readonly idempotency_key: string;
  readonly kind: string;
  readonly reference_type: string;
  readonly reference_id: string;
  readonly description: string;
  readonly occurred_at: Date;
}

interface LineRow {
  readonly entry_id: string;
  readonly account_id: string;
  readonly side: string;
  readonly amount_minor: number;
  readonly currency: string;
}

export class PgLedgerRepository implements LedgerRepository {
  readonly #db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.#db = db;
  }

  async findByIdempotencyKey(idempotencyKey: string): Promise<JournalEntry | null> {
    const row = await this.#db
      .selectFrom('ledger_journal_entries')
      .selectAll()
      .where('idempotency_key', '=', idempotencyKey)
      .executeTakeFirst();

    if (row === undefined) {
      return null;
    }
    const lines = await this.#loadLines([row.id]);
    return JournalEntry.restore(toState(row, lines.get(row.id) ?? []));
  }

  /**
   * Entry, lines, account rows, and balance deltas are written in one transaction so the
   * projection can never disagree with the journal (ADR-003 §4). The database re-checks the
   * balance at commit through a deferred constraint trigger, so a bug here cannot persist an
   * unbalanced entry.
   */
  async append(entry: JournalEntry): Promise<void> {
    const state = entry.state;

    try {
      await this.#db.transaction().execute(async (trx) => {
        await trx
          .insertInto('ledger_journal_entries')
          .values({
            id: state.id,
            idempotency_key: state.idempotencyKey,
            kind: state.kind,
            reference_type: state.reference.type,
            reference_id: state.reference.id,
            description: state.description,
            occurred_at: state.occurredAt,
          })
          .execute();

        // Accounts come into existence on first use; the derived id makes this race-free.
        const accounts = [...new Set(state.lines.map((line) => line.accountId))].map((id) => {
          const ref = parseAccountId(id);
          return {
            id,
            kind: ref.kind,
            owner_id: ref.ownerId,
            normal_balance: NORMAL_BALANCE[ref.kind],
            currency: entry.currency,
            created_at: state.occurredAt,
          };
        });
        await trx
          .insertInto('ledger_accounts')
          .values(accounts)
          .onConflict((builder) => builder.column('id').doNothing())
          .execute();

        await trx
          .insertInto('ledger_journal_lines')
          .values(
            state.lines.map((line, index) => ({
              id: `${state.id}:${index + 1}`,
              entry_id: state.id,
              account_id: line.accountId,
              side: line.side,
              amount_minor: line.amount.amountMinor,
              currency: line.amount.currency,
            }))
          )
          .execute();

        const deltas = new Map<string, number>();
        for (const line of state.lines) {
          const ref = parseAccountId(line.accountId);
          deltas.set(
            line.accountId,
            (deltas.get(line.accountId) ?? 0) +
              balanceDelta(ref.kind, line.side, line.amount.amountMinor)
          );
        }
        for (const [id, delta] of deltas) {
          // oxlint-disable-next-line no-await-in-loop -- one connection inside the transaction; sequential by design
          await trx
            .insertInto('ledger_account_balances')
            .values({
              account_id: id,
              balance_minor: delta,
              entry_count: 1,
              updated_at: state.occurredAt,
            })
            .onConflict((builder) =>
              builder.column('account_id').doUpdateSet({
                balance_minor: sql`ledger_account_balances.balance_minor + ${delta}`,
                entry_count: sql`ledger_account_balances.entry_count + 1`,
                updated_at: state.occurredAt,
              })
            )
            .execute();
        }
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new JournalEntryConflictError(state.idempotencyKey);
      }
      throw error;
    }
  }

  async findByReference(reference: {
    type: 'order';
    id: string;
  }): Promise<readonly JournalEntry[]> {
    const rows = await this.#db
      .selectFrom('ledger_journal_entries')
      .selectAll()
      .where('reference_type', '=', reference.type)
      .where('reference_id', '=', reference.id)
      .orderBy('sequence', 'asc')
      .execute();

    if (rows.length === 0) {
      return [];
    }
    const lines = await this.#loadLines(rows.map((row) => row.id));
    return rows.map((row) => JournalEntry.restore(toState(row, lines.get(row.id) ?? [])));
  }

  async getBalance(account: AccountRef): Promise<AccountBalance> {
    const row = await this.#db
      .selectFrom('ledger_account_balances')
      .select(['balance_minor', 'entry_count'])
      .where('account_id', '=', accountId(account))
      .executeTakeFirst();

    return {
      account,
      balanceMinor: row?.balance_minor ?? 0,
      entryCount: row?.entry_count ?? 0,
    };
  }

  async rebuildBalances(): Promise<readonly AccountBalance[]> {
    return this.#db.transaction().execute(async (trx) => {
      // Serialize against concurrent appends: the rebuild must see a consistent journal.
      await sql`LOCK TABLE ledger_account_balances IN EXCLUSIVE MODE`.execute(trx);

      const rows = await trx
        .selectFrom('ledger_journal_lines')
        .innerJoin('ledger_accounts', 'ledger_accounts.id', 'ledger_journal_lines.account_id')
        .select([
          'ledger_journal_lines.account_id as account_id',
          sql<number>`SUM(CASE WHEN ledger_journal_lines.side = ledger_accounts.normal_balance
                        THEN ledger_journal_lines.amount_minor
                        ELSE -ledger_journal_lines.amount_minor END)::bigint`.as('balance_minor'),
          sql<number>`COUNT(DISTINCT ledger_journal_lines.entry_id)::int`.as('entry_count'),
        ])
        .groupBy('ledger_journal_lines.account_id')
        .orderBy('ledger_journal_lines.account_id', 'asc')
        .execute();

      await trx.deleteFrom('ledger_account_balances').execute();
      if (rows.length > 0) {
        const now = new Date();
        await trx
          .insertInto('ledger_account_balances')
          .values(
            rows.map((row) => ({
              account_id: row.account_id,
              balance_minor: row.balance_minor,
              entry_count: row.entry_count,
              updated_at: now,
            }))
          )
          .execute();
      }

      return rows.map((row) => ({
        account: parseAccountId(row.account_id),
        balanceMinor: row.balance_minor,
        entryCount: row.entry_count,
      }));
    });
  }

  async #loadLines(entryIds: readonly string[]): Promise<Map<string, JournalLine[]>> {
    const rows = await this.#db
      .selectFrom('ledger_journal_lines')
      .selectAll()
      .where('entry_id', 'in', [...entryIds])
      .orderBy('id', 'asc')
      .execute();

    const grouped = new Map<string, JournalLine[]>();
    for (const row of rows) {
      const lines = grouped.get(row.entry_id) ?? [];
      lines.push(toLine(row));
      grouped.set(row.entry_id, lines);
    }
    return grouped;
  }
}

const toLine = (row: LineRow): JournalLine => ({
  accountId: row.account_id,
  side: readEnum(BALANCE_SIDES, row.side, 'ledger_journal_lines.side'),
  amount: Money.fromMinor(row.amount_minor, row.currency),
});

const toState = (row: EntryRow, lines: readonly JournalLine[]): JournalEntryState => ({
  id: row.id,
  idempotencyKey: row.idempotency_key,
  kind: readEnum(JOURNAL_ENTRY_KINDS, row.kind, 'ledger_journal_entries.kind'),
  reference: {
    type: readEnum(['order'] as const, row.reference_type, 'ledger_journal_entries.reference_type'),
    id: row.reference_id,
  },
  description: row.description,
  lines,
  occurredAt: row.occurred_at,
});
