import type { Listing } from '@acme/api-contracts';
import { AlertTriangle } from 'lucide-react';

import { catalogueAbsence } from '../view-models.ts';

/** Available, reserved, sold, and total, plus why an active listing is out of the catalogue. */
export const StockSummary = ({ listing }: { readonly listing: Listing }) => {
  const absence = catalogueAbsence(listing);
  const figures = [
    { label: 'Available', value: listing.availableQuantity },
    { label: 'Reserved', value: listing.reservedQuantity },
    { label: 'Sold', value: listing.soldQuantity },
    { label: 'Total', value: listing.totalQuantity },
  ];

  return (
    <section aria-label="Stock" className="flex flex-col gap-3">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {figures.map((figure) => (
          <div key={figure.label} className="border-border rounded-lg border px-4 py-3">
            <dt className="text-muted-foreground text-xs font-medium">{figure.label}</dt>
            <dd className="text-xl font-semibold tabular-nums">{figure.value}</dd>
          </div>
        ))}
      </dl>
      {absence === null ? null : (
        <p className="border-warning/35 bg-warning/10 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
          <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {absence}
        </p>
      )}
    </section>
  );
};
