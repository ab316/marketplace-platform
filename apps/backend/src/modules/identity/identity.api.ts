import type { ChangePassword } from './application/commands/change-password.ts';
import type { CreateOrganization } from './application/commands/create-organization.ts';
import type {
  AddMember,
  ChangeMemberRole,
  RemoveMember,
} from './application/commands/manage-members.ts';
import type {
  DeactivateOrganization,
  ReactivateOrganization,
  UpdateOrganizationProfile,
} from './application/commands/manage-organization-lifecycle.ts';
import type { ProvisionPlatformAdmin } from './application/commands/provision-platform-admin.ts';
import type { SignIn } from './application/commands/sign-in.ts';
import type { SignOut } from './application/commands/sign-out.ts';
import type { SignUp } from './application/commands/sign-up.ts';
import type { OrganizationDirectory } from './application/queries/organization-directory.ts';
import type {
  GetOrganization,
  GetOrganizationAudit,
  ListOrganizationMembers,
  ListOrganizations,
} from './application/queries/organization-queries.ts';
import type { ResolveActorContext } from './application/queries/resolve-actor-context.ts';

/**
 * Everything other modules and the HTTP layer may use from this module. Declared separately from
 * the composition root so consumers depend on the public surface, not on how it is built.
 */
export interface IdentityModuleApi {
  readonly signUp: SignUp;
  readonly signIn: SignIn;
  readonly signOut: SignOut;
  readonly changePassword: ChangePassword;
  /** Resolves the bearer token on every authenticated request (ADR-008). */
  readonly resolveActorContext: ResolveActorContext;

  readonly createOrganization: CreateOrganization;
  readonly updateOrganizationProfile: UpdateOrganizationProfile;
  readonly addMember: AddMember;
  readonly changeMemberRole: ChangeMemberRole;
  readonly removeMember: RemoveMember;
  readonly deactivateOrganization: DeactivateOrganization;
  readonly reactivateOrganization: ReactivateOrganization;

  readonly getOrganization: GetOrganization;
  readonly listOrganizationMembers: ListOrganizationMembers;
  readonly getOrganizationAudit: GetOrganizationAudit;
  readonly listOrganizations: ListOrganizations;

  /**
   * Internal lookup for other modules (adapted in `src/bootstrap/`), so a deactivated
   * organization stops transacting without any module importing identity's internals.
   */
  readonly organizationDirectory: OrganizationDirectory;

  /**
   * Deliberately has no HTTP route (PD-0003): marketplace staff are provisioned out of band, so
   * no request can escalate a user to platform admin.
   */
  readonly provisionPlatformAdmin: ProvisionPlatformAdmin;
}
