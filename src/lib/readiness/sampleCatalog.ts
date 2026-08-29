/**
 * Built-in sample catalog — "Rosemary & Rye", a small Boutique & Specialty
 * Retail store. ~12 variants, deliberately including:
 *   - regular + member prices (Whiskey Stones Gift Set)
 *   - an out-of-stock product (Cedar Serving Board)
 *   - a wholesale / qualified-buyer product (Barrel-Aged Vinegar Case)
 *   - a local-delivery-only product (Fresh Bouquet Bundle)
 *   - a minimum-order-quantity rule (Cocktail Napkin Set)
 *   - a product with a specific override (Reserve Tasting Candle — hand
 *     lit/poured, needs a longer lead time than the store default)
 *
 * This is a fixture for the Readiness Studio's "Try a sample catalog" path.
 * It intentionally has nothing to do with the pilot fixtures under
 * src/lib/mock/ — those model a different scenario (TheCustomHub) and this
 * module must not be confused with them.
 */

import type { CanonicalCatalogRow } from './types';

export const SAMPLE_STORE_NAME = 'Rosemary & Rye';
export const SAMPLE_STORE_DOMAIN = 'rosemaryandrye.example';

export const SAMPLE_CATALOG_ROWS: CanonicalCatalogRow[] = [
  {
    productId: 'rr-001', variantId: 'rr-001-1', sku: 'RR-CANDLE-STD',
    title: 'Rosemary Hearth Candle', description: 'Hand-poured soy candle, 8oz tin.',
    category: 'Home', price: 24, currency: 'USD', inventoryQuantity: 42,
    availability: 'in_stock', tags: ['candle', 'gift'], sourceRowNumber: 1,
  },
  {
    productId: 'rr-002', variantId: 'rr-002-1', sku: 'RR-CANDLE-RSV',
    title: 'Reserve Tasting Candle', description: 'Limited-batch candle poured to order, longer lead time.',
    category: 'Home', price: 38, currency: 'USD', inventoryQuantity: 6,
    availability: 'in_stock', tags: ['candle', 'limited'], sourceRowNumber: 2,
  },
  {
    productId: 'rr-003', variantId: 'rr-003-1', sku: 'RR-STONES-SET',
    title: 'Whiskey Stones Gift Set', description: 'Six soapstone cubes with a walnut tray.',
    category: 'Barware', price: 34, currency: 'USD', inventoryQuantity: 60,
    availability: 'in_stock', tags: ['barware', 'gift'], sourceRowNumber: 3,
  },
  {
    productId: 'rr-004', variantId: 'rr-004-1', sku: 'RR-BOARD-CEDAR',
    title: 'Cedar Serving Board', description: 'Live-edge cedar board for cheese and charcuterie.',
    category: 'Kitchen', price: 58, currency: 'USD', inventoryQuantity: 0,
    availability: 'out_of_stock', tags: ['kitchen'], sourceRowNumber: 4,
  },
  {
    productId: 'rr-005', variantId: 'rr-005-1', sku: 'RR-VINEGAR-CASE',
    title: 'Barrel-Aged Vinegar (Case of 12)', description: 'Wholesale case pricing for cafes and shops.',
    category: 'Pantry', price: 168, currency: 'USD', inventoryQuantity: 30,
    availability: 'in_stock', tags: ['wholesale', 'pantry'], sourceRowNumber: 5,
  },
  {
    productId: 'rr-006', variantId: 'rr-006-1', sku: 'RR-BOUQUET-SEAS',
    title: 'Fresh Bouquet Bundle', description: 'Locally sourced seasonal bouquet, delivered same day.',
    category: 'Floral', price: 45, currency: 'USD', inventoryQuantity: 15,
    availability: 'in_stock', tags: ['floral', 'local-delivery'], sourceRowNumber: 6,
  },
  {
    productId: 'rr-007', variantId: 'rr-007-1', sku: 'RR-NAPKIN-SET',
    title: 'Cocktail Napkin Set', description: 'Linen napkins, sold in minimum sets of 4.',
    category: 'Barware', price: 12, currency: 'USD', inventoryQuantity: 120,
    availability: 'in_stock', tags: ['barware'], sourceRowNumber: 7,
  },
  {
    productId: 'rr-008', variantId: 'rr-008-1', sku: 'RR-BITTERS-AROM',
    title: 'Aromatic Bitters', description: 'House-blend cocktail bitters, 4oz bottle.',
    category: 'Pantry', price: 18, currency: 'USD', inventoryQuantity: 75,
    availability: 'in_stock', tags: ['pantry', 'barware'], sourceRowNumber: 8,
  },
  {
    productId: 'rr-009', variantId: 'rr-009-1', sku: 'RR-GLASS-ROCKS',
    title: 'Etched Rocks Glasses (Set of 2)', description: 'Hand-etched lowball glasses.',
    category: 'Barware', price: 29, currency: 'USD', inventoryQuantity: 3,
    availability: 'in_stock', tags: ['barware', 'gift'], sourceRowNumber: 9,
  },
  {
    productId: 'rr-010', variantId: 'rr-010-1', sku: 'RR-BOARD-CHEESE',
    title: 'Marble Cheese Board', description: 'White marble board with brass handle.',
    category: 'Kitchen', price: 46, currency: 'USD', inventoryQuantity: 22,
    availability: 'in_stock', tags: ['kitchen', 'gift'], sourceRowNumber: 10,
  },
  {
    productId: 'rr-011', variantId: 'rr-011-1', sku: 'RR-HONEY-LOCAL',
    title: 'Local Wildflower Honey', description: 'Raw honey from a regional apiary partner.',
    category: 'Pantry', price: 14, currency: 'USD', inventoryQuantity: 50,
    availability: 'in_stock', tags: ['pantry', 'local'], sourceRowNumber: 11,
  },
  {
    productId: 'rr-012', variantId: 'rr-012-1', sku: 'RR-APRON-CANVAS',
    title: 'Waxed Canvas Apron', description: 'Durable kitchen apron, adjustable strap.',
    category: 'Kitchen', price: 52, currency: 'USD', inventoryQuantity: 18,
    availability: 'in_stock', tags: ['kitchen'], sourceRowNumber: 12,
  },
];
