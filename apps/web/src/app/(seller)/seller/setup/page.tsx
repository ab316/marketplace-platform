import { CheckCircle2 } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Container } from '../../../../components/layout/container.tsx';
import { getCurrentActor } from '../../../../data/server/current-actor.ts';
import {
  CreateOrganizationForm,
  createOrganizationAction,
  StaffNotice,
} from '../../../../features/seller-organization/index.ts';

export const metadata: Metadata = {
  title: 'Set up your seller organization',
  description:
    'Create your seller organization on Acme Tech: the registered identity buyers see on every listing and order.',
};

/**
 * What creating an organization commits the user to, in product language only (PD-0003). It must
 * not claim verification or vetting — creation is self-serve; verification is a later trust
 * feature (P2-018).
 */
const COMMITMENTS = [
  'You become the organization’s owner and can add team members later.',
  'One organization per account.',
  'Its name is what buyers see on every listing and order.',
  'No listing fees — the 8% marketplace fee is charged at settlement.',
] as const;

/** Thin async shell (ADR-013): read the actor, branch, render. Design: seller-organization-setup. */
const Page = async () => {
  const actor = await getCurrentActor();
  if (actor === null) {
    // proxy.ts already bounces cookie-less visitors; this covers a present-but-dead session.
    redirect('/sign-in?next=/seller/setup');
  }
  if (actor.membership !== null) {
    // Already a member: the form is never shown to someone who cannot use it (UC-003 E1).
    redirect('/seller');
  }

  return (
    <Container width="narrow" className="py-16 sm:py-20">
      {actor.isPlatformAdmin ? (
        <StaffNotice />
      ) : (
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              Set up your seller organization
            </h1>
            <p className="text-muted-foreground">
              Selling on Acme Tech happens as an organization — the registered identity behind your
              listings.
            </p>
            <ul className="mt-1 flex flex-col gap-2">
              {COMMITMENTS.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm">
                  <CheckCircle2
                    className="text-success mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <CreateOrganizationForm action={createOrganizationAction} />
        </div>
      )}
    </Container>
  );
};

export default Page;
