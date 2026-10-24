/**
 * Stubbed identity for UC-001.
 *
 * Real user management, sign-in, and permissions are out of scope for this slice, so the API
 * identifies the caller by an `x-actor-id` header matching one of the fixed actors below. Replace
 * this with the identity module when authentication is built; nothing else in the backend depends
 * on how an actor is resolved.
 */
export interface Actor {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  /** `null` for buyers, who do not act on behalf of a seller organization. */
  readonly organizationId: string | null;
  readonly canManageListings: boolean;
}

export const SEED_ACTORS: readonly Actor[] = [
  {
    userId: 'usr_buyer_alice',
    email: 'alice@buyer.example',
    displayName: 'Alice Lindqvist',
    organizationId: null,
    canManageListings: false,
  },
  {
    userId: 'usr_buyer_dave',
    email: 'dave@buyer.example',
    displayName: 'Dave Olsson',
    organizationId: null,
    canManageListings: false,
  },
  {
    userId: 'usr_seller_bo',
    email: 'bo@nordic-refurb.example',
    displayName: 'Bo Ek',
    organizationId: 'org_nordic_refurb',
    canManageListings: true,
  },
  {
    // Same organization as Bo, but without listing permission: exercises UC-001 E2.
    userId: 'usr_seller_maja',
    email: 'maja@nordic-refurb.example',
    displayName: 'Maja Holm',
    organizationId: 'org_nordic_refurb',
    canManageListings: false,
  },
  {
    // A different seller organization: exercises cross-organization access rejection.
    userId: 'usr_seller_jonas',
    email: 'jonas@baltic-devices.example',
    displayName: 'Jonas Berg',
    organizationId: 'org_baltic_devices',
    canManageListings: true,
  },
];

export const findActor = (userId: string): Actor | null =>
  SEED_ACTORS.find((actor) => actor.userId === userId) ?? null;
