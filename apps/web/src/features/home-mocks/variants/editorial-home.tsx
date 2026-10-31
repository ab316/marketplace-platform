import { ArrowRight, Leaf, Quote } from 'lucide-react';

import { Container } from '../../../components/layout/container.tsx';
import { Badge } from '../../../components/ui/badge.tsx';
import { Button } from '../../../components/ui/button.tsx';
import { Card, CardContent } from '../../../components/ui/card.tsx';
import { ProductCard } from '../components/product-card.tsx';
import {
  TOTAL_LISTINGS,
  buyingSteps,
  formatSek,
  guarantees,
  impact,
  products,
  reviews,
} from '../mock-data.ts';

/**
 * Direction B — sustainability-led and editorial. The closest of the three to refurbed.se.
 *
 * The argument: the visitor is not yet sold on buying used at all. Price is not the obstacle —
 * *risk* is. So the page opens on why refurbished is a good decision, spends real space on the
 * four-step explanation of how buying here works, and brings in other people's experience before
 * it asks for anything.
 *
 * Products still appear, but as a curated shortlist rather than an inventory dump: the claim is
 * that twelve near-identical cards above the fold undercut the calm this direction is selling.
 *
 * The cost of this direction is honest and worth stating: a returning buyer who knows what they
 * want has to scroll past an argument they already accepted.
 */
export const EditorialHome = () => (
  <>
    <section className="border-border from-accent/50 border-b bg-gradient-to-b to-transparent">
      <Container className="py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
          <div className="flex flex-col items-start gap-6">
            <Badge variant="accent">
              <Leaf className="size-3.5" aria-hidden="true" />
              13 900 tonnes of CO₂e avoided so far
            </Badge>

            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              The most sustainable laptop is the one that already exists.
            </h1>

            <p className="text-muted-foreground max-w-prose text-lg">
              Professionally refurbished laptops from verified Swedish sellers — MacBooks,
              ThinkPads, XPS and more. Tested, graded honestly, and backed by a 24-month warranty —
              so choosing the greener option costs you nothing in confidence.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="lg">
                Browse laptops
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
              <Button variant="secondary" size="lg">
                How refurbished works
              </Button>
            </div>
          </div>

          {/* Impact panel. The hero's visual anchor, standing in for the photograph this
              direction would normally use. */}
          <Card elevated className="bg-surface/80 backdrop-blur-sm">
            <CardContent className="grid grid-cols-2 gap-6">
              {impact.map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-semibold tracking-tight">
                    {stat.value}
                    {stat.unit === '' ? null : (
                      <span className="text-muted-foreground ml-1 text-sm font-normal">
                        {stat.unit}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">{stat.label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </Container>
    </section>

    <section>
      <Container className="py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">Buying used, without the risk</h2>
          <p className="text-muted-foreground mt-3 text-lg">
            Four things happen between picking a laptop and keeping it. None of them require you to
            trust a stranger.
          </p>
        </div>

        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {buyingSteps.map((step, index) => (
            <li key={step.title} className="border-border flex flex-col gap-3 border-t pt-5">
              <span className="text-primary font-mono text-sm font-semibold">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>

    <section className="bg-muted/40 border-border border-y">
      <Container className="py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight">Picked for this week</h2>
            <p className="text-muted-foreground mt-3">
              A short list rather than a catalogue — chosen for condition and seller record, not
              only for the discount.
            </p>
          </div>
          <Button variant="secondary">
            See all {TOTAL_LISTINGS} laptops
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, 3).map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      </Container>
    </section>

    <section>
      <Container className="py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">
              What you get, on every single order
            </h2>
            <p className="text-muted-foreground mt-3">
              Not a membership, not a paid extra, and not dependent on which seller you buy from.
            </p>
            <Button variant="link" className="mt-4 px-0">
              Read the buyer protection terms
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <ul className="grid gap-5 sm:grid-cols-2">
            {guarantees.map((guarantee) => (
              <li key={guarantee.title}>
                <Card className="h-full">
                  <CardContent className="flex flex-col gap-2">
                    <h3 className="font-semibold">{guarantee.title}</h3>
                    <p className="text-muted-foreground text-sm">{guarantee.body}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>

    <section className="bg-muted/40 border-border border-y">
      <Container className="py-16 sm:py-20">
        <h2 className="text-3xl font-semibold tracking-tight">
          People who were unsure, and bought anyway
        </h2>

        <ul className="mt-8 grid gap-5 lg:grid-cols-3">
          {reviews.map((review) => (
            <li key={review.author}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-4">
                  <Quote className="text-accent-foreground size-6" aria-hidden="true" />
                  <blockquote className="flex-1 text-[0.95rem] leading-relaxed">
                    {review.quote}
                  </blockquote>
                  <footer className="border-border border-t pt-3 text-sm">
                    <p className="font-medium">{review.author}</p>
                    <p className="text-muted-foreground text-xs">{review.purchase}</p>
                  </footer>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </section>

    <section>
      <Container className="py-16 sm:py-20">
        <Card elevated className="bg-primary text-primary-foreground border-transparent">
          <CardContent className="flex flex-col items-start gap-5 p-10 sm:p-14">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">
              Start from {formatSek(199_000)} — and keep one more laptop out of a drawer.
            </h2>
            <p className="max-w-prose opacity-90">
              Thirty days to change your mind, and your payment stays in escrow until the order is
              on its way.
            </p>
            <Button variant="secondary" size="lg">
              Browse laptops
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      </Container>
    </section>
  </>
);
