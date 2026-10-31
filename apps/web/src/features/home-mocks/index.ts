/**
 * Public surface of the home-page mockups. Routes import from here; nothing reaches into the
 * folder's internals. When a direction is chosen, the winner graduates into a real feature module
 * and this whole folder is deleted.
 */
export { brandMock, mockRoutes, type MockRoute } from './mock-routes.ts';
export { MockSwitcher } from './components/mock-switcher.tsx';
export { BrandBoard } from './variants/brand-board.tsx';
export { MarketplaceHome } from './variants/marketplace-home.tsx';
export { EditorialHome } from './variants/editorial-home.tsx';
export { OriginalHome } from './variants/original-home.tsx';
