/**
 * Type definitions for the golden fixture JSON structure.
 * These are the serialized outputs of the four rule functions under test,
 * indexed by (variantId × contextKey).
 *
 * WP-04 update: ComputedPriceState v2 fields (appliedOffers, suppressedOffers,
 * currency, priceReasons) added. Deprecated fields (isMemberPrice, appliedTier,
 * appliedOfferState) retained for one minor per RAOS-0000 §7.4.
 *
 * WP-05 update: `availability` field added — ComputedAvailability from
 * RAOS-0005 evaluateInventory(). Present for all variants; null means no
 * inventory config (treated as in_stock, no reasons). The `availabilityReasons`
 * array mirrors the reasons emitted by the inventory evaluator.
 *
 * WP-06 update: `envelope` field added — the central ProvenanceEnvelope
 * attached by pipeline.ts to every DecisionRecord. Contains the SIMULATED
 * signature and trust metadata. `trustReasons` carries the TRUST_SIMULATED
 * (and DATA_STALE when applicable) reason entries prepended to the reasons list.
 *
 * ACCEPTABLE CHANGES when regenerating with UPDATE_GOLDEN=1:
 *   - New `envelope` fields on every entry (added, not changed).
 *   - New `trustReasons` array on every entry (added, not changed).
 *   - No eligibility/price/availability outcome changes for existing pairs.
 *   - No existing field values changed.
 */

import type {
  ComputedVisibility,
  ComputedEligibility,
  ComputedPriceState,
} from '@/lib/types/extensions';
import type { ReasonEntry } from '@/lib/types/reasons';
import type { ComputedAvailability } from '@/lib/types/inventory';

export interface CartLineResult {
  valid: boolean;
  unitPrice: number;
  lineTotal: number;
  eligibility: ComputedEligibility;
  appliedTier?: {
    minQuantity: number;
    maxQuantity?: number;
    price?: number;
    promoPrice?: number;
    description?: string;
  };
  priceSource: 'base' | 'member' | 'bulk_tier' | 'promo_sale' | 'promo_tier';
  appliedOfferState?: string;
  /** v2: structured reason codes from the pricing stage (RAOS-0002). */
  priceReasons?: ReasonEntry[];
  messages: string[];
}

export interface GoldenEntry {
  /** Human-readable label: "<variantId>|<contextKey>" */
  label: string;
  variantId: string;
  contextKey: string;
  /** Quantity used for this fixture entry (1 unless a MOQ/bulk edge case). */
  quantity: number;
  visibility: ComputedVisibility;
  eligibility: ComputedEligibility;
  /** v2: includes appliedOffers, suppressedOffers, currency, reasons. */
  price: ComputedPriceState & { reasons?: ReasonEntry[] };
  cartValidation: {
    valid: boolean;
    lines: CartLineResult[];
    cartTotal: number;
    messages: string[];
  };
  /**
   * WP-05 (RAOS-0005): Inventory availability output and reason codes.
   * Present for all variants; variants without inventory config produce
   * availability.state='in_stock' with empty reasons[].
   */
  availability: ComputedAvailability;
  availabilityReasons: ReasonEntry[];

  /**
   * WP-06 (RAOS-0008): The provenance+freshness envelope attached centrally
   * by the pipeline. Present in every entry. trustMode is always 'asserted'
   * while crypto is simulated. signature has prefix 'sim:'.
   */
  envelope?: {
    issuer: string;
    keyId: string;
    signature: string;
    trustMode: 'asserted' | 'signed';
    computedAt: number;
    ttlSeconds: number;
  };

  /**
   * WP-06 (RAOS-0008): Trust reason entries prepended to the DecisionRecord.
   * Minimum: [TRUST_SIMULATED (INFO)]. Also contains DATA_STALE (CONDITION)
   * when the evaluation occurred past the TTL.
   */
  trustReasons?: ReasonEntry[];
}

export interface GoldenFixtures {
  /** ISO timestamp of last generation — informational only. */
  generatedAt: string;
  /** Total count of entries in this fixture file. */
  count: number;
  entries: GoldenEntry[];
}
