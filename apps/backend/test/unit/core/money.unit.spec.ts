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
