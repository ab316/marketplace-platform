import { InvalidMoneyError, Money } from '@acme/core-domain';
import { describe, expect, it } from 'vitest';

describe('Money', () => {
  it('defaults to SEK and keeps minor units exact', () => {
    const price = Money.fromMinor(799_000);

    expect(price.currency).toBe('SEK');
    expect(price.amountMinor).toBe(799_000);
    expect(price.toJSON()).toEqual({ amountMinor: 799_000, currency: 'SEK' });
  });

  it('rejects any currency other than SEK, whatever its source', () => {
    expect(() => Money.fromMinor(1000, 'EUR')).toThrow(InvalidMoneyError);
    expect(() => Money.fromMinor(1000, 'sek')).toThrow(InvalidMoneyError);
  });

  it('rejects fractional minor units', () => {
    expect(() => Money.fromMinor(10.5)).toThrow(InvalidMoneyError);
  });

  it('rejects negative amounts', () => {
    expect(() => Money.fromMinor(-1)).toThrow(InvalidMoneyError);
  });

  it('treats zero as non-positive', () => {
    expect(Money.fromMinor(0).isPositive()).toBe(false);
    expect(Money.fromMinor(1).isPositive()).toBe(true);
  });

  it('compares by amount and currency', () => {
    expect(Money.fromMinor(500).equals(Money.fromMinor(500))).toBe(true);
    expect(Money.fromMinor(500).equals(Money.fromMinor(501))).toBe(false);
  });
});

describe('Money arithmetic', () => {
  it('adds and subtracts exactly in minor units', () => {
    expect(Money.fromMinor(100).add(Money.fromMinor(250)).amountMinor).toBe(350);
    expect(Money.fromMinor(350).subtract(Money.fromMinor(250)).amountMinor).toBe(100);
    expect(Money.zero().add(Money.fromMinor(7)).equals(Money.fromMinor(7))).toBe(true);
  });

  it('never goes negative', () => {
    expect(() => Money.fromMinor(100).subtract(Money.fromMinor(101))).toThrow(InvalidMoneyError);
    expect(Money.fromMinor(100).subtract(Money.fromMinor(100)).isZero()).toBe(true);
  });

  it('computes an 8% fee in basis points', () => {
    expect(Money.fromMinor(799_000).percentageBps(800).amountMinor).toBe(63_920);
  });

  it('rounds half-up to the nearest minor unit', () => {
    // 1 öre × 50% = 0.5 → 1
    expect(Money.fromMinor(1).percentageBps(5_000).amountMinor).toBe(1);
    // 3 öre × 8% = 0.24 → 0
    expect(Money.fromMinor(3).percentageBps(800).amountMinor).toBe(0);
    // 7 öre × 8% = 0.56 → 1
    expect(Money.fromMinor(7).percentageBps(800).amountMinor).toBe(1);
    // 125 × 1% = 1.25 → 1 ; 150 × 1% = 1.5 → 2 ; 175 × 1% = 1.75 → 2
    expect(Money.fromMinor(125).percentageBps(100).amountMinor).toBe(1);
    expect(Money.fromMinor(150).percentageBps(100).amountMinor).toBe(2);
    expect(Money.fromMinor(175).percentageBps(100).amountMinor).toBe(2);
  });

  it('treats 0 and 10000 basis points as nothing and everything', () => {
    expect(Money.fromMinor(999).percentageBps(0).isZero()).toBe(true);
    expect(Money.fromMinor(999).percentageBps(10_000).amountMinor).toBe(999);
  });

  it('rejects basis points outside 0–10000 or fractional', () => {
    expect(() => Money.fromMinor(100).percentageBps(-1)).toThrow(InvalidMoneyError);
    expect(() => Money.fromMinor(100).percentageBps(10_001)).toThrow(InvalidMoneyError);
    expect(() => Money.fromMinor(100).percentageBps(12.5)).toThrow(InvalidMoneyError);
  });

  it('a fee and its remainder always rebuild the total', () => {
    for (const amount of [1, 2, 3, 99, 100, 101, 12_345, 799_000, 2_000_000]) {
      const total = Money.fromMinor(amount);
      const fee = total.percentageBps(800);
      expect(total.subtract(fee).add(fee).equals(total)).toBe(true);
    }
  });
});
