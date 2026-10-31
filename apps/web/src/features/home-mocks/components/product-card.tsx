import { Star, Truck } from 'lucide-react';

import { Badge } from '../../../components/ui/badge.tsx';
import { Card } from '../../../components/ui/card.tsx';
import { cn } from '../../../lib/cn.ts';
import {
  GRADE_LABEL,
  type Grade,
  type MockProduct,
  formatSek,
  savingPercent,
} from '../mock-data.ts';
import { ProductThumb } from './product-thumb.tsx';

/**
 * The unit the whole marketplace is made of. Every home-page mockup composes this, so the three
 * layouts differ in editorial intent rather than in how a product is represented — which is what
 * makes them comparable.
 *
 * Two deliberate choices, both lifted from how Back Market and Refurbed handle the same problem:
 *
 * - The **condition grade** sits beside the price, not buried in a specification list. It is the
 *   second thing a refurbished buyer decides on and the first thing they distrust.
 * - The **new price** is struck through with the saving stated as a percentage *and* as text.
 *   Colour alone never carries the discount (REPO_MAP.md §8).
 *
 * This is a mockup component: it renders a `<div>`, not a link, because no listing route exists.
 * When listings are real this becomes a `next/link` wrapping the same markup.
 */
const GRADE_VARIANT: Record<Grade, 'success' | 'accent' | 'neutral'> = {
  excellent: 'success',
  good: 'accent',
  fair: 'neutral',
};

/** Below this, the stock line switches from reassurance to urgency. */
const LOW_STOCK_THRESHOLD = 4;

export type ProductCardProps = {
  readonly product: MockProduct;
  /** `row` is for dense list layouts; `tile` is the default grid card. */
  readonly layout?: 'tile' | 'row';
  readonly className?: string;
};

const Rating = ({ product }: { readonly product: MockProduct }) => (
  <span className="text-muted-foreground flex items-center gap-1 text-xs">
    <Star className="size-3.5 fill-current" aria-hidden="true" />
    <span>
      {product.sellerRating.toFixed(1)} · {product.seller}
    </span>
  </span>
);

const Price = ({ product }: { readonly product: MockProduct }) => (
  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
    <span className="text-lg font-semibold">{formatSek(product.priceMinor)}</span>
    <span className="text-muted-foreground text-sm line-through">
      {formatSek(product.newPriceMinor)}
    </span>
    <span className="text-success text-xs font-medium">
      Save {savingPercent(product)}
      {' %'}
    </span>
  </div>
);

export const ProductCard = ({ product, layout = 'tile', className }: ProductCardProps) => {
  const stockLine =
    product.stock <= LOW_STOCK_THRESHOLD
      ? `Only ${product.stock} left at this grade`
      : `${product.stock} available`;

  if (layout === 'row') {
    return (
      <Card className={cn('flex items-center gap-4 p-3', className)}>
        <ProductThumb category={product.category} size="sm" className="size-16 rounded-lg" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-medium">{product.name}</h3>
            <Badge variant={GRADE_VARIANT[product.grade]}>{GRADE_LABEL[product.grade]}</Badge>
          </div>
          <p className="text-muted-foreground truncate text-sm">{product.variant}</p>
          <Rating product={product} />
        </div>

        <div className="shrink-0 text-right">
          <Price product={product} />
          <p className="text-muted-foreground mt-1 text-xs">{stockLine}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('flex h-full flex-col overflow-hidden', className)}>
      <div className="relative">
        <ProductThumb category={product.category} size="lg" className="aspect-4/3 w-full" />
        <Badge
          variant={GRADE_VARIANT[product.grade]}
          className="absolute top-3 left-3 shadow-subtle"
        >
          {GRADE_LABEL[product.grade]}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="leading-tight font-medium">{product.name}</h3>
          <p className="text-muted-foreground text-sm">{product.variant}</p>
        </div>

        <Rating product={product} />

        <div className="mt-auto pt-2">
          <Price product={product} />

          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span>{stockLine}</span>
            {product.freeShipping ? (
              <span className="flex items-center gap-1">
                <Truck className="size-3.5" aria-hidden="true" />
                Free shipping
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
};
