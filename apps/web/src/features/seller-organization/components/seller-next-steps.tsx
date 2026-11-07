import { Laptop, Users } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '../../../components/ui/badge.tsx';
import { Card, CardContent } from '../../../components/ui/card.tsx';

/**
 * What a new seller does next — honest about what exists (design: "What's next"). Listings are
 * live in the web app; member management is not yet, and an honest note beats a dead link (the
 * auth pages' "forgot password" rule). When that slice ships, its card becomes a link too.
 */
export const SellerNextSteps = () => (
  <section aria-labelledby="next-steps-heading" className="flex flex-col gap-3">
    <h2 id="next-steps-heading" className="text-lg font-semibold">
      What&rsquo;s next
    </h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="hover:border-primary relative transition-colors">
        <CardContent className="flex flex-col gap-2">
          <Laptop className="text-muted-foreground size-5" aria-hidden="true" />
          <h3 className="font-medium">
            <Link href="/seller/listings" className="after:absolute after:inset-0 hover:underline">
              Your listings
            </Link>
          </h3>
          <p className="text-muted-foreground text-sm">
            Start a draft, finish it at your own pace, and publish it when every detail is in.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-2">
          <Users className="text-muted-foreground size-5" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Add your team</h3>
            <Badge variant="outline">Coming soon</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Adding members with owner, manager, or viewer roles is the next organization slice.
          </p>
        </CardContent>
      </Card>
    </div>
  </section>
);
