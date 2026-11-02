'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../components/ui/alert-dialog.tsx';
import { Button } from '../../components/ui/button.tsx';

/** The confirmation dialog on the design-system page; a Client Component for the open state. */
export const SampleAlertDialog = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="secondary">Archive sample…</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogTitle>Archive this sample?</AlertDialogTitle>
      <AlertDialogDescription>
        This can&rsquo;t be undone. Cancel is focused first; clicking outside does nothing.
      </AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction>Archive sample</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
