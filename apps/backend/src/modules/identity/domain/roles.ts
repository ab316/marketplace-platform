/**
 * The fixed role set from PD-0003. Roles are not configurable: the marketplace defines them, so
 * the authorization matrix stays small enough to test exhaustively.
 */
export type OrganizationRole = 'owner' | 'manager' | 'viewer';

/** What a member may do inside their own organization. */
export type Permission =
  | 'listings:read'
  | 'listings:write'
  | 'orders:read'
  | 'organization:read'
  | 'organization:write'
  | 'members:read'
  | 'members:write';

const VIEWER_PERMISSIONS: readonly Permission[] = [
  'listings:read',
  'orders:read',
  'organization:read',
  'members:read',
];

const MANAGER_PERMISSIONS: readonly Permission[] = [...VIEWER_PERMISSIONS, 'listings:write'];

const OWNER_PERMISSIONS: readonly Permission[] = [
  ...MANAGER_PERMISSIONS,
  'organization:write',
  'members:write',
];

export const PERMISSIONS_BY_ROLE: Readonly<Record<OrganizationRole, readonly Permission[]>> = {
  viewer: VIEWER_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  owner: OWNER_PERMISSIONS,
};

export const permissionsForRole = (role: OrganizationRole): readonly Permission[] =>
  PERMISSIONS_BY_ROLE[role];

export const roleHasPermission = (role: OrganizationRole, permission: Permission): boolean =>
  PERMISSIONS_BY_ROLE[role].includes(permission);

export const isOrganizationRole = (value: string): value is OrganizationRole =>
  value === 'owner' || value === 'manager' || value === 'viewer';
