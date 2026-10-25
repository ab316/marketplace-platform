import { Money } from '@acme/core-domain';
import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { PostJournalEntry } from '../../../src/modules/ledger/application/commands/post-journal-entry.ts';
import { RebuildAccountBalances } from '../../../src/modules/ledger/application/commands/rebuild-account-balances.ts';
import {
  type AccountRef,
  balanceDelta,
  parseAccountId,
} from '../../../src/modules/ledger/domain/account.ts';
import { JournalEntryConflictError } from '../../../src/modules/ledger/domain/errors.ts';
import { InMemoryLedgerRepository } from '../../../src/modules/ledger/infrastructure/persistence/in-memory-ledger-repository.ts';
import { TestClock } from '../../helpers/test-clock.ts';

/**
 * Property tests for the ledger's two invariants (ENGINEERING_STANDARDS §1.2): every posted entry
 * balances, and the balance projection is always exactly what a rebuild from the journal gives.
 * The in-memory repository is the subject; the Postgres repository is checked against the same
 * oracle in `test/integration/persistence/ledger.persistence.int.spec.ts`.
 */

const PROVIDER: AccountRef = { kind: 'provider_clearing', ownerId: 'simulated' };
const PLATFORM: AccountRef = { kind: 'platform_fee_revenue', ownerId: 'platform' };

// Keys embed the posting's content so a repeated key is always a true replay, never a conflict.
const orderIds = fc.integer({ min: 1, max: 6 }).map((n) => `ord_${n}`);
const sellerIds = fc.integer({ min: 1, max: 3 }).map((n) => `org_${n}`);
const amounts = fc.integer({ min: 1, max: 5_000_000 });

interface Posting {
  readonly key: string;
  readonly kind: 'payment_captured' | 'payment_reversed' | 'funds_released';
  readonly orderId: string;
  readonly lines: readonly { account: AccountRef; side: 'debit' | 'credit'; amount: Money }[];
}

const captured = fc
  .tuple(orderIds, amounts, fc.nat({ max: 1_000 }))
  .map(([orderId, amount, n]): Posting => ({
    key: `capture:${orderId}:${n}:${amount}`,
    kind: 'payment_captured',
    orderId,
    lines: [
      { account: PROVIDER, side: 'debit', amount: Money.fromMinor(amount) },
      {
        account: { kind: 'order_escrow', ownerId: orderId },
        side: 'credit',
        amount: Money.fromMinor(amount),
      },
    ],
  }));

const reversed = fc
  .tuple(orderIds, amounts, fc.nat({ max: 1_000 }))
  .map(([orderId, amount, n]): Posting => ({
    key: `reverse:${orderId}:${n}:${amount}`,
    kind: 'payment_reversed',
    orderId,
    lines: [
      {
        account: { kind: 'order_escrow', ownerId: orderId },
        side: 'debit',
        amount: Money.fromMinor(amount),
      },
      { account: PROVIDER, side: 'credit', amount: Money.fromMinor(amount) },
    ],
  }));

const released = fc
  .tuple(orderIds, sellerIds, amounts, fc.nat({ max: 1_000 }))
  .map(([orderId, sellerId, amount, n]): Posting => {
    const total = Money.fromMinor(amount);
    const fee = total.percentageBps(800);
    const lines: Posting['lines'] = [
      { account: { kind: 'order_escrow', ownerId: orderId }, side: 'debit', amount: total },
      {
        account: { kind: 'seller_balance', ownerId: sellerId },
        side: 'credit',
        amount: total.subtract(fee),
      },
    ];
    return {
      key: `release:${orderId}:${sellerId}:${n}:${amount}`,
      kind: 'funds_released',
      orderId,
      lines: fee.isZero() ? lines : [...lines, { account: PLATFORM, side: 'credit', amount: fee }],
    };
  });

const postings = fc.array(fc.oneof(captured, reversed, released), { minLength: 1, maxLength: 40 });

const sortedByAccount = <T extends { account: AccountRef }>(items: readonly T[]) =>
  items.toSorted((l, r) =>
    `${l.account.kind}:${l.account.ownerId}`.localeCompare(`${r.account.kind}:${r.account.ownerId}`)
  );

describe('Ledger balance properties', () => {
  it('keeps the live projection identical to a rebuild from the journal, for any posting sequence', async () => {
    await fc.assert(
      fc.asyncProperty(postings, async (sequence) => {
        const repository = new InMemoryLedgerRepository();
        const post = new PostJournalEntry(repository, new TestClock(), {
          next: () => `led_${Math.random().toString(36).slice(2)}`,
        });

        for (const posting of sequence) {
          // oxlint-disable-next-line no-await-in-loop -- postings are sequential by nature
          await post.execute({
            idempotencyKey: posting.key,
            kind: posting.kind,
            reference: { type: 'order', id: posting.orderId },
            description: posting.kind,
            lines: posting.lines,
          });
        }

        const live = sortedByAccount(repository.snapshotBalances());
        const rebuilt = sortedByAccount(await new RebuildAccountBalances(repository).execute());

        expect(live).toEqual(rebuilt);
      }),
      { numRuns: 200 }
    );
  });

  it('nets every account to the independently summed journal lines', async () => {
    await fc.assert(
      fc.asyncProperty(postings, async (sequence) => {
        const repository = new InMemoryLedgerRepository();
        const post = new PostJournalEntry(repository, new TestClock(), {
          next: () => `led_${Math.random().toString(36).slice(2)}`,
        });

        const expected = new Map<string, number>();
        const seenKeys = new Set<string>();
        for (const posting of sequence) {
          // oxlint-disable-next-line no-await-in-loop -- postings are sequential by nature
          await post.execute({
            idempotencyKey: posting.key,
            kind: posting.kind,
            reference: { type: 'order', id: posting.orderId },
            description: posting.kind,
            lines: posting.lines,
          });
          // A repeated key is a no-op, so it must not count towards the expectation either.
          if (seenKeys.has(posting.key)) {
            continue;
          }
          seenKeys.add(posting.key);
          for (const line of posting.lines) {
            const id = `${line.account.kind}:${line.account.ownerId}`;
            expected.set(
              id,
              (expected.get(id) ?? 0) +
                balanceDelta(line.account.kind, line.side, line.amount.amountMinor)
            );
          }
        }

        for (const [id, balance] of expected) {
          // oxlint-disable-next-line no-await-in-loop -- one assertion per account, in order
          const actual = await repository.getBalance(parseAccountId(id));
          expect(actual.balanceMinor).toBe(balance);
        }
      }),
      { numRuns: 200 }
    );
  });

  it('is idempotent by key: reposting changes nothing, a different posting under the same key is refused', async () => {
    await fc.assert(
      fc.asyncProperty(captured, amounts, async (posting, otherAmount) => {
        fc.pre(otherAmount !== posting.lines[0]?.amount.amountMinor);
        const repository = new InMemoryLedgerRepository();
        const post = new PostJournalEntry(repository, new TestClock(), {
          next: () => `led_${Math.random().toString(36).slice(2)}`,
        });
        const command = {
          idempotencyKey: posting.key,
          kind: posting.kind,
          reference: { type: 'order' as const, id: posting.orderId },
          description: posting.kind,
          lines: posting.lines,
        };

        const first = await post.execute(command);
        const second = await post.execute(command);
        expect(first.posted).toBe(true);
        expect(second.posted).toBe(false);
        expect(second.entry.id).toBe(first.entry.id);
        expect(repository.snapshotBalances()).toEqual(
          sortedByAccount(await repository.rebuildBalances())
        );

        await expect(
          post.execute({
            ...command,
            lines: [
              { account: PROVIDER, side: 'debit', amount: Money.fromMinor(otherAmount) },
              {
                account: { kind: 'order_escrow', ownerId: posting.orderId },
                side: 'credit',
                amount: Money.fromMinor(otherAmount),
              },
            ],
          })
        ).rejects.toBeInstanceOf(JournalEntryConflictError);
      }),
      { numRuns: 100 }
    );
  });
});
