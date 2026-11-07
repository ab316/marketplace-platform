import type { ConditionGrade } from '@acme/api-contracts';

/**
 * Listing wording shared by every surface, so sellers and buyers read the same words
 * (business rules, "Condition grades"; seller listing management spec D5). Browser-safe.
 */
export const GRADES: Readonly<
  Record<ConditionGrade, { readonly name: string; readonly definition: string }>
> = {
  A: {
    name: 'Like new',
    definition:
      'No visible marks at a normal viewing distance. At most faint micro-scratches visible only up close. Screen free of scratches.',
  },
  B: {
    name: 'Light wear',
    definition:
      'Light scratches or scuffs on the casing, visible on close inspection. No dents. Screen free of scratches visible while it is on.',
  },
  C: {
    name: 'Visible wear',
    definition:
      'Clearly visible scratches, scuffs, or small dents on the casing, and possibly light screen scratches. No cracks, and no cosmetic damage that affects how it works.',
  },
};

export const GRADE_ORDER: readonly ConditionGrade[] = ['A', 'B', 'C'];

/** Grade letter to its plain-language name, e.g. B → "Light wear". */
export const GRADE_WORD: Readonly<Record<ConditionGrade, string>> = {
  A: GRADES.A.name,
  B: GRADES.B.name,
  C: GRADES.C.name,
};

const sek = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
});

/** SEK minor units (öre) as whole kronor, e.g. 799000 → "7 990 kr". Öre are never shown. */
export const formatSek = (amountMinor: number): string => sek.format(amountMinor / 100);

const shortDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const longDate = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' });

/** "3 Nov" — for dense lists. */
export const formatShortDate = (iso: string): string => shortDate.format(new Date(iso));

/** "3 November 2026" — for detail pages. */
export const formatLongDate = (iso: string): string => longDate.format(new Date(iso));

export const STORAGE_TYPE_LABEL = { ssd: 'SSD', nvme: 'NVMe', hdd: 'HDD' } as const;
