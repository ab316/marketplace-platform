import type { Organization } from '@acme/api-contracts';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrganizationSummary } from '../../../src/features/seller-organization/components/organization-summary.tsx';

const ACTIVE: Organization = {
  id: 'org_1',
  name: 'Nordic Refurb AB',
  description: 'Laptops from Malmö',
  status: 'active',
  memberCount: 3,
  createdAt: '2026-10-01T09:00:00.000Z',
  deactivatedAt: null,
};

describe('OrganizationSummary', () => {
  it('shows name, description, status, role, member count, and creation date', () => {
    render(<OrganizationSummary organization={ACTIVE} role="owner" />);

    expect(screen.getByRole('heading', { name: 'Nordic Refurb AB' })).toBeInTheDocument();
    expect(screen.getByText('Laptops from Malmö')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1 October 2026')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains a missing description instead of leaving a hole', () => {
    render(<OrganizationSummary organization={{ ...ACTIVE, description: null }} role="viewer" />);

    expect(screen.getByText('No description yet.')).toBeInTheDocument();
  });

  it('shows the deactivation banner with the date for a deactivated organization (UC-003 E6)', () => {
    render(
      <OrganizationSummary
        organization={{
          ...ACTIVE,
          status: 'deactivated',
          deactivatedAt: '2026-10-20T10:00:00.000Z',
        }}
        role="owner"
      />
    );

    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent(/deactivated by marketplace staff on 20 October 2026/);
    expect(banner).toHaveTextContent(/existing orders continue/i);
    expect(screen.getByText('Deactivated')).toBeInTheDocument();
  });
});
