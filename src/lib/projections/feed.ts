/**
 * A4 — Google-format product feed projection
 *
 * Derives a flat feed row per variant, shaped to match the Google Merchant
 * Center / Shopping Ads feed specification. This reuses the merchant's
 * existing export muscle — TheCustomHub already exports to Amazon and Walmart
 * in a compatible shape; the RAOS feed is "the next channel".
 *
 * Field mapping sourced from:
 *   - 01-discovery.md (merchant's existing Google category taxonomy strings)
 *   - 02-spine-design.md §3 (RAOS → products.json field mapping)
 *   - Google Merchant Center feed specification (attribute names)
 *
 * Regions / shipping: US + CA pilot scope, USD only.
 *
 * DETERMINISM: pure function; no I/O, no Date.now(), no Math.random().
 */

import type { Variant } from '@/lib/types/core';
import type { InventoryState } from '@/lib/types/inventory';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/**
 * Google feed availability values (Google Merchant Center attribute).
 */
export type FeedAvailability =
  | 'in stock'
  | 'out of stock'
  | 'preorder'
  | 'backorder';

/**
 * A single row in a Google-format product feed.
 *
 * Field names follow Google Merchant Center's attribute names verbatim
 * (snake_case with spaces where the spec uses them). This shape is stable
 * across the pilot — extend with optional fields as needed.
 *
 * Reference: https://support.google.com/merchants/answer/7052112
 */
export interface ProductFeedRow {
  /** Unique identifier (id attribute). Maps to `variant.id`. */
  id: string;

  /** Variant title / display name. Maps to `variant.title`. */
  title: string;

  /**
   * Price string in "amount currency" format (e.g. "29.99 USD").
   * When `callForPrice` is true, this field is the empty string — Google
   * will not list the item until the price is resolved, which is intentional.
   */
  price: string;

  /**
   * Google Merchant Center availability value.
   * Maps from RAOS `InventoryState`; `low_stock` and `in_stock` both map to
   * "in stock" because Google does not have a "limited availability" value at
   * the feed level (schema.org has one; the feed does not).
   */
  availability: FeedAvailability;

  /**
   * SKU — the merchant's own product/variant reference code.
   * Maps to `variant.sku`. Used as `mpn` (Manufacturer Part Number) placeholder
   * when no GTIN is available; also kept as `id` for the feed row.
   */
  sku: string;

  /**
   * Currency code. Always 'USD' for the pilot.
   * Carried explicitly so feed consumers don't need to parse the price string.
   */
  currency: string;

  /**
   * Whether the variant requires a price-request flow rather than direct
   * purchase. Agents should treat `call_for_price: true` as "not
   * instantly buyable" and surface the intent-capture path instead.
   */
  call_for_price: boolean;

  /**
   * Comma-separated list of countries this variant ships to.
   * Pilot: "US,CA". Expand for V2 multi-region.
   */
  ships_to: string;
}

// ---------------------------------------------------------------------------
// InventoryState → Google feed availability mapping
// ---------------------------------------------------------------------------

/**
 * Maps RAOS `InventoryState` to a Google feed `availability` attribute value.
 *
 * Google does not have a "limited availability" feed value, so `low_stock`
 * falls back to "in stock". The schema.org projection (toSchemaOrgProduct)
 * uses `LimitedAvailability` for that nuance instead.
 */
function toFeedAvailability(state: InventoryState): FeedAvailability {
  switch (state) {
    case 'in_stock':
    case 'low_stock':
      return 'in stock';
    case 'out_of_stock':
      return 'out of stock';
    case 'preorder':
      return 'preorder';
    case 'backorder':
      return 'backorder';
  }
}

// ---------------------------------------------------------------------------
// Shipping regions (pilot)
// ---------------------------------------------------------------------------

/** Comma-separated shipping region string for the pilot. */
const PILOT_SHIPS_TO = 'US,CA';

// ---------------------------------------------------------------------------
// Main projections
// ---------------------------------------------------------------------------

/**
 * Projects a single canonical RAOS `Variant` into a Google-format feed row.
 *
 * Edge cases:
 * - `callForPrice` variants: `price` is the empty string (Google won't list
 *   them until a price is resolved); `call_for_price` flag is set to `true`.
 * - Variants with no `inventory` config are treated as `in_stock` (mirrors
 *   the engine's implicit default for pre-RAOS-0005 variants).
 * - `currency` is passed through from the variant (always 'USD' in pilot).
 *
 * @param variant - A canonical RAOS Variant.
 * @returns A single feed row for this variant.
 */
export function toProductFeedRow(variant: Variant): ProductFeedRow {
  const inventoryState: InventoryState =
    variant.inventory?.state ?? 'in_stock';

  const availability = toFeedAvailability(inventoryState);

  // callForPrice → price is unknown; emit empty string so Google suppresses
  // listing rather than showing "$0" or a stale price.
  const priceStr = variant.callForPrice
    ? ''
    : `${variant.basePrice.toFixed(2)} ${variant.currency}`;

  return {
    id: variant.id,
    title: variant.title,
    price: priceStr,
    availability,
    sku: variant.sku,
    currency: variant.currency,
    call_for_price: variant.callForPrice ?? false,
    ships_to: PILOT_SHIPS_TO,
  };
}

/**
 * Projects a list of canonical RAOS Variants into a Google-format feed.
 *
 * This is the batch entry point — typically called with `adapter.listVariants()`
 * to produce a full feed export. Each variant maps to exactly one feed row.
 *
 * @param variants - All normalized variants from the adapter.
 * @returns An array of feed rows, one per variant, in input order.
 */
export function toProductFeed(variants: Variant[]): ProductFeedRow[] {
  return variants.map(toProductFeedRow);
}
