import type { Metadata } from 'next';

import { CatalogueMock } from '../../../../features/catalogue-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · catalogue search — zero results',
  description: 'UC-006 catalogue: refinements that match nothing, with the recovery state.',
};

const Page = () => <CatalogueMock state="empty" />;

export default Page;
