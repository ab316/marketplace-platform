/**
 * Public surface of the seller-organization feature: UC-003 C1–C3 over the web
 * (design contract: `docs/design/seller-organization-setup.md`).
 */
export { createOrganizationAction } from './actions.ts';
export { CreateOrganizationForm } from './components/create-organization-form.tsx';
export { OrganizationSummary } from './components/organization-summary.tsx';
export { SellerNextSteps } from './components/seller-next-steps.tsx';
export { StaffNotice } from './components/staff-notice.tsx';
export type { CreateOrganizationFailure } from './types.ts';
