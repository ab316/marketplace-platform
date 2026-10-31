import { Cpu, Gamepad2, Globe, Laptop, LaptopMinimal, Tablet, type LucideIcon } from 'lucide-react';

import { cn } from '../../../lib/cn.ts';
import type { ProductCategory } from '../mock-data.ts';

/**
 * Stand-in for product photography.
 *
 * Real listing photos are seller-supplied and do not exist yet, and a mockup that leans on
 * borrowed marketing images flatters itself — the layout would look better than it will in
 * production. A tinted panel with a category icon reserves the correct space and keeps every
 * card the same weight, which is what the mockup is actually testing.
 *
 * Decorative by definition: `aria-hidden`, with no alternative text, because the product name
 * sits right beside it.
 */
const CATEGORY_ICON: Record<ProductCategory, LucideIcon> = {
  macbook: Laptop,
  business: LaptopMinimal,
  workstation: Cpu,
  gaming: Gamepad2,
  convertible: Tablet,
  chromebook: Globe,
};

export type ProductThumbProps = {
  readonly category: ProductCategory;
  readonly className?: string;
  readonly size?: 'sm' | 'md' | 'lg';
};

const ICON_SIZE: Record<NonNullable<ProductThumbProps['size']>, string> = {
  sm: 'size-7',
  md: 'size-10',
  lg: 'size-16',
};

export const ProductThumb = ({ category, className, size = 'md' }: ProductThumbProps) => {
  const Icon = CATEGORY_ICON[category];

  return (
    <div
      aria-hidden="true"
      className={cn(
        'from-muted to-accent/50 text-muted-foreground grid place-items-center',
        'bg-gradient-to-br',
        className
      )}
    >
      <Icon className={cn(ICON_SIZE[size], 'opacity-45')} strokeWidth={1.25} />
    </div>
  );
};
