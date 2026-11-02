import { redirect } from 'next/navigation';

/**
 * `/mocks/seller-listings` is the seller listing management mockup set (UC-007/UC-008,
 * `docs/design/seller-listing-management.md`). The listing list is the natural entry; the in-page
 * switcher reaches the others.
 */
const Page = () => redirect('/mocks/seller-listings/list');

export default Page;
