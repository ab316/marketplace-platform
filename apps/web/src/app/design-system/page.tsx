import { PackageOpen } from 'lucide-react';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { EmptyState } from '../../components/feedback/empty-state.tsx';
import { Container } from '../../components/layout/container.tsx';
import { Badge } from '../../components/ui/badge.tsx';
import { Button } from '../../components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/card.tsx';
import { Skeleton } from '../../components/ui/skeleton.tsx';
import { SampleForm } from './sample-form.tsx';

/**
 * Sample page: a living inventory of the UI primitives, so the design language can be reviewed
 * in one place and regressions are visible. Add a section here whenever a primitive is added.
 */
export const metadata: Metadata = {
  title: 'Design system',
  description: 'The UI primitives and design tokens used across the marketplace interface.',
  // Internal tooling, not a product page.
  robots: { index: false, follow: false },
};

const Section = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) => (
  <section className="flex flex-col gap-4">
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {hint !== undefined ? <p className="text-muted-foreground text-sm">{hint}</p> : null}
    </div>
    {children}
  </section>
);

const swatches = [
  { name: 'background', className: 'bg-background' },
  { name: 'surface', className: 'bg-surface' },
  { name: 'muted', className: 'bg-muted' },
  { name: 'primary', className: 'bg-primary' },
  { name: 'accent', className: 'bg-accent' },
  { name: 'success', className: 'bg-success' },
  { name: 'warning', className: 'bg-warning' },
  { name: 'danger', className: 'bg-danger' },
];

const DesignSystemPage = () => (
  <Container className="flex flex-col gap-14 py-16">
    <header className="flex flex-col gap-2">
      <h1 className="text-3xl font-semibold tracking-tight">Design system</h1>
      <p className="text-muted-foreground max-w-prose">
        Every primitive in <code className="font-mono text-sm">src/components</code>. Toggle the
        theme in the header to check both palettes.
      </p>
    </header>

    <Section title="Colour tokens" hint="Semantic names only — components never use raw values.">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {swatches.map((swatch) => (
          <li key={swatch.name} className="flex flex-col gap-2">
            <div className={`border-border h-16 rounded-lg border ${swatch.className}`} />
            <span className="text-muted-foreground font-mono text-xs">{swatch.name}</span>
          </li>
        ))}
      </ul>
    </Section>

    <Section title="Typography">
      <div className="flex flex-col gap-3">
        <h3 className="text-4xl font-semibold tracking-tight">Display — 36px semibold</h3>
        <h3 className="text-2xl font-semibold tracking-tight">Heading — 24px semibold</h3>
        <p className="text-base">Body — 16px regular, set for comfortable reading.</p>
        <p className="text-muted-foreground text-sm">Muted — 14px, for secondary detail.</p>
        <p className="font-mono text-sm">Mono — 14px, for identifiers and references.</p>
      </div>
    </Section>

    <Section title="Buttons">
      <div className="flex flex-wrap items-center gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="link">Link</Button>
        <Button disabled>Disabled</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
    </Section>

    <Section title="Badges" hint="Always paired with text, never colour alone.">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Neutral</Badge>
        <Badge variant="accent">Accent</Badge>
        <Badge variant="success">Payment secured</Badge>
        <Badge variant="warning">Awaiting payment</Badge>
        <Badge variant="danger">Cancelled</Badge>
        <Badge variant="outline">Outline</Badge>
      </div>
    </Section>

    <Section title="Cards">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Default card</CardTitle>
            <CardDescription>Depth comes from the border, not a shadow.</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Use for repeated entities, not as the default page layout.
          </CardContent>
        </Card>
        <Card elevated>
          <CardHeader>
            <CardTitle>Elevated card</CardTitle>
            <CardDescription>For content that genuinely floats.</CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Reserved for popovers and dialogs.
          </CardContent>
        </Card>
      </div>
    </Section>

    <Section
      title="Form controls"
      hint="A Client Component island; the rest of this page is server-rendered."
    >
      <Card>
        <CardContent>
          <SampleForm />
        </CardContent>
      </Card>
    </Section>

    <Section title="Loading and empty states" hint="Part of a feature, not an afterthought.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
        <EmptyState
          icon={PackageOpen}
          title="No listings yet"
          description="Published listings will appear here."
          action={
            <Button variant="secondary" size="sm">
              Create a listing
            </Button>
          }
        />
      </div>
    </Section>
  </Container>
);

export default DesignSystemPage;
