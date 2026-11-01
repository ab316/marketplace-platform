import { RotateCw } from 'lucide-react';
import type { Metadata, Route } from 'next';
import Link from 'next/link';

import { EmptyState } from '../../components/feedback/empty-state.tsx';
import { Container } from '../../components/layout/container.tsx';
import { Button } from '../../components/ui/button.tsx';
import { ApiTransportError } from '../../data/api-error.ts';
import { browseCatalogue } from '../../data/server/catalogue.ts';
import {
  CatalogueView,
  type RawSearchParams,
  parseCatalogueSearchParams,
} from '../../features/catalogue/index.ts';
import { catalogueHref } from '../../features/catalogue/search-params.ts';

export const metadata: Metadata = {
  title: 'Refurbished laptops',
  description:
    'Browse refurbished laptops from verified sellers: filter by brand, price, condition grade, and memory, with every payment held in escrow.',
};

/**
 * The buyer catalogue (UC-006). A thin composition shell per ADR-013: parse the URL, call the
 * data layer, choose a presentational component. Every meaningful state renders inside
 * `CatalogueView` (or `CatalogueUnavailable`), both synchronous and component-testable.
 */
const Page = async ({ searchParams }: { searchParams: Promise<RawSearchParams> }) => {
  const { search, issues } = parseCatalogueSearchParams(await searchParams);

  try {
    const page = await browseCatalogue(search);
    return <CatalogueView search={search} issues={issues} page={page} />;
  } catch (error) {
    if (error instanceof ApiTransportError) {
      // The backend is unreachable — recoverable, so keep the URL (and with it every refinement)
      // and offer a retry instead of surfacing the route-level error boundary.
      return <CatalogueUnavailable retryHref={catalogueHref(search)} />;
    }
    throw error;
  }
};

const CatalogueUnavailable = ({ retryHref }: { readonly retryHref: Route }) => (
  <Container className="py-16" width="narrow">
    <EmptyState
      icon={RotateCw}
      title="The catalogue is catching its breath"
      description="We could not load listings just now. Your search is kept in the address bar — retrying runs it again unchanged."
      action={
        <Button asChild variant="secondary">
          {/* A full navigation to the same URL re-runs the same search. */}
          <Link href={retryHref}>Try again</Link>
        </Button>
      }
    />
  </Container>
);

export default Page;
