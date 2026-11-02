/**
 * SEK display formatting. Amounts travel as integer minor units (öre) everywhere in the API; the
 * UI never shows öre (UC-001 scope decision 6), so whole kronor it is.
 */
export const formatSek = (amountMinor: number): string =>
  new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
