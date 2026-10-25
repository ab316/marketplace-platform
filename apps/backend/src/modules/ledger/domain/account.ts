/**
 * The chart of accounts (ADR-009 §1). Each kind has a fixed normal-balance side, so a balance is
 * always reported as a non-negative amount from the account owner's point of view.
 */
export type AccountKind =
  | 'provider_clearing'
  | 'order_escrow'
  | 'seller_balance'
  | 'platform_fee_revenue';

export type BalanceSide = 'debit' | 'credit';

export const NORMAL_BALANCE: Readonly<Record<AccountKind, BalanceSide>> = {
  /** Asset: funds held at the provider on the marketplace's behalf. */
  provider_clearing: 'debit',
  /** Liability: funds held for one order until release or return. */
  order_escrow: 'credit',
  /** Liability: funds owed to one seller organization. */
  seller_balance: 'credit',
  /** Revenue: fees earned by the marketplace. */
  platform_fee_revenue: 'credit',
};

export const ACCOUNT_KINDS: readonly AccountKind[] = [
  'provider_clearing',
  'order_escrow',
  'seller_balance',
  'platform_fee_revenue',
];

/** Who an account belongs to: a provider name, an order id, an organization id, or `platform`. */
export interface AccountRef {
  readonly kind: AccountKind;
  readonly ownerId: string;
}

export const PLATFORM_OWNER_ID = 'platform';

/**
 * Account identity is derived, not generated, so an account can be created on first use by any
 * writer without a lookup or a race: two postings to a new order's escrow agree on its id.
 */
export const accountId = (ref: AccountRef): string => `${ref.kind}:${ref.ownerId}`;

const isAccountKind = (value: string): value is AccountKind =>
  (ACCOUNT_KINDS as readonly string[]).includes(value);

export const parseAccountId = (id: string): AccountRef => {
  const separator = id.indexOf(':');
  const kind = id.slice(0, separator);
  if (separator === -1 || !isAccountKind(kind)) {
    throw new Error(`Malformed ledger account id: ${id}`);
  }
  return { kind, ownerId: id.slice(separator + 1) };
};

/**
 * How one line moves an account's reported balance: a debit raises a debit-normal account and
 * lowers a credit-normal one, and vice versa. Both the live projection and the rebuild use this
 * single rule.
 */
export const balanceDelta = (kind: AccountKind, side: BalanceSide, amountMinor: number): number =>
  NORMAL_BALANCE[kind] === side ? amountMinor : -amountMinor;
