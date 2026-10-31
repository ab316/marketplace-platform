import { ArrowLeft, Menu, Search, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import {
  DEFAULT_LOGO_VARIANT,
  LOGO_VARIANT_LABEL,
  Logo,
  LogoMark,
  type LogoVariant,
} from '../../../components/brand/logo.tsx';
import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Card, CardContent } from '../../../components/ui/card.tsx';
import { cn } from '../../../lib/cn.ts';

/**
 * Brand board: four logo directions for "Acme Tech", each shown in the situations where a logo
 * actually has to work rather than on a white poster. The scaffold mark failed in exactly those
 * places — a 7-pixel "M" in a 28-pixel tile beside a word that could belong to anyone — so every
 * direction is judged at header size, at favicon size, and in dark mode before anything else.
 *
 * Static and dependency-free: the marks are inline SVG from `components/brand/logo.tsx`, so what
 * is shown here is exactly what the real header renders.
 */
type Direction = {
  readonly variant: LogoVariant;
  readonly idea: string;
  readonly tradeoff: string;
};

const directions: readonly Direction[] = [
  {
    variant: 'tile',
    idea: 'A heavy "A" standing on a base line: an open laptop lid, read as the first letter. Solid tile so it survives any background and reads at 16 px.',
    tradeoff:
      'The most conventional of the four — close to a hundred SaaS marks. Earns its place through legibility, not originality.',
  },
  {
    variant: 'lid',
    idea: 'The side profile of an open laptop in two shapes: a slanted lid in the brand green over a base bar in the text colour. Says "laptops" without a letter. Lowercase wordmark, tight — a product, not a corporation. The chosen default in the site header and favicon.',
    tradeoff:
      'Two-tone marks are harder on a coloured background and the lid loses its slant below 20 px.',
  },
  {
    variant: 'loop',
    idea: 'A circular arrow around an "A": a machine going round for a second life. Leans into the sustainability argument and pairs with the editorial home-page direction.',
    tradeoff:
      'Thin strokes at favicon size, and "refresh" icons are a crowded neighbourhood. The "refurbished" descriptor in the lockup does work the mark cannot.',
  },
  {
    variant: 'wordmark',
    idea: 'No symbol: tracked capitals with "Tech" in green and a square full stop. Confident and quiet; the type is the brand. A shield-check stands in only where a square icon is unavoidable.',
    tradeoff:
      'A wordmark cannot be an app icon, and tracked capitals need width the mobile header does not always have.',
  },
];

const Panel = ({
  label,
  dark = false,
  className,
  children,
}: {
  readonly label: string;
  readonly dark?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}) => (
  <div
    // `dark` is the theme class the tokens key on, so nesting it previews the other theme in place.
    className={cn(
      dark && 'dark',
      'bg-background text-foreground border-border flex flex-col overflow-hidden rounded-lg border',
      className
    )}
  >
    <span className="text-muted-foreground border-border border-b px-3 py-1.5 text-xs">
      {label}
    </span>
    <div className="flex flex-1 items-center justify-center p-6">{children}</div>
  </div>
);

/** A stand-in for the real header so the lockup is judged at the size it ships at. */
const HeaderPreview = ({ variant, dark = false }: { variant: LogoVariant; dark?: boolean }) => (
  <div
    aria-hidden="true"
    className={cn(
      dark && 'dark',
      'bg-background text-foreground border-border w-full overflow-hidden rounded-lg border'
    )}
  >
    <div className="border-border flex h-14 items-center justify-between gap-4 border-b px-4">
      <Logo variant={variant} size="sm" />
      <div className="text-muted-foreground hidden items-center gap-5 text-sm whitespace-nowrap sm:flex">
        <span>MacBooks</span>
        <span>Business</span>
        <span>Sell with us</span>
      </div>
      <div className="text-muted-foreground flex shrink-0 items-center gap-3">
        <Search className="size-4" />
        <User className="size-4" />
        <ShoppingBag className="size-4" />
        <Menu className="size-4 sm:hidden" />
      </div>
    </div>
    <div className="bg-muted/40 h-10" />
  </div>
);

const iconSizes = [16, 24, 32, 48] as const;

const DirectionSection = ({ direction, index }: { direction: Direction; index: number }) => (
  <section
    aria-labelledby={`brand-${direction.variant}`}
    className="border-border flex flex-col gap-6 border-t pt-10"
  >
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-2xl">
        <p className="text-primary font-mono text-sm font-semibold">
          {String(index + 1).padStart(2, '0')}
        </p>
        <h2
          id={`brand-${direction.variant}`}
          className="mt-1 text-2xl font-semibold tracking-tight"
        >
          {LOGO_VARIANT_LABEL[direction.variant]}
        </h2>
        <p className="text-muted-foreground mt-3">{direction.idea}</p>
        <p className="text-muted-foreground mt-2 text-sm">
          <span className="text-foreground font-medium">Trade-off: </span>
          {direction.tradeoff}
        </p>
      </div>
      {direction.variant === DEFAULT_LOGO_VARIANT ? (
        <Badge variant="accent">Current default</Badge>
      ) : null}
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <Panel label="Lockup · light" className="min-h-40">
        <Logo variant={direction.variant} size="lg" />
      </Panel>
      <Panel label="Lockup · dark" dark className="min-h-40">
        <Logo variant={direction.variant} size="lg" />
      </Panel>
    </div>

    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs">In the header · light</span>
        <HeaderPreview variant={direction.variant} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground text-xs">In the header · dark</span>
        <HeaderPreview variant={direction.variant} dark />
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
      <Panel label="Mark alone · favicon and app icon sizes">
        <ul className="flex flex-wrap items-end gap-8">
          {iconSizes.map((px) => (
            <li key={px} className="flex flex-col items-center gap-2">
              <LogoMark
                variant={direction.variant}
                className="shrink-0"
                // Pixel sizes on purpose: this row is about what a browser tab actually shows.
                style={{ width: px, height: px }}
              />
              <span className="text-muted-foreground font-mono text-xs">{px} px</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel label="On brand colour" className="sm:w-48">
        <span className="bg-primary text-primary-foreground grid size-20 place-items-center rounded-2xl">
          <LogoMark variant={direction.variant} inverse className="size-12" />
        </span>
      </Panel>
    </div>
  </section>
);

export const BrandBoard = () => (
  <>
    <div className="bg-muted/60 border-border border-b">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2 text-sm">
          <span className="text-muted-foreground">
            <span className="text-foreground font-medium">Mockup</span> · brand directions, nothing
            is final
          </span>
          <Link
            href="/mocks"
            className="text-primary inline-flex items-center gap-1.5 hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All mockups
          </Link>
        </div>
      </Container>
    </div>

    <Container className="py-16 sm:py-20">
      <div className="max-w-2xl">
        <Badge variant="accent">Brand · Acme Tech</Badge>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Four marks for Acme Tech</h1>
        <p className="text-muted-foreground mt-4 text-lg">
          A logo is judged where it has to work: 32 pixels wide in a header, 16 in a browser tab,
          and on both themes. Each direction below is shown in those places first and on a poster
          second.
        </p>
      </div>

      {/* The problem being solved, so the directions are compared against it rather than each other. */}
      <Card className="mt-10">
        <CardContent className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
          <span
            aria-hidden="true"
            className="border-border bg-background flex items-center gap-2 rounded-lg border px-4 py-3 text-base font-semibold tracking-tight"
          >
            <span className="bg-primary text-primary-foreground grid size-7 place-items-center rounded-md text-xs font-bold">
              M
            </span>
            Marketplace
          </span>
          <div>
            <h2 className="font-semibold">Before: the scaffold mark</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              A seven-pixel letter in a small tile, next to a generic word in regular weight. It
              disappears in the header, has no favicon, and names a category rather than a company.
              Every direction below is sized for the header first and given a name to own.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-12 flex flex-col gap-14">
        {directions.map((direction, index) => (
          <DirectionSection key={direction.variant} direction={direction} index={index} />
        ))}
      </div>
    </Container>
  </>
);
