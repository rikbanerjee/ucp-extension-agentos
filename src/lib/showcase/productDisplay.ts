/**
 * Canonical, self-contained product display strings for the controlled Fresh Corner fixture — the
 * single source of truth for product title + quantity unit, shared by the server-side fixture (for
 * cart/search/decision responses) and the client-side pre-mission product preview. Neither side
 * hardcodes its own copy of these strings: the shared mock catalog stores the product title and
 * variant title separately (e.g. product "Farm Eggs (Stale Data Demo)" / variant "Dozen"), which is
 * fine for the catalog's own callers but is not a self-contained name for a judge-facing showcase.
 */
export const FARM_EGGS_TITLE = 'Farm Eggs, dozen';
export const FARM_EGGS_UNIT = '1 dozen';
export const FARM_EGGS_PRICE = 6.99;

export const CAGE_FREE_EGGS_TITLE = 'Cage-Free Eggs, 12-pack';
export const CAGE_FREE_EGGS_UNIT = '1 dozen';

export const SOURDOUGH_TITLE = 'Artisan Sourdough Bread, 900g loaf';
export const SOURDOUGH_UNIT = '900g loaf';
export const SOURDOUGH_PRICE = 8.5;
