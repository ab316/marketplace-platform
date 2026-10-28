'use client';

import { useId } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { cn } from '../../lib/cn.ts';

export interface FieldProps {
  readonly label: string;
  /** Receives the generated id plus the ARIA wiring; spread it onto the control. */
  readonly children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
  }) => ReactElement;
  readonly hint?: ReactNode;
  readonly error?: string | undefined;
  readonly required?: boolean;
  readonly className?: string;
}

/**
 * Wires a label, hint, and error message to a control so the accessibility requirements in
 * REPO_MAP.md §8 cannot be forgotten: every control has a programmatic label, and error text is
 * associated with its field rather than floating nearby.
 *
 * The render-prop shape exists so the ids are generated once and handed to the control, instead
 * of each caller inventing matching `id`/`htmlFor` strings by hand.
 */
export const Field = ({
  label,
  children,
  hint,
  error,
  required = false,
  className,
}: FieldProps) => {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy =
    [hint !== undefined ? hintId : undefined, error !== undefined ? errorId : undefined]
      .filter((value) => value !== undefined)
      .join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span className="text-danger ml-0.5" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error !== undefined ? true : undefined,
      })}

      {hint !== undefined ? (
        <p id={hintId} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}

      {/* `role="alert"` so the message is announced when validation fails after submit. */}
      {error !== undefined ? (
        <p id={errorId} role="alert" className="text-danger text-xs font-medium">
          {error}
        </p>
      ) : null}
    </div>
  );
};
