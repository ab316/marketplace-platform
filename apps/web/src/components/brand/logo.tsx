import { ShieldCheck } from 'lucide-react';
import type { CSSProperties } from 'react';

import { cn } from '../../lib/cn.ts';

/**
 * Acme Tech brand marks.
 *
 * Four directions live side by side while the brand is being decided (see `/mocks/brand`). The
 * site chrome uses `DEFAULT_LOGO_VARIANT`; when a direction is chosen the others are deleted and
 * the `variant` prop goes with them.
 *
 * Every mark is inline SVG painted with the design tokens (`fill-primary`, `currentColor`), so it
 * follows the theme and never ships a bitmap. Marks are decorative: the lockup always carries the
 * name as text, so the SVG is `aria-hidden` and the accessible name comes from the words.
 */
export type LogoVariant = 'tile' | 'lid' | 'loop' | 'wordmark';

export const DEFAULT_LOGO_VARIANT: LogoVariant = 'lid';

export const LOGO_VARIANT_LABEL: Record<LogoVariant, string> = {
  tile: 'Tile — A on a base',
  lid: 'Lid — folded screen',
  loop: 'Loop — second life',
  wordmark: 'Wordmark — type only',
};

type MarkProps = {
  readonly variant: LogoVariant;
  readonly className?: string;
  /** Pixel sizing for icon previews; Tailwind size classes cover everything else. */
  readonly style?: CSSProperties;
  /**
   * For use on the brand colour itself (app-icon tile, hero band): swaps the green for the
   * on-green foreground so the mark stays visible. The container sets `text-primary-foreground`.
   */
  readonly inverse?: boolean;
};

/** The compact symbol: app icon, favicon, avatar. Square, scales from 16 px up. */
export const LogoMark = ({ variant, className, style, inverse = false }: MarkProps) => {
  const base = cn('shrink-0', className);
  const fill = inverse ? 'fill-primary-foreground' : 'fill-primary';
  const stroke = inverse ? 'stroke-primary-foreground' : 'stroke-primary';
  const onFill = inverse ? 'fill-primary' : 'fill-primary-foreground';
  const onStroke = inverse ? 'stroke-primary' : 'stroke-primary-foreground';

  switch (variant) {
    case 'tile':
      // A heavy "A" standing on a base line — the open lid of a laptop, read as a letter.
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true" className={base} style={style}>
          <rect width="32" height="32" rx="8" className={fill} />
          <path
            d="M9.5 22.5 16 8.5l6.5 14"
            className={onStroke}
            strokeWidth="3.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M6.5 24.5h19"
            className={onStroke}
            strokeWidth="3.4"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );

    case 'lid':
      // A slanted lid over a base bar: the side profile of an open laptop, reduced to two shapes.
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true" className={base} style={style}>
          <path d="M11 5h17l-5 17H6z" className={fill} />
          <rect x="3" y="24.5" width="26" height="4" rx="2" fill="currentColor" />
          <circle cx="16.5" cy="13.5" r="2" className={onFill} />
        </svg>
      );

    case 'loop':
      // A circular arrow around an "A": a machine going round for a second life.
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true" className={base} style={style}>
          <path
            d="M16 4.5a11.5 11.5 0 1 1-9.4 4.8"
            className={stroke}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M2.5 10.4 6.6 9.3 6.95 13.5"
            className={stroke}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M12 21.5 16 11l4 10.5M13.6 18h4.8"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );

    case 'wordmark':
    // Explicit case keeps the switch exhaustive; `default` lets the function provably return.
    default:
      // The wordmark has no symbol of its own; the trust promise stands in where a square is required.
      return (
        <span
          aria-hidden="true"
          style={style}
          className={cn(
            inverse ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground',
            'grid place-items-center rounded-[25%]',
            base
          )}
        >
          <ShieldCheck className="size-[62%]" strokeWidth={2.4} />
        </span>
      );
  }
};

type LockupSize = 'sm' | 'md' | 'lg';

const MARK_SIZE: Record<LockupSize, string> = { sm: 'size-8', md: 'size-10', lg: 'size-16' };
const WORD_SIZE: Record<LockupSize, string> = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' };
const GAP: Record<LockupSize, string> = { sm: 'gap-2.5', md: 'gap-3', lg: 'gap-4' };

/** The name set in type. Each direction has its own typographic voice. */
export const LogoWordmark = ({
  variant,
  size = 'md',
  className,
}: MarkProps & { readonly size?: LockupSize }) => {
  const base = cn('leading-none whitespace-nowrap', WORD_SIZE[size], className);

  switch (variant) {
    case 'tile':
      return (
        <span className={cn('font-bold tracking-tight', base)}>
          Acme <span className="text-primary">Tech</span>
        </span>
      );
    case 'lid':
      return (
        <span className={cn('font-semibold tracking-tighter lowercase', base)}>
          acme<span className="text-primary">tech</span>
        </span>
      );
    case 'loop':
      return (
        <span className={cn('font-semibold tracking-tight', base)}>
          Acme Tech
          <span className="text-muted-foreground ml-[0.35em] text-[0.45em] font-medium tracking-normal align-middle">
            refurbished
          </span>
        </span>
      );
    case 'wordmark':
    default:
      return (
        <span className={cn('font-bold tracking-[0.18em] uppercase', base)}>
          Acme<span className="text-primary"> Tech</span>
          <span
            aria-hidden="true"
            className="bg-primary ml-[0.12em] inline-block size-[0.22em] rounded-[2px] align-baseline"
          />
        </span>
      );
  }
};

/** Mark + wordmark together: header, footer, hero. */
export const Logo = ({
  variant = DEFAULT_LOGO_VARIANT,
  size = 'md',
  className,
}: {
  readonly variant?: LogoVariant;
  readonly size?: LockupSize;
  readonly className?: string;
}) => (
  <span className={cn('inline-flex items-center', GAP[size], className)}>
    {variant === 'wordmark' ? null : <LogoMark variant={variant} className={MARK_SIZE[size]} />}
    <LogoWordmark variant={variant} size={size} />
  </span>
);
