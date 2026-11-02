'use client';

import type { Listing } from '@acme/api-contracts';
import { Archive, Pencil, Rocket } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';

import { FormErrorBanner } from '../../../components/feedback/form-error-banner.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { editListingHref } from '../paths.ts';
import type { ListingActionFailure } from '../types.ts';

/**
 * The actions a listing's status allows (UC-007 S3, UC-008 W1–W2), rendered only when the page
 * decided the actor may write. Publish is a plain button: it is reversible in effect (archive)
 * and the draft state already made the intent explicit. Archive is irreversible in the MVP, so
 * it is the one action behind an AlertDialog (design decision 2026-11-01).
 *
 * Both Server Actions return `{}` on success and rely on `revalidatePath` to re-render the page
 * with the new status; only failures are shown here.
 */
export type ListingAction = (listingId: string) => Promise<ListingActionFailure>;

export interface ListingActionsProps {
  readonly listing: Listing;
  readonly publishAction: ListingAction;
  readonly archiveAction: ListingAction;
}

export const ListingActions = ({ listing, publishAction, archiveAction }: ListingActionsProps) => {
  const [failure, setFailure] = useState<ListingActionFailure | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);

  const run = (action: ListingAction) => {
    setFailure(undefined);
    startTransition(async () => {
      setFailure(await action(listing.id));
    });
  };

  if (listing.status === 'archived') {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {failure?.formError === undefined ? null : <FormErrorBanner message={failure.formError} />}

      {listing.status === 'draft' ? (
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              run(publishAction);
            }}
            disabled={isPending}
            aria-busy={isPending || undefined}
          >
            <Rocket aria-hidden="true" /> {isPending ? 'Publishing…' : 'Publish listing'}
          </Button>
          <Button asChild variant="secondary">
            <Link href={editListingHref(listing.id)} aria-disabled={isPending || undefined}>
              <Pencil aria-hidden="true" /> Edit draft
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" disabled={isPending} aria-busy={isPending || undefined}>
                <Archive aria-hidden="true" /> {isPending ? 'Archiving…' : 'Archive listing…'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle>Archive this listing?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="flex flex-col gap-3">
                  <p>
                    <span className="text-foreground font-medium">{listing.title}</span> will be
                    withdrawn from sale. This can&rsquo;t be undone.
                  </p>
                  <ul className="list-disc space-y-1 pl-5">
                    <li>It leaves the catalogue and no new orders can be placed.</li>
                    <li>
                      Existing orders continue — {listing.reservedQuantity} reserved unit
                      {listing.reservedQuantity === 1 ? '' : 's'} and {listing.soldQuantity} sold
                      stay as they are.
                    </li>
                    <li>You and marketplace staff can still see it, marked Archived.</li>
                    <li>To sell this model again, publish a new listing.</li>
                  </ul>
                </div>
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setDialogOpen(false);
                    run(archiveAction);
                  }}
                >
                  <Archive aria-hidden="true" /> Archive listing
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <p className="text-muted-foreground text-xs">
            Published content can&rsquo;t be edited so buyers always see what they ordered. To
            change it, archive this listing and publish a new one.
          </p>
        </>
      )}
    </div>
  );
};
