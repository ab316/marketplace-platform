import type { Clock, IdGenerator } from '@acme/core-contracts';
import type { Kysely } from 'kysely';

import type { Database } from '../../shared/infrastructure/database/schema.ts';
import { ChangePassword } from './application/commands/change-password.ts';
import { CreateOrganization } from './application/commands/create-organization.ts';
import {
  AddMember,
  ChangeMemberRole,
  RemoveMember,
} from './application/commands/manage-members.ts';
import {
  DeactivateOrganization,
  ReactivateOrganization,
  UpdateOrganizationProfile,
} from './application/commands/manage-organization-lifecycle.ts';
import { ProvisionPlatformAdmin } from './application/commands/provision-platform-admin.ts';
import { SignIn } from './application/commands/sign-in.ts';
import { SignOut } from './application/commands/sign-out.ts';
import { SignUp } from './application/commands/sign-up.ts';
import type {
  OrganizationRepository,
  PasswordHasher,
  SessionRepository,
  SessionTokenFactory,
  UserRepository,
} from './application/ports.ts';
import { OrganizationDirectory } from './application/queries/organization-directory.ts';
import {
  GetOrganization,
  GetOrganizationAudit,
  ListOrganizationMembers,
  ListOrganizations,
} from './application/queries/organization-queries.ts';
import { ResolveActorContext } from './application/queries/resolve-actor-context.ts';
import type { IdentityModuleApi } from './identity.api.ts';
import {
  InMemoryOrganizationRepository,
  InMemorySessionRepository,
  InMemoryUserRepository,
} from './infrastructure/persistence/in-memory-identity-repositories.ts';
import { PgOrganizationRepository } from './infrastructure/persistence/pg-organization-repository.ts';
import { PgSessionRepository } from './infrastructure/persistence/pg-session-repository.ts';
import { PgUserRepository } from './infrastructure/persistence/pg-user-repository.ts';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher.ts';
import { RandomSessionTokenFactory } from './infrastructure/security/random-session-token-factory.ts';

export interface IdentityModuleDependencies {
  readonly clock: Clock;
  readonly ids: IdGenerator;
  /** Omitted in `memory` persistence mode. */
  readonly db?: Kysely<Database> | undefined;
  readonly sessionTtlMs: number;
  /** Tests substitute a cheap hasher; production always uses Argon2id (ADR-008). */
  readonly passwords?: PasswordHasher | undefined;
}

/** Composition root for the identity module (ADR-007): the only place its infrastructure is built. */
export const createIdentityModule = (deps: IdentityModuleDependencies): IdentityModuleApi => {
  const users: UserRepository =
    deps.db === undefined ? new InMemoryUserRepository() : new PgUserRepository(deps.db);
  const organizations: OrganizationRepository =
    deps.db === undefined
      ? new InMemoryOrganizationRepository()
      : new PgOrganizationRepository(deps.db);
  const sessions: SessionRepository =
    deps.db === undefined ? new InMemorySessionRepository() : new PgSessionRepository(deps.db);

  const passwords: PasswordHasher = deps.passwords ?? new Argon2PasswordHasher();
  const tokens: SessionTokenFactory = new RandomSessionTokenFactory();

  const { clock, ids } = deps;
  const memberDeps = { organizations, users, clock, ids };
  const lifecycleDeps = { organizations, clock, ids };

  return {
    signUp: new SignUp(users, passwords, clock, ids),
    signIn: new SignIn({
      users,
      organizations,
      sessions,
      passwords,
      tokens,
      clock,
      ids,
      sessionTtlMs: deps.sessionTtlMs,
    }),
    signOut: new SignOut(sessions, tokens, clock),
    changePassword: new ChangePassword(users, sessions, passwords, clock),
    resolveActorContext: new ResolveActorContext(users, organizations, sessions, tokens, clock),

    createOrganization: new CreateOrganization(organizations, clock, ids),
    updateOrganizationProfile: new UpdateOrganizationProfile(lifecycleDeps),
    addMember: new AddMember(memberDeps),
    changeMemberRole: new ChangeMemberRole(memberDeps),
    removeMember: new RemoveMember(memberDeps),
    deactivateOrganization: new DeactivateOrganization(lifecycleDeps),
    reactivateOrganization: new ReactivateOrganization(lifecycleDeps),

    getOrganization: new GetOrganization(organizations),
    listOrganizationMembers: new ListOrganizationMembers(organizations, users),
    getOrganizationAudit: new GetOrganizationAudit(organizations),
    listOrganizations: new ListOrganizations(organizations),
    organizationDirectory: new OrganizationDirectory(organizations),

    provisionPlatformAdmin: new ProvisionPlatformAdmin(users, clock),
  };
};
