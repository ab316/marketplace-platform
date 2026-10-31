import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Leaf,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
} from 'lucide-react';

import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Card, CardContent } from '../../../components/ui/card.tsx';
import { ProductCard } from '../components/product-card.tsx';
import { ProductThumb } from '../components/product-thumb.tsx';
import {
  GRADE_DESCRIPTION,
  GRADE_LABEL,
  type Grade,
  categories,
  formatSek,
  products,
  topSellers,
  TOTAL_LISTINGS,
} from '../mock-data.ts';

/**
 * Direction A — commerce-first. The closest of the three to backmarket.com.
 *
 * The argument: someone arriving here has already decided they want a refurbished laptop and is
 * now price-shopping. So the page spends its most valuable space on **search and inventory**, not
 * on explaining itself. Trust is reassurance in a thin strip, not a chapter.
 *
 * Concretely, in order down the page: a promotional bar, a search-dominant hero with live-looking
 * category chips, a four-up guarantee strip, deals, category tiles, the condition-grade
 * explainer (the one piece of education this direction keeps, because it is the thing that
 * actually blocks a purchase), seller spotlight, then a wide catalogue grid.
 *
 * Static throughout: the search field and chips are presentational, with no handlers, so this
 * stays a Server Component and ships no JavaScript.
 */
const trustStrip = [
  { icon: ShieldCheck, label: 'Payment held in escrow' },
  { icon: RotateCcw, label: '30-day free returns' },
  { icon: BadgeCheck, label: '24-month warranty' },
  { icon: Truck, label: 'Free tracked delivery' },
] as const;

const popularSearches = [
  'MacBook Air M2',
  'ThinkPad X1 Carbon',
  'Dell XPS 13',
  'EliteBook',
  '32 GB RAM',
  'Under 5 000 kr',
];

const grades: readonly Grade[] = ['excellent', 'good', 'fair'];

export const MarketplaceHome = () => (
  <>
    {/* Promotional bar. Loud by design — it is the one place this direction allows itself. */}
    <div className="bg-primary text-primary-foreground">
      <Container>
        <p className="flex flex-wrap items-center justify-center gap-2 py-2 text-center text-sm">
          <Leaf className="size-4" aria-hidden="true" />
          Autumn sale — up to 45 % off every grade.
          <span className="opacity-80">Ends Sunday.</span>
        </p>
      </Container>
    </div>

    <section className="border-border from-accent/40 border-b bg-gradient-to-b to-transparent">
      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
            Refurbished laptops, up to 60 % cheaper than new.
          </h1>
          <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-lg">
            Every laptop is tested, graded and battery-checked, and backed by a 24-month warranty.
            Your payment is held until it ships.
          </p>

          {/* Presentational search. The real one arrives with the listings feature. */}
          <div className="border-border bg-surface shadow-raised mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-xl border p-2">
            <Search className="text-muted-foreground ml-2 size-5 shrink-0" aria-hidden="true" />
            <span className="text-muted-foreground flex-1 text-left text-sm">
              Search {TOTAL_LISTINGS} laptops — MacBook, ThinkPad, XPS…
            </span>
            <Button size="sm" className="shrink-0">
              Search
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="text-muted-foreground text-sm">Popular:</span>
            {popularSearches.map((term) => (
              <span
                key={term}
                className="border-border bg-surface text-muted-foreground rounded-full border px-3 py-1 text-sm"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>

    <section aria-label="Our guarantees" className="border-border border-b">
      <Container>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-4 py-5 lg:grid-cols-4">
          {trustStrip.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2.5 text-sm">
              <Icon className="text-primary size-5 shrink-0" aria-hidden="true" />
              <span className="font-medium">{label}</span>
            </li>
          ))}
        </ul>
      </Container>
    </section>

    <section>
      <Container className="py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Deals this week</h2>
            <p className="text-muted-foreground mt-1">
              Biggest savings against the new price, across every brand and grade.
            </p>
          </div>
          <Button variant="secondary" size="sm">
            See all deals
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(0, 4).map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </Container>
    </section>

    <section className="bg-muted/40 border-border border-y">
      <Container className="py-14">
        <h2 className="text-2xl font-semibold tracking-tight">Shop by kind of laptop</h2>

        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((category) => (
            <li key={category.id}>
              <Card className="hover:border-primary/40 flex h-full flex-col items-center gap-3 p-5 text-center transition-colors">
                <ProductThumb category={category.id} size="md" className="size-16 rounded-full" />
                <div>
                  <h3 className="font-medium">{category.label}</h3>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {category.count.toLocaleString('sv-SE')} listings
                  </p>
                  <p className="text-primary mt-1 text-sm font-medium">
                    from {formatSek(category.fromMinor)}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </section>

    <section>
      <Container className="py-14">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">What the grades mean</h2>
          <p className="text-muted-foreground mt-2">
            Grades describe cosmetic condition only. Every laptop on the marketplace is fully
            working, battery-tested, and covered by the same warranty.
          </p>
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {grades.map((grade) => (
            <li key={grade}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-2">
                  <Badge
                    variant={
                      grade === 'excellent' ? 'success' : grade === 'good' ? 'accent' : 'neutral'
                    }
                    className="self-start"
                  >
                    {GRADE_LABEL[grade]}
                  </Badge>
                  <p className="text-muted-foreground text-sm">{GRADE_DESCRIPTION[grade]}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </section>

    <section className="bg-muted/40 border-border border-y">
      <Container className="py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Sellers people come back to</h2>
            <p className="text-muted-foreground mt-1">
              Every seller is a registered business. Ratings come from completed orders only.
            </p>
          </div>
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {topSellers.map((seller) => (
            <li key={seller.name}>
              <Card className="h-full">
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{seller.name}</h3>
                    <Badge variant="success">{seller.rating.toFixed(1)} ★</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">{seller.speciality}</p>
                  <p className="text-muted-foreground text-xs">
                    {seller.location} · {seller.orders.toLocaleString('sv-SE')} orders completed
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </section>

    <section>
      <Container className="py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">Fresh on the marketplace</h2>
          <Button variant="link" size="sm">
            Browse everything
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.slice(4).map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  </>
);
