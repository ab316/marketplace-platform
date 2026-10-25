import { describe, expect, it } from 'vitest';

import {
  type OrganizationRole,
  type Permission,
  permissionsForRole,
  roleHasPermission,
} from '../../../src/modules/identity/domain/roles.ts';

/**
 * The role-to-permission mapping is the whole authorization model (PD-0003), so it is pinned
 * exhaustively here. The HTTP consequences are proven separately by the authorization matrix.
 */
const EXPECTED: Record<OrganizationRole, Record<Permission, boolean>> = {
  owner: {
    'listings:read': true,
    'listings:write': true,
    'orders:read': true,
    'organization:read': true,
    'organization:write': true,
    'members:read': true,
    'members:write': true,
  },
  manager: {
    'listings:read': true,
    'listings:write': true,
    'orders:read': true,
    'organization:read': true,
    'organization:write': false,
    'members:read': true,
    'members:write': false,
  },
  viewer: {
    'listings:read': true,
    'listings:write': false,
    'orders:read': true,
    'organization:read': true,
    'organization:write': false,
    'members:read': true,
    'members:write': false,
  },
};

const ROLES: readonly OrganizationRole[] = ['owner', 'manager', 'viewer'];
const PERMISSIONS: readonly Permission[] = [
  'listings:read',
  'listings:write',
  'orders:read',
  'organization:read',
  'organization:write',
  'members:read',
  'members:write',
];

describe('role permissions', () => {
  for (const role of ROLES) {
    for (const permission of PERMISSIONS) {
      const allowed = EXPECTED[role][permission];

      it(`${allowed ? 'grants' : 'denies'} ${permission} to ${role}`, () => {
        expect(roleHasPermission(role, permission)).toBe(allowed);
      });
    }
  }

  it('keeps capability nested: owner ⊇ manager ⊇ viewer', () => {
    const owner = permissionsForRole('owner');
    const manager = permissionsForRole('manager');
    const viewer = permissionsForRole('viewer');

    expect(manager.every((permission) => owner.includes(permission))).toBe(true);
    expect(viewer.every((permission) => manager.includes(permission))).toBe(true);
    expect(owner.length).toBeGreaterThan(manager.length);
    expect(manager.length).toBeGreaterThan(viewer.length);
  });

  it('gives no role the ability to write without also being able to read', () => {
    const missingReads = ROLES.flatMap((role) => {
      const permissions = permissionsForRole(role);
      return permissions
        .filter((permission) => permission.endsWith(':write'))
        .map((permission) => permission.replace(':write', ':read'))
        .filter((read) => !permissions.some((permission) => permission === read))
        .map((read) => `${role} lacks ${read}`);
    });

    expect(missingReads).toEqual([]);
  });
});
