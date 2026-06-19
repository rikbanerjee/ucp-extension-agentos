export interface UcpCapability {
  id: string;
  name: string;
  version: string;
  description: string;
}

/**
 * A single entry in the authoritative à-la-carte capability list published at
 * `/.well-known/ucp` (RAOS-0000). The `{ namespace, version }` pair is the
 * machine-authoritative surface agents negotiate against; the remaining fields
 * are human-facing descriptors. A merchant MAY list an individual higher-tier
 * capability without raising its headline `tier`.
 */
export interface UcpCapabilityEntry {
  id: string;
  name: string;
  /** Authoritative — agents negotiate on `namespace@version`, never on the headline tier. */
  namespace: string;
  /** semver per namespace (RAOS-0000 versioning contract). */
  version: string;
  description: string;
  /** Is this capability required to transact with the merchant at all? */
  required: boolean;
  /** The conformance tier this capability is *typically* associated with (advisory only). */
  tier: ConformanceTier;
}

/** Conformance tier ladder (RAOS-0000) — merchant implementation maturity, cumulative. */
export type ConformanceTier = 0 | 1 | 2 | 3 | 4;

/**
 * The `/.well-known/ucp` manifest shape (RAOS-0000, locked B1).
 * A headline `tier` number (a maturity *summary*) BACKED BY an authoritative
 * `capabilities[]` list. Negotiation is always against `capabilities[]`.
 */
export interface UcpManifest {
  /** Protocol version of the manifest envelope itself. */
  protocol: string;
  /** Headline conformance-tier summary (0–4). Advisory; not the negotiation surface. */
  tier: ConformanceTier;
  /** Authoritative à-la-carte list of supported capabilities. */
  capabilities: UcpCapabilityEntry[];
  /**
   * RAOS-0008 (WP-06): Merchant signing keys.
   * Agents and verifiers use these to authenticate envelopes by `keyId`.
   * Key rotation: multiple keys may be valid simultaneously; `verifyEnvelope`
   * picks by `keyId`. An expired key (`validTo < now`) emits `KEY_EXPIRED`.
   * Required for Tier 0 (Discoverable) conformance.
   */
  keys?: MerchantKey[];
}

export interface MerchantProfile {
  merchantId: string;
  merchantName: string;
  protocolVersion: string;
  endpoints: {
    catalog: string;
    cart: string;
    checkout: string;
  };
  /** Core UCP capabilities (the rails) — distinct from the RAOS extension manifest. */
  capabilities: UcpCapability[];
  /** The locked `{ tier, capabilities[] }` manifest published at `/.well-known/ucp`. */
  manifest: UcpManifest;
}

export interface Product {
  id: string;
  merchantId: string;
  title: string;
  description: string;
  category: string;
  variants: Variant[];
}

// Forward reference for variant extensions
import { MemberPricing, BulkPricing, EligibilityRules, PromoPricing, FulfillmentConstraints } from './extensions';
import { InventoryConfig } from './inventory';
import { MerchantKey } from './envelope';

export interface Variant {
  id: string;
  sku: string;
  title: string;
  /**
   * Base unit price in dollars. Zero (0) is a valid free price — distinct from
   * `callForPrice: true` which means the price is unknown and must be requested.
   */
  basePrice: number;
  currency: string;
  /**
   * When true, the price stage emits CALL_FOR_PRICE (CONDITION severity).
   * Resolution path: intent-capture (RAOS-0013 forward-ref).
   * Distinct from basePrice === 0 (free sample): callForPrice means unknown
   * price, not zero price. Both are valid; do not conflate them.
   */
  callForPrice?: boolean;
  // Extensibility points
  memberPricing?: MemberPricing;
  bulkPricing?: BulkPricing;
  eligibilityRules?: EligibilityRules;
  promoPricing?: PromoPricing;
  fulfillmentConstraints?: FulfillmentConstraints;
  /**
   * RAOS-0005: Inventory & Availability config.
   * When absent, the variant is treated as `in_stock` with no inventory
   * reasons emitted — preserving implicit behavior for pre-0005 variants.
   */
  inventory?: InventoryConfig;

  /**
   * RAOS-0007: Quote Integrity & Price Lock config.
   * When present and the merchant declares ext.quote in capabilities[],
   * the QUOTE-stage evaluator will issue a QuoteToken for this variant.
   * When absent, the variant is not quoted (no token issued).
   */
  quoteConfig?: import('./quote').QuoteConfig;
}

export interface CartLine {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
}
