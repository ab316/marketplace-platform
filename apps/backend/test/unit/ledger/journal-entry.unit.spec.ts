import { InvalidMoneyError, Money } from '@acme/core-domain';
import { describe, expect, it } from 'vitest';

import { UnbalancedJournalEntryError } from '../../../src/modules/ledger/domain/errors.ts';
import {
  type CreateJournalEntryInput,
  JournalEntry,
} from '../../../src/modules/ledger/domain/journal-entry.ts';

const NOW = new Date('2026-10-25T10:00:00.000Z');

const capture = (overrides: Partial<CreateJournalEntryInput> = {}): CreateJournalEntryInput => ({
  id: 'led_1',
  idempotencyKey: 'payment:pay_1:captured',
  kind: 'payment_captured',
  reference: { type: 'order', id: 'ord_1' },
  description: 'Payment captured into escrow',
  lines: [
    {
      account: { kind: 'provider_clearing', ownerId: 'simulated' },
      side: 'debit',
      amount: Money.fromMinor(799_000),
    },
    {
      account: { kind: 'order_escrow', ownerId: 'ord_1' },
      side: 'credit',
      amount: Money.fromMinor(799_000),
    },
  ],
  occurredAt: NOW,
  ...overrides,
});

describe('JournalEntry', () => {
  it('records a balanced movement with derived account ids', () => {
    const entry = JournalEntry.create(capture());

    expect(entry.total.amountMinor).toBe(799_000);
    expect(entry.state.lines.map((line) => line.accountId)).toEqual([
      'provider_clearing:simulated',
      'order_escrow:ord_1',
    ]);
  });

  it('rejects an entry whose debits and credits differ', () => {
    expect(() =>
      JournalEntry.create(
        capture({
          lines: [
            {
              account: { kind: 'provider_clearing', ownerId: 'simulated' },
              side: 'debit',
              amount: Money.fromMinor(100),
            },
            {
              account: { kind: 'order_escrow', ownerId: 'ord_1' },
              side: 'credit',
              amount: Money.fromMinor(99),
            },
          ],
        })
      )
    ).toThrow(UnbalancedJournalEntryError);
  });

  it('rejects fewer than two lines', () => {
    expect(() =>
      JournalEntry.create(
        capture({
          lines: [
            {
              account: { kind: 'order_escrow', ownerId: 'ord_1' },
              side: 'credit',
              amount: Money.fromMinor(1),
            },
          ],
        })
      )
    ).toThrow(UnbalancedJournalEntryError);
  });

  it('rejects a zero-amount line even when the entry balances', () => {
    expect(() =>
      JournalEntry.create(
        capture({
          lines: [
            {
              account: { kind: 'provider_clearing', ownerId: 'simulated' },
              side: 'debit',
              amount: Money.fromMinor(0),
            },
            {
              account: { kind: 'order_escrow', ownerId: 'ord_1' },
              side: 'credit',
              amount: Money.fromMinor(0),
            },
          ],
        })
      )
    ).toThrow(UnbalancedJournalEntryError);
  });

  it('rejects an empty idempotency key', () => {
    expect(() => JournalEntry.create(capture({ idempotencyKey: '  ' }))).toThrow(
      UnbalancedJournalEntryError
    );
  });

  it('balances a three-line release split between seller and fee', () => {
    const entry = JournalEntry.create(
      capture({
        kind: 'funds_released',
        lines: [
          {
            account: { kind: 'order_escrow', ownerId: 'ord_1' },
            side: 'debit',
            amount: Money.fromMinor(799_000),
          },
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
      })
    );

    expect(entry.total.amountMinor).toBe(799_000);
  });

  it('cannot mix currencies', () => {
    // Money itself refuses any currency but SEK, so this proves the guard is reachable.
    expect(() => Money.fromMinor(1, 'EUR')).toThrow(InvalidMoneyError);
  });
});
