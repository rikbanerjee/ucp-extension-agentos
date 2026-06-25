/**
 * A4 — Schema.org JSON-LD projection
 *
 * Derives a schema.org `Product` + `Offer` JSON-LD object from a canonical
 * RAOS `Variant`. The output is ready to be embedded in a `<script
 * type="application/ld+json">` tag or returned from a prerender endpoint.
 *
 * Regions: US + CA (pilot scope; CAD/multi-currency is V2, deferred).
 * Pricing: USD only.
 * Availability: maps RAOS `InventoryState` to schema.org `ItemAvailability`.
 *
 * DETERMINISM: pure function; no I/O, no Date.now(), no Math.random().
 */

import type { Variant } from '@/lib/types/core';
import type { InventoryState } from '@/lib/types/inventory';

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

/**
 * A schema.org shipping destination region (shippingDestination entry).
 * Minimal shape — extends naturally to full ShippingDeliveryTime later.
 */
interface SchemaShippingDestination {
  '@type': 'DefinedRegion';
  addressCountry: string;
}

/**
 * A schema.org OfferShippingDetails entry.
 * Covers one region: destination + currency (rate deferred).
 */
interface SchemaShippingDetails {
  '@type': 'OfferShippingDetails';
  shippingDestination: SchemaShippingDestination;
}

/**
 * The schema.org Offer embedded in a Product JSON-LD object.
 */
export interface SchemaOrgOffer {
  '@type': 'Offer';
  price: number;
  priceCurrency: string;
  availability: SchemaOrgAvailability;
  /**
   * Shipping details for each served region (US + CA, pilot scope).
   * Agents and crawlers use this to confirm the product ships to the buyer's
   * country before recommending it.
   */
  shippingDetails: SchemaShippingDetails[];
  /**
   * When `callForPrice` is true the price is unknown; include the priceSpecification
   * so crawlers understand this is a "call for price" item rather than a free item.
   */
  priceSpecification?: {
    '@type': 'PriceSpecification';
    price: null;
    priceCurrency: 'USD';
    description: 'Call for price';
  };
}

/**
 * A schema.org ItemAvailability URL value.
 */
export type SchemaOrgAvailability =
  | 'https://schema.org/InStock'
  | 'https://schema.org/OutOfStock'
  | 'https://schema.org/LimitedAvailability'
  | 'https://schema.org/BackOrder'
  | 'https://schema.org/PreOrder';

/**
 * The schema.org Product JSON-LD object produced by `toSchemaOrgProduct`.
 * Carries Product + embedded Offer per schema.org conventions.
 */
export interface SchemaOrgProduct {
  '@context': 'https://schema.org';
  '@type': 'Product';
  /** Maps to `variant.id` — stable identifier for agents/crawlers. */
  productID: string;
  /** Maps to `variant.sku`. */
  sku: string;
  /** Maps to `variant.title`. */
  name: string;
  /** The buyable offer for this variant. */
  offers: SchemaOrgOffer;
}

// ---------------------------------------------------------------------------
// InventoryState → schema.org availability mapping
// ---------------------------------------------------------------------------

/**
 * Maps a RAOS `InventoryState` to the corresponding schema.org
 * `ItemAvailability` URL.
 *
 * `low_stock` maps to `LimitedAvailability` — the closest schema.org
 * equivalent for "available but running low". Agents should read this as
 * "available but worth flagging urgency".
 */
function toSchemaOrgAvailability(state: InventoryState): SchemaOrgAvailability {
  switch (state) {
    case 'in_stock':    return 'https://schema.org/InStock';
    case 'low_stock':   return 'https://schema.org/LimitedAvailability';
    case 'out_of_stock': return 'https://schema.org/OutOfStock';
    case 'backorder':   return 'https://schema.org/BackOrder';
    case 'preorder':    return 'https://schema.org/PreOrder';
  }
}

// ---------------------------------------------------------------------------
// Shipping destinations (US + CA pilot scope)
// ---------------------------------------------------------------------------

/** The two shipping regions for the pilot. Frozen — extend when CAD/V2 lands. */
const PILOT_SHIPPING_REGIONS: readonly string[] = ['US', 'CA'];

function buildShippingDetails(): SchemaShippingDetails[] {
  return PILOT_SHIPPING_REGIONS.map((country) => ({
    '@type': 'OfferShippingDetails',
    shippingDestination: {
      '@type': 'DefinedRegion',
      addressCountry: country,
    },
  }));
}

// ---------------------------------------------------------------------------
// Main projection
// ---------------------------------------------------------------------------

/**
 * Projects a canonical RAOS `Variant` into a schema.org `Product` + `Offer`
 * JSON-LD object.
 *
 * Edge cases:
 * - Variants with no `inventory` config are treated as `in_stock` (the engine's
 *   implicit default for pre-RAOS-0005 variants; we mirror that here).
 * - `callForPrice` variants: the Offer carries `price: 0` as a schema.org
 *   placeholder (no free-price semantics) plus a `priceSpecification` descriptor
 *   so crawlers and agents understand the price is not yet known. This is
 *   distinct from `basePrice === 0` (genuinely free).
 * - `currency` is passed through from the variant; in practice always 'USD'
 *   for the pilot, but we don't hard-code it here to stay schema-correct if
 *   the variant ever carries a different currency.
 *
 * @param variant - A canonical RAOS Variant from an adapter's `listVariants()`
 *   or `toVariants()` output.
 * @returns A schema.org Product JSON-LD object ready for serialisation.
 */
export function toSchemaOrgProduct(variant: Variant): SchemaOrgProduct {
  const inventoryState: InventoryState =
    variant.inventory?.state ?? 'in_stock';

  const availability = toSchemaOrgAvailability(inventoryState);

  const offer: SchemaOrgOffer = {
    '@type': 'Offer',
    price: variant.basePrice,
    priceCurrency: variant.currency,
    availability,
    shippingDetails: buildShippingDetails(),
    ...(variant.callForPrice
      ? {
          priceSpecification: {
            '@type': 'PriceSpecification',
            price: null,
            priceCurrency: 'USD',
            description: 'Call for price',
          },
        }
      : {}),
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    productID: variant.id,
    sku: variant.sku,
    name: variant.title,
    offers: offer,
  };
}
