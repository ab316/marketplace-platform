import { CheckCircle2, Info } from 'lucide-react';

import { cn } from '../../../lib/cn.ts';

/** A one-off status message after a redirect or a save. Icon plus text; never colour alone. */
export const NoticeBanner = ({
  tone,
  children,
}: {
  readonly tone: 'success' | 'info';
  readonly children: React.ReactNode;
}) => {
  const Icon = tone === 'success' ? CheckCircle2 : Info;
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium',
        tone === 'success'
          ? 'border-success/25 bg-success/10 text-success'
          : 'border-border bg-muted text-foreground'
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
};
