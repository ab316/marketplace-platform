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

  isPositive(): boolean {
    return this.amountMinor > 0;
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
