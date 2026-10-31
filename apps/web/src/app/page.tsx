import { EditorialHome } from '../features/home-mocks/index.ts';

/**
 * The home page: the sustainability-led direction, chosen from the mockup round (see
 * `docs/design/home-page.md`). It renders without the mock switcher — this is the storefront now,
 * not an exhibit. The other directions remain browsable at `/mocks/*` for reference, just no
 * longer linked from the site chrome.
 *
 * None of this fetches. The next step is graduating this layout into a real feature module backed
 * by `src/data/`, at which point `features/home-mocks` is deleted.
 */
const Home = () => <EditorialHome />;

export default Home;
