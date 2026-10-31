import { CircleAlert } from 'lucide-react';

/**
 * A form-level failure the user must read before retrying: invalid credentials, rate limiting,
 * backend unreachable. Field-level problems belong on the field via `<Field error>`, not here.
 *
 * `role="alert"` announces it when it appears after a submit; the icon keeps color from being the
 * only signal (REPO_MAP.md §8).
 */
export const FormErrorBanner = ({ message }: { readonly message: string }) => (
  <div
    role="alert"
    className="bg-danger/10 border-danger/25 text-danger flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium"
  >
    <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
    <span>{message}</span>
  </div>
);
