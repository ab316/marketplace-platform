import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Field } from '../../../src/components/ui/field.tsx';
import { Input } from '../../../src/components/ui/input.tsx';

/**
 * These assert the accessibility contract REPO_MAP.md §8 requires, not styling: a programmatic
 * label, and error text associated with the control rather than merely rendered beside it.
 */
describe('Field', () => {
  it('associates its label with the control', () => {
    render(<Field label="Email">{(props) => <Input {...props} />}</Field>);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('exposes hint and error text to the control through aria-describedby', () => {
    render(
      <Field label="Password" hint="At least 10 characters." error="Password is too short.">
        {(props) => <Input {...props} />}
      </Field>
    );

    const input = screen.getByLabelText('Password');
    const describedBy = input.getAttribute('aria-describedby') ?? '';

    expect(describedBy.split(' ')).toHaveLength(2);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Password is too short.');
  });

  it('marks the control valid when there is no error', () => {
    render(<Field label="Email">{(props) => <Input {...props} />}</Field>);

    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
