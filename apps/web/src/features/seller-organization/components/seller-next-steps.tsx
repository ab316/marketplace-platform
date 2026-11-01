import { Laptop, Users } from 'lucide-react';

import { Badge } from '../../../components/ui/badge.tsx';
import { Card, CardContent } from '../../../components/ui/card.tsx';

/**
 * What a new seller does next — honest about what exists (design: "What's next"). Both
 * capabilities are backend-complete but have no web surface yet; an honest note beats a dead
 * link (the auth pages' "forgot password" rule). When those slices ship, these become links.
 */
export const SellerNextSteps = () => (
  <section aria-labelledby="next-steps-heading" className="flex flex-col gap-3">
    <h2 id="next-steps-heading" className="text-lg font-semibold">
      What&rsquo;s next
    </h2>
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardContent className="flex flex-col gap-2">
          <Laptop className="text-muted-foreground size-5" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Publish your first listing</h3>
            <Badge variant="outline">Coming to the web app</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Listing drafts, publishing, and archiving arrive with the seller listing slice of the
            current roadmap phase.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col gap-2">
          <Users className="text-muted-foreground size-5" aria-hidden="true" />
          <div className="flex items-center gap-2">
            <h3 className="font-medium">Add your team</h3>
            <Badge variant="outline">Coming to the web app</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Adding members with owner, manager, or viewer roles is the next organization slice.
          </p>
        </CardContent>
      </Card>
    </div>
  </section>
);
