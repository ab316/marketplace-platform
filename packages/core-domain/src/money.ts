import { DomainError } from './errors.ts';

/**
 * The marketplace trades in SEK only (UC-001). Amounts are integer minor units (öre) so money is
 * never represented as a float.
 */
export const SUPPORTED_CURRENCY = 'SEK';

export type Currency = typeof SUPPORTED_CURRENCY;

export const isSupportedCurrency = (value: string): value is Currency =>
  value === SUPPORTED_CURRENCY;

export class InvalidMoneyError extends DomainError {
  constructor(message: string, details?: Readonly<Record<string, unknown>>) {
    super('validation', 'INVALID_MONEY', message, details);
  }
}

export class Money {
  readonly amountMinor: number;
  readonly currency: Currency;

  private constructor(amountMinor: number, currency: Currency) {
    this.amountMinor = amountMinor;
    this.currency = currency;
  }

  /**
   * `currency` is accepted as a plain string so values arriving from storage or a request are
   * checked here rather than asserted into the supported type by the caller.
   */
  static fromMinor(amountMinor: number, currency: string = SUPPORTED_CURRENCY): Money {
    if (!Number.isSafeInteger(amountMinor)) {
      throw new InvalidMoneyError('Amount must be an integer number of minor units.', {
        amountMinor,
      });
    }
    if (amountMinor < 0) {
      throw new InvalidMoneyError('Amount must not be negative.', { amountMinor });
    }
    if (!isSupportedCurrency(currency)) {
      throw new InvalidMoneyError(`Only ${SUPPORTED_CURRENCY} is supported.`, { currency });
    }
    return new Money(amountMinor, currency);
  }

  /** Zero in the supported currency; the identity for `add`. */
  static zero(currency: string = SUPPORTED_CURRENCY): Money {
    return Money.fromMinor(0, currency);
  }

  isPositive(): boolean {
    return this.amountMinor > 0;
  }

  isZero(): boolean {
    return this.amountMinor === 0;
  }

  add(other: Money): Money {
    this.#assertSameCurrency(other);
    return Money.fromMinor(this.amountMinor + other.amountMinor, this.currency);
  }

  /** Money is never negative, so subtracting more than the amount is a domain error. */
  subtract(other: Money): Money {
    this.#assertSameCurrency(other);
    if (other.amountMinor > this.amountMinor) {
      throw new InvalidMoneyError('Cannot subtract more than the amount.', {
        amountMinor: this.amountMinor,
        subtractedMinor: other.amountMinor,
      });
    }
    return Money.fromMinor(this.amountMinor - other.amountMinor, this.currency);
  }

  /**
   * A share of the amount expressed in basis points (1 bp = 0.01%), rounded half-up to the nearest
   * minor unit. Fees are specified this way (PD-0004: 8% = 800 bps) so the rate is an integer and
   * the rounding rule lives in exactly one place.
   */
  percentageBps(basisPoints: number): Money {
    if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
      throw new InvalidMoneyError('Basis points must be an integer between 0 and 10000.', {
        basisPoints,
      });
    }
    // Integer arithmetic only: (amount * bps + 5000) / 10000, truncated, is round-half-up.
    const scaled = this.amountMinor * basisPoints + 5_000;
    return Money.fromMinor(Math.floor(scaled / 10_000), this.currency);
  }

  #assertSameCurrency(other: Money): void {
    // Statically redundant while SEK is the only currency; kept so a second currency cannot be
    // silently mixed into arithmetic.
    // oxlint-disable-next-line typescript/no-unnecessary-condition
    if (this.currency !== other.currency) {
      throw new InvalidMoneyError('Cannot combine amounts in different currencies.', {
        left: this.currency,
        right: other.currency,
      });
    }
  }

  equals(other: Money): boolean {
    // The currency check is statically redundant while SEK is the only supported currency, and
    // deliberately kept: dropping it would turn adding a second currency into a silent money bug.
    // oxlint-disable-next-line typescript/no-unnecessary-condition
    return this.amountMinor === other.amountMinor && this.currency === other.currency;
  }

  toJSON(): { amountMinor: number; currency: Currency } {
    return { amountMinor: this.amountMinor, currency: this.currency };
  }
}
