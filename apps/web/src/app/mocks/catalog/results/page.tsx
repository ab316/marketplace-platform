import type { Metadata } from 'next';

import { CatalogueMock } from '../../../../features/catalogue-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · catalogue search — default results',
  description: 'UC-006 catalogue: unrefined results, newest first, with the filter rail.',
};

const Page = () => <CatalogueMock state="results" />;

export default Page;
