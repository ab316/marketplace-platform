import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../../src/components/ui/button.tsx';

describe('Button', () => {
  it('defaults to type="button" so it cannot silently submit an enclosing form', () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('renders the caller element when asChild is set, keeping a link a real anchor', () => {
    render(
      <Button asChild>
        <a href="/orders">Orders</a>
      </Button>
    );

    const link = screen.getByRole('link', { name: 'Orders' });
    expect(link).toHaveAttribute('href', '/orders');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not fire its handler while disabled', async () => {
    const onClick = vi.fn<() => void>();
    render(
      <Button disabled onClick={onClick}>
        Pay
      </Button>
    );

    await userEvent.click(screen.getByRole('button', { name: 'Pay' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
