import { redirect } from 'next/navigation';

/**
 * `/mocks/catalog` is the catalogue-search mockup set (UC-006, `docs/design/catalogue-search.md`).
 * The default-results state is the natural entry; the in-page switcher reaches the others.
 */
const Page = () => redirect('/mocks/catalog/results');

export default Page;
