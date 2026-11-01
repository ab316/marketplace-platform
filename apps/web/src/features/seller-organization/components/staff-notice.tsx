import { ShieldOff } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '../../../components/feedback/empty-state.tsx';
import { Button } from '../../../components/ui/button.tsx';

/**
 * The forbidden state for platform admins on seller routes: staff oversee the marketplace, they
 * do not sell (UC-003 E7, PD-0003). No form, no submit — the backend refuses the call too
 * (`STAFF_CANNOT_SELL`); this just never invites it.
 */
export const StaffNotice = () => (
  <EmptyState
    icon={ShieldOff}
    title="Marketplace staff accounts don't sell on Acme Tech"
    description="Staff oversee the marketplace; selling needs a personal account with its own seller organization."
    action={
      <Button asChild variant="secondary" size="sm">
        <Link href="/">Back to the storefront</Link>
      </Button>
    }
  />
);
