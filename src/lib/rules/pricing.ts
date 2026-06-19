/**
 * RAOS-0002 · Contextual Pricing (member + bulk)
 *
 * Pure, deterministic function. Same (variant, quantity, context) → same result.
 *
 * Evaluation order (last-wins, reproducing WP-00/WP-01 behavior exactly):
 *   1. Start with basePrice.
 *   2. Apply member pricing if buyer qualifies (priority 10).
 *   3. Apply bulk tier if quantity threshold met — overrides member (priority 20).
 *   4. Apply promo pricing if available — overrides all above (priority 30).
 *
 * New in v2 (RAOS-0002):
 *   - Emits structured AppliedOffer[] / SuppressedOffer[] replacing appliedOfferState.
 *   - callForPrice support: emits CALL_FOR_PRICE (CONDITION) and suspends price.
 *   - purchaseLimit on MemberPricing/BulkPricing: emits PURCHASE_LIMIT_EXCEEDED (BLOCK).
 *   - BELOW_MOQ and QUANTITY_INCREMENT_MISMATCH lifted from cartValidation to reason codes.
 *   - TEASER_LOCKED emitted when a buyer sees a teaser they cannot unlock.
 *   - Rounding policy: half-up to cents (roundHalfUp).
 *   - basePrice === 0 is a valid free price; it does NOT imply callForPrice.
 *
 * Deprecated (one minor): appliedOfferState, isMemberPrice, appliedTier.
 *
 * DETERMINISM: No Date.now(), Math.random(), fetch(), or new Date() here.
 */

import type { BuyerContext } from '../types/context';
import type {
  ComputedPriceState,
  AppliedOffer,
  SuppressedOffer,
  PriceTier,
  PromoTier,
} from '../types/extensions';
import type { ReasonEntry } from '../types/reasons';
import { makeReasonEntry } from '../types/reasons';
import { Variant } from '../types/core';

// ---------------------------------------------------------------------------
// Namespaces
// ---------------------------------------------------------------------------

export const MEMBER_PRICING_NAMESPACE =
  'com.os.retailagent.shopping.member_pricing';
export const BULK_PRICING_NAMESPACE =
  'com.os.retailagent.shopping.bulk_pricing';

// ---------------------------------------------------------------------------
// Reason codes (RAOS-0002 registry)
// ---------------------------------------------------------------------------

export const RAOS_0002_REASON_CODES = [
  'MEMBER_PRICE_APPLIED',
  'TEASER_LOCKED',
  'BULK_TIER_APPLIED',
  'BELOW_MOQ',
  'QUANTITY_INCREMENT_MISMATCH',
  'PURCHASE_LIMIT_EXCEEDED',
  'CALL_FOR_PRICE',
] as const;

export type Raos0002ReasonCode = typeof RAOS_0002_REASON_CODES[number];

// ---------------------------------------------------------------------------
// Rounding: half-up to cents
//
// USD-only in v1 (RAOS-0000 §11 C toggle). Multi-currency rounding is V2.
// Half-up semantics: 1.5 → 2, 1.4 → 1.
//
// NOTE on IEEE 754 floating-point: the naïve `Math.round(price * 100) / 100`
// fails for inputs like 1.005 because they are stored as
// 1.00499999... in IEEE 754 binary — rounding 100.499... → 100, not 101.
// We use the robust approach: represent the multiplication in higher precision
// by adding Number.EPSILON (the smallest float > 1) to force exact midpoints
// slightly above the .5 boundary before truncating. This is the standard
// defensive technique for financial half-up rounding in JavaScript.
//
// In practice, our merchant-supplied prices are authored as clean decimals
// (e.g., 4.99, 3.99) and the only potential half-cent case is the grocery
// mock milk price (3.995). The EPSILON trick correctly rounds it to 4.00.
// ---------------------------------------------------------------------------

export function roundHalfUp(price: number): number {
  return Math.round((price + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Tier hierarchy (same order as eligibility.ts)
// ---------------------------------------------------------------------------

const TIER_HIERARCHY = ['none', 'gold', 'reseller_plus', 'distributor'] as const;

function tierIndex(tier: string): number {
  const idx = TIER_HIERARCHY.indexOf(tier as typeof TIER_HIERARCHY[number]);
  return idx === -1 ? 0 : idx;
}

// ---------------------------------------------------------------------------
// Offer ID helpers (deterministic, no randomness)
// ---------------------------------------------------------------------------

function memberOfferId(variantId: string): string {
  return `${variantId}:member`;
}

function bulkOfferId(variantId: string, minQty: number): string {
  return `${variantId}:bulk_tier:${minQty}`;
}

function promoSaleOfferId(variantId: string): string {
  return `${variantId}:promo_sale`;
}

function promoTierOfferId(variantId: string, minQty: number): string {
  return `${variantId}:promo_tier:${minQty}`;
}

// ---------------------------------------------------------------------------
// getApplicablePrice — the reference implementation
// ---------------------------------------------------------------------------

export interface PricingResult {
  priceState: ComputedPriceState;
  reasons: ReasonEntry[];
}

/**
 * Compute the applicable price for a variant + buyer context + quantity.
 *
 * Returns both the ComputedPriceState and the reason entries so callers
 * (pipeline evaluator, cartValidation) can surface them appropriately.
 *
 * Call sites that only need the price state can use `getApplicablePrice`.
 */
export function computePrice(
  variant: Variant,
  quantity: number,
  context: BuyerContext,
): PricingResult {
  // Reject non-positive quantities immediately — invalid at any stage.
  // BLOCK is the correct severity: you cannot compute a price for nothing.
  if (quantity <= 0) {
    const reasons: ReasonEntry[] = [
      makeReasonEntry({
        code: 'BELOW_MOQ',
        message: 'Quantity must be greater than zero.',
        severity: 'BLOCK',
        source: BULK_PRICING_NAMESPACE,
        requirements: [{ type: 'moq', value: 1 }],
      }),
    ];
    return {
      priceState: {
        unitPrice: 0,
        currency: 'USD',
        priceSource: 'base',
        appliedOffers: [],
        suppressedOffers: [],
        isMemberPrice: false,
        appliedTier: undefined,
        appliedOfferState: undefined,
      },
      reasons,
    };
  }

  // callForPrice: price is unknown — emit CONDITION and return a sentinel.
  // basePrice 0 is a VALID free price and does NOT trigger this path.
  if (variant.callForPrice === true) {
    const reasons: ReasonEntry[] = [
      makeReasonEntry({
        code: 'CALL_FOR_PRICE',
        message:
          'Price must be requested — contact the merchant or submit an intent capture (RAOS-0013).',
        severity: 'CONDITION',
        source: MEMBER_PRICING_NAMESPACE,
        requirements: [{ type: 'moq', value: 0, message: 'Submit a quote request via intent capture.' }],
      }),
    ];
    return {
      priceState: {
        unitPrice: 0,
        currency: 'USD',
        priceSource: 'base',
        appliedOffers: [],
        suppressedOffers: [],
        isMemberPrice: false,
        appliedTier: undefined,
        appliedOfferState: undefined,
      },
      reasons,
    };
  }

  // -------------------------------------------------------------------------
  // Track accumulated offers as we walk through the pricing layers.
  // We collect BOTH applied and suppressed offers as we override earlier ones.
  // -------------------------------------------------------------------------

  let unitPrice = roundHalfUp(variant.basePrice);
  let priceSource: ComputedPriceState['priceSource'] = 'base';
  const appliedOffers: AppliedOffer[] = [];
  const suppressedOffers: SuppressedOffer[] = [];
  const reasons: ReasonEntry[] = [];

  // Tracks the last offer that set the winning price, so we can reference it
  // in SuppressedOffer.suppressedBy.
  let lastAppliedOfferId: string | undefined;

  // -------------------------------------------------------------------------
  // PHASE 1 — Member pricing (priority 10)
  // -------------------------------------------------------------------------

  const mp = variant.memberPricing;
  let teaserEmitted = false;

  if (mp?.available) {
    const requiredTierIdx = mp.requiredTier ? tierIndex(mp.requiredTier) : 0;
    const currentTierIdx = tierIndex(context.membershipTier);
    const qualifiesAsMember =
      context.customerType !== 'guest' && currentTierIdx >= requiredTierIdx;

    if (qualifiesAsMember && mp.memberPrice !== undefined) {
      const memberPrice = roundHalfUp(mp.memberPrice);
      const offerId = memberOfferId(variant.id);

      // Purchase limit check (enforced here; cart-level enforcement is also done in cartValidation)
      if (mp.purchaseLimit !== undefined && quantity > mp.purchaseLimit) {
        reasons.push(
          makeReasonEntry({
            code: 'PURCHASE_LIMIT_EXCEEDED',
            message: `Member pricing limits orders to ${mp.purchaseLimit} units. Reduce quantity to proceed.`,
            severity: 'BLOCK',
            source: MEMBER_PRICING_NAMESPACE,
            requirements: [{ type: 'moq', value: mp.purchaseLimit, message: `Maximum ${mp.purchaseLimit} units at member price.` }],
          }),
        );
      }

      const applied: AppliedOffer = {
        offerId,
        type: 'member',
        namespace: MEMBER_PRICING_NAMESPACE,
        priority: 10,
        stackable: false,
        exclusive: false,
        unitPriceAfter: memberPrice,
        description: `Member price${mp.requiredTier ? ` (${mp.requiredTier}+)` : ''}`,
      };
      appliedOffers.push(applied);
      unitPrice = memberPrice;
      priceSource = 'member';
      lastAppliedOfferId = offerId;

      reasons.push(
        makeReasonEntry({
          code: 'MEMBER_PRICE_APPLIED',
          message: `Member pricing applied: $${memberPrice.toFixed(2)} per unit.`,
          severity: 'INFO',
          source: MEMBER_PRICING_NAMESPACE,
        }),
      );
    } else if (!qualifiesAsMember && mp.teaserPrice !== undefined && mp.requiredTier) {
      // Teaser: buyer cannot access this price but sees the signal.
      // Addability is BLOCKED by RAOS-0001 eligibility — this spec only emits the CONDITION.
      teaserEmitted = true;
      reasons.push(
        makeReasonEntry({
          code: 'TEASER_LOCKED',
          message: `Join ${mp.requiredTier} to unlock the $${mp.teaserPrice.toFixed(2)} member price.`,
          severity: 'CONDITION',
          source: MEMBER_PRICING_NAMESPACE,
          requirements: [{ type: 'membership_tier', value: mp.requiredTier }],
        }),
      );
    }
  }

  // -------------------------------------------------------------------------
  // PHASE 2 — Bulk pricing (priority 20)
  //
  // Bulk overrides member when quantity meets a tier threshold (last-wins).
  // Also validates MOQ and increment constraints — these are BLOCK reasons.
  // -------------------------------------------------------------------------

  const bp = variant.bulkPricing;

  if (bp?.available) {
    // MOQ validation
    // Message format matches the WP-00 behavior-pinning tests (UI back-compat).
    if (bp.moq !== undefined && quantity < bp.moq) {
      reasons.push(
        makeReasonEntry({
          code: 'BELOW_MOQ',
          message: `Minimum order quantity is ${bp.moq}.`,
          severity: 'BLOCK',
          source: BULK_PRICING_NAMESPACE,
          requirements: [{ type: 'moq', value: bp.moq }],
        }),
      );
    }

    // Quantity increment validation
    // Message format matches the WP-00 behavior-pinning tests (UI back-compat).
    if (
      bp.quantityIncrement !== undefined &&
      bp.quantityIncrement > 1 &&
      quantity % bp.quantityIncrement !== 0
    ) {
      reasons.push(
        makeReasonEntry({
          code: 'QUANTITY_INCREMENT_MISMATCH',
          message: `Quantity must be in increments of ${bp.quantityIncrement}.`,
          severity: 'BLOCK',
          source: BULK_PRICING_NAMESPACE,
          requirements: [
            { type: 'quantity_increment', value: bp.quantityIncrement },
          ],
        }),
      );
    }

    // Purchase limit check
    if (bp.purchaseLimit !== undefined && quantity > bp.purchaseLimit) {
      reasons.push(
        makeReasonEntry({
          code: 'PURCHASE_LIMIT_EXCEEDED',
          message: `Bulk pricing limits orders to ${bp.purchaseLimit} units.`,
          severity: 'BLOCK',
          source: BULK_PRICING_NAMESPACE,
          requirements: [{ type: 'moq', value: bp.purchaseLimit, message: `Maximum ${bp.purchaseLimit} units.` }],
        }),
      );
    }

    // Apply bulk tier if quantity meets the threshold (>= exact boundary)
    if (bp.tiers && bp.tiers.length > 0) {
      const eligibleTiers = bp.tiers
        .filter((t: PriceTier) => quantity >= t.minQuantity && (!t.maxQuantity || quantity <= t.maxQuantity))
        .sort((a: PriceTier, b: PriceTier) => b.minQuantity - a.minQuantity);

      if (eligibleTiers.length > 0) {
        const tier = eligibleTiers[0];
        const bulkPrice = roundHalfUp(tier.price);
        const offerId = bulkOfferId(variant.id, tier.minQuantity);

        // Suppress any previously applied offer (member price)
        if (lastAppliedOfferId !== undefined && appliedOffers.length > 0) {
          const prev = appliedOffers[appliedOffers.length - 1];
          suppressedOffers.push({
            offerId: prev.offerId,
            type: prev.type,
            namespace: prev.namespace,
            priority: prev.priority,
            stackable: prev.stackable,
            exclusive: prev.exclusive,
            description: prev.description,
            suppressedBy: offerId,
            reason: 'SUPERSEDED_BY_BULK_TIER',
          });
          // Remove from applied
          appliedOffers.splice(appliedOffers.length - 1, 1);
          // Also remove the MEMBER_PRICE_APPLIED reason — bulk wins
          const mpaIdx = reasons.findIndex(r => r.code === 'MEMBER_PRICE_APPLIED');
          if (mpaIdx >= 0) reasons.splice(mpaIdx, 1);
        }

        const applied: AppliedOffer = {
          offerId,
          type: 'bulk_tier',
          namespace: BULK_PRICING_NAMESPACE,
          priority: 20,
          stackable: false,
          exclusive: false,
          unitPriceAfter: bulkPrice,
          description: `Bulk tier: ${tier.minQuantity}+ units at $${bulkPrice.toFixed(2)}/unit`,
        };
        appliedOffers.push(applied);
        unitPrice = bulkPrice;
        priceSource = 'bulk_tier';
        lastAppliedOfferId = offerId;

        reasons.push(
          makeReasonEntry({
            code: 'BULK_TIER_APPLIED',
            message: `Bulk tier applied: $${bulkPrice.toFixed(2)}/unit for ${tier.minQuantity}+ units.`,
            severity: 'INFO',
            source: BULK_PRICING_NAMESPACE,
          }),
        );
      }
    }
  }

  // -------------------------------------------------------------------------
  // PHASE 3 — Promo pricing (priority 30)
  //
  // Promo overrides all above when available (last-wins).
  // Promo pricing is owned by the promo_pricing namespace but computed here
  // for WP-02 backward-compat. WP-09 (RAOS-0006) will take over this phase.
  // -------------------------------------------------------------------------

  const pp = variant.promoPricing;

  if (pp?.available) {
    const promoNs = 'com.os.retailagent.shopping.promo_pricing';

    // Sale price override
    if (pp.salePrice !== undefined) {
      const salePrice = roundHalfUp(pp.salePrice);
      const offerId = promoSaleOfferId(variant.id);

      // Suppress prior applied offer
      if (lastAppliedOfferId !== undefined && appliedOffers.length > 0) {
        const prev = appliedOffers[appliedOffers.length - 1];
        suppressedOffers.push({
          offerId: prev.offerId,
          type: prev.type,
          namespace: prev.namespace,
          priority: prev.priority,
          stackable: prev.stackable,
          exclusive: prev.exclusive,
          description: prev.description,
          suppressedBy: offerId,
          reason: 'SUPERSEDED_BY_PROMO',
        });
        appliedOffers.splice(appliedOffers.length - 1, 1);
        // Remove superseded INFO reason
        const prevInfoIdx = reasons.findIndex(r =>
          r.code === 'MEMBER_PRICE_APPLIED' || r.code === 'BULK_TIER_APPLIED'
        );
        if (prevInfoIdx >= 0) reasons.splice(prevInfoIdx, 1);
      }

      const applied: AppliedOffer = {
        offerId,
        type: 'promo_sale',
        namespace: promoNs,
        priority: 30,
        stackable: false,
        exclusive: false,
        unitPriceAfter: salePrice,
        description: pp.description || 'Sale price',
      };
      appliedOffers.push(applied);
      unitPrice = salePrice;
      priceSource = 'promo_sale';
      lastAppliedOfferId = offerId;
    }

    // Promo tier override (higher priority within promo — overrides sale price)
    if (pp.tiers && pp.tiers.length > 0) {
      const eligiblePromoTiers = pp.tiers
        .filter((t: PromoTier) => quantity >= t.minQuantity)
        .sort((a: PromoTier, b: PromoTier) => b.minQuantity - a.minQuantity);

      if (eligiblePromoTiers.length > 0) {
        const tier = eligiblePromoTiers[0];
        const promoPrice = roundHalfUp(tier.promoPrice);
        const offerId = promoTierOfferId(variant.id, tier.minQuantity);

        // Suppress prior applied offer (sale or member/bulk if no sale)
        if (lastAppliedOfferId !== undefined && appliedOffers.length > 0) {
          const prev = appliedOffers[appliedOffers.length - 1];
          suppressedOffers.push({
            offerId: prev.offerId,
            type: prev.type,
            namespace: prev.namespace,
            priority: prev.priority,
            stackable: prev.stackable,
            exclusive: prev.exclusive,
            description: prev.description,
            suppressedBy: offerId,
            reason: 'SUPERSEDED_BY_PROMO_TIER',
          });
          appliedOffers.splice(appliedOffers.length - 1, 1);
          const prevInfoIdx = reasons.findIndex(r =>
            r.code === 'MEMBER_PRICE_APPLIED' || r.code === 'BULK_TIER_APPLIED'
          );
          if (prevInfoIdx >= 0) reasons.splice(prevInfoIdx, 1);
        }

        const applied: AppliedOffer = {
          offerId,
          type: 'promo_tier',
          namespace: promoNs,
          priority: 30,
          stackable: false,
          exclusive: false,
          unitPriceAfter: promoPrice,
          description: tier.description || pp.description || 'Promotional offer',
        };
        appliedOffers.push(applied);
        unitPrice = promoPrice;
        priceSource = 'promo_tier';
        lastAppliedOfferId = offerId;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Build deprecated compat fields from the new structures
  // -------------------------------------------------------------------------

  const lastApplied = appliedOffers[appliedOffers.length - 1];
  const appliedOfferStateCompat = lastApplied
    ? lastApplied.description
    : undefined;

  const isMemberPriceCompat = appliedOffers.some(o => o.type === 'member');

  // appliedTier compat: extract raw tier object if the last applied is bulk_tier or promo_tier
  let appliedTierCompat: PriceTier | PromoTier | undefined;
  if (lastApplied?.type === 'bulk_tier' && bp?.tiers) {
    const minQty = parseInt(lastApplied.offerId.split(':')[2] ?? '0');
    appliedTierCompat = bp.tiers.find((t: PriceTier) => t.minQuantity === minQty);
  } else if ((lastApplied?.type === 'promo_sale' || lastApplied?.type === 'promo_tier') && pp?.tiers) {
    const minQty = parseInt(lastApplied.offerId.split(':')[2] ?? '0');
    appliedTierCompat = pp.tiers.find((t: PromoTier) => t.minQuantity === minQty);
  }

  // Build teaser if TEASER_LOCKED was emitted
  let teaserOutput: { message: string; price: number } | undefined;
  if (teaserEmitted && mp?.teaserPrice !== undefined && mp.requiredTier) {
    teaserOutput = {
      message: `Join ${mp.requiredTier} for $${mp.teaserPrice.toFixed(2)}`,
      price: mp.teaserPrice,
    };
  }

  return {
    priceState: {
      unitPrice,
      currency: 'USD',
      priceSource,
      appliedOffers,
      suppressedOffers,
      teaser: teaserOutput,
      // Deprecated compat fields
      appliedOfferState: appliedOfferStateCompat,
      isMemberPrice: isMemberPriceCompat,
      appliedTier: appliedTierCompat,
    },
    reasons,
  };
}

/**
 * Backward-compatible entry point that returns just the ComputedPriceState.
 * Callers that need reason codes should use `computePrice` directly.
 */
export function getApplicablePrice(
  variant: Variant,
  quantity: number,
  context: BuyerContext,
): ComputedPriceState {
  return computePrice(variant, quantity, context).priceState;
}
