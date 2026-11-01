import type { Metadata } from 'next';

import { CatalogueMock } from '../../../../features/catalogue-mocks/index.ts';

export const metadata: Metadata = {
  title: 'Mockup · catalogue search — filters active',
  description:
    'UC-006 catalogue: every filter axis engaged at once, with removable refinement chips.',
};

const Page = () => <CatalogueMock state="filtered" />;

export default Page;
