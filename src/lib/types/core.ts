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

/** The transport endpoints a merchant exposes for the core UCP verbs. */
export interface MerchantEndpoints {
  catalog: string;
  cart: string;
  checkout: string;
}

/**
 * The `/.well-known/ucp` manifest shape (RAOS-0000, locked B1).
 * A headline `tier` number (a maturity *summary*) BACKED BY an authoritative
 * `capabilities[]` list. Negotiation is always against `capabilities[]`.
 *
 * OQ-1 fix (2026-08-01, see spec changelog §13): `endpoints` and
 * `servesRegions` live ON the manifest itself, not only on `MerchantProfile`.
 * `buildManifest(profile)` must be a *complete, self-sufficient* discovery
 * response — a caller holding only its return value has to be able to serve
 * `/.well-known/ucp` without reaching back into the profile. Composing these
 * fields only at the discovery handler (rather than in the projection) was
 * considered and rejected: it would let every handler re-implement the same
 * assembly and re-introduce exactly the drift this defect already caused.
 */
export interface UcpManifest {
  /** Protocol version of the manifest envelope itself. */
  protocol: string;
  /** Headline conformance-tier summary (0–4). Advisory; not the negotiation surface. */
  tier: ConformanceTier;
  /** Authoritative à-la-carte list of supported capabilities. */
  capabilities: UcpCapabilityEntry[];
  /**
   * Where an agent sends catalog/cart/checkout requests. Required for Tier 0
   * (Discoverable) conformance — without it an agent cannot act on anything
   * else the manifest declares. Sourced from `MerchantProfile.endpoints`.
   *
   * Typed optional (like `keys?`) because this interface also describes the
   * narrower, capabilities-only manifest declaration some callers construct
   * directly (e.g. negotiation-only fixtures in `extensions/registry.ts`
   * tests) without going through `buildManifest`. `buildManifest`'s own
   * contract is stricter than the type: its return value ALWAYS populates
   * `endpoints` from the source profile — see its doc comment and the
   * `projections.test.ts` coverage. Callers that need the guarantee should
   * go through `buildManifest`, not construct `UcpManifest` by hand.
   */
  endpoints?: MerchantEndpoints;
  /**
   * ISO 3166-1 alpha-2 country codes this merchant serves. Sourced from
   * `MerchantProfile.servesRegions`.
   *
   * `undefined` (omitted from the manifest) means the merchant has not
   * declared a served-regions allowlist — see RAOS-0001 OQ (region-policy
   * fork, write-up pending as of 2026-08-01) for what this means for
   * eligibility enforcement. An empty array `[]` is a deliberate, literal
   * declaration of "serves nowhere" and is distinct from omission.
   */
  servesRegions?: string[];
  /**
   * OQ-2 resolution (2026-08-01, see RAOS-0001 §9 for the full write-up):
   * INFO-severity reasons attached at manifest-BUILD time by `buildManifest`
   * (not per-evaluation). Today this can only ever contain
   * `REGION_POLICY_UNDECLARED`, emitted when `MerchantProfile.servesRegions`
   * is absent at runtime — which is only reachable for JS/JSON-constructed
   * profiles that bypass the required TS field on `MerchantProfile` below.
   * A fact that never varies per product/evaluation belongs here once, not
   * repeated in every `DecisionRecord.reasons`.
   */
  reasons?: import('./reasons').ReasonEntry[];
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
  endpoints: MerchantEndpoints;
  /** Core UCP capabilities (the rails) — distinct from the RAOS extension manifest. */
  capabilities: UcpCapability[];
  /**
   * ISO 3166-1 alpha-2 country codes this merchant serves (region allowlist).
   * REQUIRED (2026-08-01, RAOS-0001 OQ-2 resolution — see `specs/0001-eligibility.md`
   * §9): a merchant integrating in TypeScript cannot compile a profile that
   * omits this. Three-state via VALUE, not via presence-in-TS-land:
   *   - non-empty array → enforced allowlist (`evaluateOffer` blocks any
   *     `marketRegion` not in the list, reusing `REGION_RESTRICTED`).
   *   - `[]` → declared, literally, "serves nowhere" — every region blocked.
   *   - `undefined` at runtime → the "undeclared" state. TypeScript prevents
   *     authoring this for typed profiles; it remains reachable for JS
   *     callers and profiles deserialized from JSON with no validation layer
   *     in front of them. `evaluateOffer` does NOT block in this case — see
   *     `buildManifest`'s `REGION_POLICY_UNDECLARED` INFO reason, the runtime
   *     backstop for the callers types can't reach.
   */
  servesRegions: string[];
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
