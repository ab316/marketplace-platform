import { ArrowRight, Laptop, Users } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '../../../components/ui/badge.tsx';
import { Card, CardContent } from '../../../components/ui/card.tsx';

/**
 * What a new seller does next — honest about what exists (design: "What's next"). Listing
 * management shipped with UC-007/UC-008, so its card is a link; member management is still
 * backend-only, and an honest note beats a dead link (the auth pages' "forgot password" rule).
 */
export const SellerNextSteps = () => (
  <section aria-labelledby="next-steps-heading" className="flex flex-col gap-3">
    <h2 id="next-steps-heading" className="text-lg font-semibold">
      What&rsquo;s next
    </h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="hover:border-primary/40 transition-colors">
        <CardContent className="flex flex-col gap-2">
          <Laptop className="text-muted-foreground size-5" aria-hidden="true" />
          <h3 className="font-medium">Publish your first listing</h3>
          <p className="text-muted-foreground text-sm">
            Start a draft only you can see, publish it when every detail is in, and buyers find it
            in the catalogue within seconds.
          </p>
          <Link
            href="/seller/listings"
            className="text-primary mt-1 inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            Go to your listings
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
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
