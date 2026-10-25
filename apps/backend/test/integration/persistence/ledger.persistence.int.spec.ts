import { Money } from '@acme/core-domain';
import { sql } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';

import { PostJournalEntry } from '../../../src/modules/ledger/application/commands/post-journal-entry.ts';
import { RebuildAccountBalances } from '../../../src/modules/ledger/application/commands/rebuild-account-balances.ts';
import type { AccountRef } from '../../../src/modules/ledger/domain/account.ts';
import { JournalEntryConflictError } from '../../../src/modules/ledger/domain/errors.ts';
import { PgLedgerRepository } from '../../../src/modules/ledger/infrastructure/persistence/pg-ledger-repository.ts';
import { TestClock } from '../../helpers/test-clock.ts';
import { type TestDatabase, getTestDatabase } from '../../helpers/test-database.ts';

/**
 * The ledger guarantees that only the database can give (ADR-003, ADR-009 §5): the journal cannot
 * be changed or deleted, an unbalanced entry cannot be committed, the same idempotency key cannot
 * post twice even under concurrency, and the live projection matches a rebuild. Postgres only.
 */
const PROVIDER: AccountRef = { kind: 'provider_clearing', ownerId: 'simulated' };
const escrow = (orderId: string): AccountRef => ({ kind: 'order_escrow', ownerId: orderId });

describe.skipIf(inject('persistence') === 'memory')('Ledger persistence', () => {
  let database: TestDatabase;
  let repository: PgLedgerRepository;
  let post: PostJournalEntry;
  let counter = 0;

  beforeAll(async () => {
    database = await getTestDatabase();
    repository = new PgLedgerRepository(database.handle.db);
    post = new PostJournalEntry(repository, new TestClock(), {
      next: () => `led_${(counter += 1)}`,
    });
  });

  beforeEach(async () => {
    await database.reset();
  });

  afterAll(async () => {
    // The file-level database is disposed by the integration setup.
  });

  const capture = (orderId: string, amountMinor: number, key = `capture:${orderId}`) =>
    post.execute({
      idempotencyKey: key,
      kind: 'payment_captured',
      reference: { type: 'order', id: orderId },
      description: 'Payment captured into escrow',
      lines: [
        { account: PROVIDER, side: 'debit', amount: Money.fromMinor(amountMinor) },
        { account: escrow(orderId), side: 'credit', amount: Money.fromMinor(amountMinor) },
      ],
    });

  it('refuses to update or delete journal history', async () => {
    const { entry } = await capture('ord_1', 799_000);
    const db = database.handle.db;

    await expect(
      db
        .updateTable('ledger_journal_entries')
        .set({ description: 'tampered' })
        .where('id', '=', entry.id)
        .execute()
    ).rejects.toThrow(/append-only/);
    await expect(
      db.deleteFrom('ledger_journal_entries').where('id', '=', entry.id).execute()
    ).rejects.toThrow(/append-only/);
    await expect(
      db
        .updateTable('ledger_journal_lines')
        .set({ amount_minor: 1 })
        .where('entry_id', '=', entry.id)
        .execute()
    ).rejects.toThrow(/append-only/);
    await expect(
      db.deleteFrom('ledger_journal_lines').where('entry_id', '=', entry.id).execute()
    ).rejects.toThrow(/append-only/);

    const history = await repository.findByReference({ type: 'order', id: 'ord_1' });
    expect(history).toHaveLength(1);
    expect(history[0]?.total.amountMinor).toBe(799_000);
  });

  it('rejects an unbalanced entry at commit, even when written around the domain model', async () => {
    const db = database.handle.db;
    const now = new Date();

    await expect(
      db.transaction().execute(async (trx) => {
        await trx
          .insertInto('ledger_accounts')
          .values([
            {
              id: 'provider_clearing:simulated',
              kind: 'provider_clearing',
              owner_id: 'simulated',
              normal_balance: 'debit',
              currency: 'SEK',
              created_at: now,
            },
            {
              id: 'order_escrow:ord_x',
              kind: 'order_escrow',
              owner_id: 'ord_x',
              normal_balance: 'credit',
              currency: 'SEK',
              created_at: now,
            },
          ])
          .execute();
        await trx
          .insertInto('ledger_journal_entries')
          .values({
            id: 'led_bad',
            idempotency_key: 'bad',
            kind: 'payment_captured',
            reference_type: 'order',
            reference_id: 'ord_x',
            description: 'unbalanced',
            occurred_at: now,
          })
          .execute();
        await trx
          .insertInto('ledger_journal_lines')
          .values([
            {
              id: 'led_bad:1',
              entry_id: 'led_bad',
              account_id: 'provider_clearing:simulated',
              side: 'debit',
              amount_minor: 100,
              currency: 'SEK',
            },
            {
              id: 'led_bad:2',
              entry_id: 'led_bad',
              account_id: 'order_escrow:ord_x',
              side: 'credit',
              amount_minor: 99,
              currency: 'SEK',
            },
          ])
          .execute();
      })
    ).rejects.toThrow(/does not balance/);

    const entries = await db.selectFrom('ledger_journal_entries').selectAll().execute();
    expect(entries).toHaveLength(0);
  });

  it('rejects an entry with no lines at commit', async () => {
    const db = database.handle.db;

    await expect(
      db
        .insertInto('ledger_journal_entries')
        .values({
          id: 'led_empty',
          idempotency_key: 'empty',
          kind: 'payment_captured',
          reference_type: 'order',
          reference_id: 'ord_x',
          description: 'no lines',
          occurred_at: new Date(),
        })
        .execute()
    ).rejects.toThrow(/fewer than two lines/);
  });

  it('posts a key exactly once under concurrent identical requests', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, () => capture('ord_race', 500_000, 'capture:ord_race'))
    );

    expect(results.filter((result) => result.posted)).toHaveLength(1);
    expect(new Set(results.map((result) => result.entry.id)).size).toBe(1);
    expect((await repository.getBalance(escrow('ord_race'))).balanceMinor).toBe(500_000);
    expect((await repository.getBalance(PROVIDER)).balanceMinor).toBe(500_000);
  });

  it('refuses a different posting under an existing key', async () => {
    await capture('ord_2', 100);

    await expect(capture('ord_2', 101)).rejects.toBeInstanceOf(JournalEntryConflictError);
  });

  it('keeps the live projection equal to a rebuild from the journal', async () => {
    await capture('ord_a', 799_000);
    await capture('ord_b', 1_250_000);
    await post.execute({
      idempotencyKey: 'reverse:ord_b',
      kind: 'payment_reversed',
      reference: { type: 'order', id: 'ord_b' },
      description: 'Payment returned to buyer',
      lines: [
        { account: escrow('ord_b'), side: 'debit', amount: Money.fromMinor(1_250_000) },
        { account: PROVIDER, side: 'credit', amount: Money.fromMinor(1_250_000) },
      ],
    });
    await post.execute({
      idempotencyKey: 'release:ord_a',
      kind: 'funds_released',
      reference: { type: 'order', id: 'ord_a' },
      description: 'Funds released',
      lines: [
        { account: escrow('ord_a'), side: 'debit', amount: Money.fromMinor(799_000) },
        {
          account: { kind: 'seller_balance', ownerId: 'org_1' },
          side: 'credit',
          amount: Money.fromMinor(735_080),
        },
        {
          account: { kind: 'platform_fee_revenue', ownerId: 'platform' },
          side: 'credit',
          amount: Money.fromMinor(63_920),
        },
      ],
    });

    const live = await database.handle.db
      .selectFrom('ledger_account_balances')
      .select(['account_id', 'balance_minor', 'entry_count'])
      .orderBy('account_id')
      .execute();

    const rebuilt = await new RebuildAccountBalances(repository).execute();

    expect(
      rebuilt.map((b) => ({
        account_id: `${b.account.kind}:${b.account.ownerId}`,
        balance_minor: b.balanceMinor,
        entry_count: b.entryCount,
      }))
    ).toEqual(live);

    expect((await repository.getBalance(escrow('ord_a'))).balanceMinor).toBe(0);
    expect((await repository.getBalance(escrow('ord_b'))).balanceMinor).toBe(0);
    expect((await repository.getBalance(PROVIDER)).balanceMinor).toBe(799_000);
    expect(
      (await repository.getBalance({ kind: 'seller_balance', ownerId: 'org_1' })).balanceMinor
    ).toBe(735_080);
    expect(
      (await repository.getBalance({ kind: 'platform_fee_revenue', ownerId: 'platform' }))
        .balanceMinor
    ).toBe(63_920);
    // Debits equal credits across the whole ledger.
    const totals = await sql<{ debits: number; credits: number }>`
      SELECT
        COALESCE(SUM(CASE WHEN side = 'debit' THEN amount_minor END), 0)::bigint AS debits,
        COALESCE(SUM(CASE WHEN side = 'credit' THEN amount_minor END), 0)::bigint AS credits
      FROM ledger_journal_lines
    `.execute(database.handle.db);
    expect(totals.rows[0]?.debits).toBe(totals.rows[0]?.credits);
  });
});
