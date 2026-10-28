import { Container } from './container.tsx';

export const SiteFooter = () => (
  <footer className="border-border mt-auto border-t">
    <Container>
      <div className="text-muted-foreground flex flex-col gap-2 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>Marketplace — a trust-centered market for refurbished computers.</p>
        <p>Pre-release. Not a live service.</p>
      </div>
    </Container>
  </footer>
);
