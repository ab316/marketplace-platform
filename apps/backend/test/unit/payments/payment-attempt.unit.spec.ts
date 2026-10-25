import { Money } from '@acme/core-domain';
import { describe, expect, it } from 'vitest';

import { PaymentStateError } from '../../../src/modules/payments/domain/errors.ts';
import {
  PaymentAttempt,
  type StartPaymentAttemptInput,
} from '../../../src/modules/payments/domain/payment-attempt.ts';

const NOW = new Date('2026-10-25T10:00:00.000Z');
const TIMES_OUT_AT = new Date('2026-10-25T10:15:00.000Z');
const LATER = new Date('2026-10-25T10:20:00.000Z');

const start = (overrides: Partial<StartPaymentAttemptInput> = {}): PaymentAttempt =>
  PaymentAttempt.start({
    id: 'pay_1',
    orderId: 'ord_1',
    buyerUserId: 'usr_alice',
    amount: Money.fromMinor(799_000),
    provider: 'simulated',
    scenario: null,
    now: NOW,
    timesOutAt: TIMES_OUT_AT,
    ...overrides,
  });

describe('Starting a payment attempt', () => {
  it('is pending for the order total with no fee recorded yet', () => {
    const attempt = start();

    expect(attempt.status).toBe('pending');
    expect(attempt.amount.amountMinor).toBe(799_000);
    expect(attempt.state.feeRateBps).toBeNull();
    expect(attempt.state.providerReference).toBeNull();
    expect(attempt.state.resolvedAt).toBeNull();
  });

  it('refuses a non-positive amount and a timeout that is not in the future', () => {
    expect(() => start({ amount: Money.fromMinor(0) })).toThrow(PaymentStateError);
    expect(() => start({ timesOutAt: NOW })).toThrow(PaymentStateError);
  });

  it('is overdue once the timeout passes, and only while pending', () => {
    const attempt = start();

    expect(attempt.isOverdueAt(new Date('2026-10-25T10:14:59.000Z'))).toBe(false);
    expect(attempt.isOverdueAt(TIMES_OUT_AT)).toBe(true);

    attempt.fail('card_declined', NOW);
    expect(attempt.isOverdueAt(LATER)).toBe(false);
  });
});

describe('Provider reference', () => {
  it('is recorded once and must agree afterwards', () => {
    const attempt = start();

    attempt.assignProviderReference('sim_pay_1');
    attempt.assignProviderReference('sim_pay_1');
    expect(attempt.state.providerReference).toBe('sim_pay_1');

    expect(() => attempt.assignProviderReference('sim_other')).toThrow(PaymentStateError);
  });
});

describe('Resolving a payment attempt', () => {
  it('succeeds from pending, freezing the fee rate exactly once', () => {
    const attempt = start();

    attempt.succeed(800, LATER);
    attempt.succeed(900, LATER); // a replay must not change anything

    expect(attempt.status).toBe('succeeded');
    expect(attempt.state.feeRateBps).toBe(800);
    expect(attempt.state.resolvedAt).toEqual(LATER);
  });

  it('fails from pending with the provider reason', () => {
    const attempt = start();

    attempt.fail('card_declined', LATER);

    expect(attempt.status).toBe('failed');
    expect(attempt.state.failureReason).toBe('card_declined');
  });

  it('times out from pending', () => {
    const attempt = start();

    attempt.timeOut(TIMES_OUT_AT);

    expect(attempt.status).toBe('timed_out');
    expect(attempt.state.failureReason).toBe('provider_timeout');
  });

  it('lets a late success rescue a timed-out attempt (UC-004 A5)', () => {
    const attempt = start();
    attempt.timeOut(TIMES_OUT_AT);

    attempt.succeed(800, LATER);

    expect(attempt.status).toBe('succeeded');
    expect(attempt.state.feeRateBps).toBe(800);
  });

  it('can be reversed from pending, timed out, or succeeded (UC-004 A4)', () => {
    for (const prepare of [
      (attempt: PaymentAttempt) => attempt,
      (attempt: PaymentAttempt) => {
        attempt.timeOut(TIMES_OUT_AT);
        return attempt;
      },
      (attempt: PaymentAttempt) => {
        attempt.succeed(800, LATER);
        return attempt;
      },
    ]) {
      const attempt = prepare(start());
      attempt.reverse(LATER);
      attempt.reverse(LATER);
      expect(attempt.status).toBe('reversed');
    }
  });

  it('is final: failed, reversed, and succeeded attempts refuse other transitions', () => {
    const failed = start();
    failed.fail('card_declined', LATER);
    expect(() => failed.succeed(800, LATER)).toThrow(PaymentStateError);
    expect(() => failed.timeOut(LATER)).toThrow(PaymentStateError);
    expect(() => failed.reverse(LATER)).toThrow(PaymentStateError);

    const reversed = start();
    reversed.reverse(LATER);
    expect(() => reversed.succeed(800, LATER)).toThrow(PaymentStateError);
    expect(() => reversed.fail('x', LATER)).toThrow(PaymentStateError);

    const succeeded = start();
    succeeded.succeed(800, LATER);
    expect(() => succeeded.fail('x', LATER)).toThrow(PaymentStateError);
    expect(() => succeeded.timeOut(LATER)).toThrow(PaymentStateError);
  });
});
