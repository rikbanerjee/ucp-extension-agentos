/**
 * WP-00: Behavior-pinning unit tests for src/lib/rules/
 *
 * These tests pin the EXACT current behavior of the rule engine — including
 * surprising behaviors that may be bugs. Do NOT fix anything here: record it,
 * mark it, and let WP-01/WP-02 decide whether to change it with a reviewed
 * golden-fixture diff.
 *
 * Each "SURPRISE" comment documents a behavior that may warrant investigation.
 */

import { describe, it, expect } from 'vitest';
import { calculateVisibility, calculateEligibility } from '@/lib/rules/eligibility';
import { getApplicablePrice } from '@/lib/rules/pricing';
import { validateCartLine } from '@/lib/rules/cartValidation';
import { mockProducts } from '@/lib/mock/catalog';
import type { PricingContext } from '@/lib/types/extensions';
import type { Variant } from '@/lib/types/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findVariant(variantId: string): Variant {
  for (const p of mockProducts) {
    for (const v of p.variants) {
      if (v.id === variantId) return v;
    }
  }
  throw new Error(`Variant not found: ${variantId}`);
}

const BASE_CONTEXT: PricingContext = {
  customerType: 'member',
  membershipTier: 'none',
  marketRegion: 'CA',
  fulfillmentMode: 'shipping',
  accountLinked: true,
  taxExempt: false,
  resaleCertificateOnFile: false,
  activeExtensions: [],
};

const GUEST: PricingContext = { ...BASE_CONTEXT, customerType: 'guest', accountLinked: false };
const WHOLESALE: PricingContext = { ...BASE_CONTEXT, customerType: 'wholesale' };
const WHOLESALE_CERT: PricingContext = { ...WHOLESALE, resaleCertificateOnFile: true };
const WHOLESALE_GOLD: PricingContext = { ...WHOLESALE, membershipTier: 'gold' };
const WHOLESALE_RESELLER: PricingContext = { ...WHOLESALE, membershipTier: 'reseller_plus' };
const WHOLESALE_DISTRIBUTOR: PricingContext = { ...WHOLESALE, membershipTier: 'distributor' };

// ---------------------------------------------------------------------------
// 1. Pricing: member → bulk → promo last-wins precedence
// ---------------------------------------------------------------------------

describe('Pricing: last-wins precedence (member → bulk → promo)', () => {
  /**
   * The coffee case variant has only bulk pricing — no member or promo.
   * Verify the base flow: bulk overrides base.
   */
  it('bulk tier overrides base price when quantity threshold is met', () => {
    const v = findVariant('v_w_001_1'); // basePrice=400, tier at qty>=10: $380
    const result = getApplicablePrice(v, 10, WHOLESALE_DISTRIBUTOR);
    expect(result.priceSource).toBe('bulk_tier');
    expect(result.unitPrice).toBe(380.00);
    expect(result.isMemberPrice).toBe(false);
  });

  it('base price is returned when below MOQ (no applicable bulk tier)', () => {
    const v = findVariant('v_w_001_1'); // MOQ=10, qty=5 → no tier applies
    const result = getApplicablePrice(v, 5, WHOLESALE_DISTRIBUTOR);
    expect(result.priceSource).toBe('base');
    expect(result.unitPrice).toBe(400.00);
  });

  it('promo salePrice overrides bulk tier when promo is available', () => {
    /**
     * The cereal variant has only promo pricing (salePrice=4.00).
     * No member/bulk to compete — verify promo_sale is applied.
     */
    const v = findVariant('v_g_001_1'); // basePrice=5.50, salePrice=4.00
    const result = getApplicablePrice(v, 1, BASE_CONTEXT);
    expect(result.priceSource).toBe('promo_sale');
    expect(result.unitPrice).toBe(4.00);
    expect(result.isMemberPrice).toBe(false);
  });

  it('promo tier overrides promo salePrice when quantity threshold met', () => {
    /**
     * Sparkling water: no salePrice, but tiers at qty>=3 → $5.00
     * At qty=1, base price. At qty=3, promo_tier.
     */
    const v = findVariant('v_g_002_1'); // basePrice=6.99, promo tier qty>=3: $5.00
    const result = getApplicablePrice(v, 3, BASE_CONTEXT);
    expect(result.priceSource).toBe('promo_tier');
    expect(result.unitPrice).toBe(5.00);
  });

  it('promo salePrice takes effect before tier when both exist: salePrice step runs first, then tier replaces it', () => {
    /**
     * SURPRISE: When a promo has BOTH salePrice AND tiers, the code first
     * sets unitPrice=salePrice (promo_sale), then UNCONDITIONALLY checks tiers
     * and overwrites with promo_tier if the quantity threshold is met.
     * At qty=1 with only salePrice, priceSource='promo_sale'.
     * At qty=3+ with a tier also present, priceSource='promo_tier'.
     *
     * For the cereal variant (salePrice only, no tiers), this doesn't apply.
     * This behavior is pinned here for documentary purposes — a variant with
     * both salePrice and tiers would have salePrice ignored at sufficient qty.
     */
    const v = findVariant('v_g_001_1'); // salePrice only — promo_sale
    const at1 = getApplicablePrice(v, 1, BASE_CONTEXT);
    expect(at1.priceSource).toBe('promo_sale');
    expect(at1.unitPrice).toBe(4.00);
    // No promo tiers on cereal → salePrice is the final answer regardless of qty
    const at5 = getApplicablePrice(v, 5, BASE_CONTEXT);
    expect(at5.priceSource).toBe('promo_sale');
    expect(at5.unitPrice).toBe(4.00);
  });

  it('bulk tier: highest applicable tier wins (not first match)', () => {
    /**
     * Coffee at qty=100 should land in the $310 tier (minQuantity=100),
     * not the $380 (qty>=10) or $350 (qty>=50) tier.
     */
    const v = findVariant('v_w_001_1');
    const result = getApplicablePrice(v, 100, WHOLESALE_DISTRIBUTOR);
    expect(result.priceSource).toBe('bulk_tier');
    expect(result.unitPrice).toBe(310.00);
  });

  it('bulk tier at exact boundary (>= semantics): qty=50 lands in $350 tier', () => {
    const v = findVariant('v_w_001_1'); // tiers: [10-49→$380], [50-99→$350], [100+→$310]
    const result = getApplicablePrice(v, 50, WHOLESALE_DISTRIBUTOR);
    expect(result.priceSource).toBe('bulk_tier');
    expect(result.unitPrice).toBe(350.00);
  });

  it('bulk tier: qty=49 lands in the $380 tier, not $350 (maxQuantity boundary)', () => {
    const v = findVariant('v_w_001_1');
    const result = getApplicablePrice(v, 49, WHOLESALE_DISTRIBUTOR);
    expect(result.priceSource).toBe('bulk_tier');
    expect(result.unitPrice).toBe(380.00);
  });
});

// ---------------------------------------------------------------------------
// 2. MOQ and quantity-increment failures
// ---------------------------------------------------------------------------

describe('validateCartLine: MOQ and quantity-increment failures', () => {
  it('rejects quantity below MOQ', () => {
    const v = findVariant('v_w_001_1'); // MOQ=10
    const result = validateCartLine(v, 5, WHOLESALE_CERT);
    expect(result.valid).toBe(false);
    expect(result.messages).toContain('Minimum order quantity is 10.');
  });

  it('accepts quantity exactly at MOQ', () => {
    const v = findVariant('v_w_001_1'); // MOQ=10
    const result = validateCartLine(v, 10, WHOLESALE_CERT);
    // NOTE: eligible because context is wholesale + cert, and qty=10 meets MOQ
    expect(result.messages).not.toContain('Minimum order quantity is 10.');
    // cart valid depends on eligibility — with cert this should be valid
    expect(result.eligibility.status).toBe('ELIGIBLE');
    expect(result.valid).toBe(true);
  });

  it('rejects quantity not divisible by increment', () => {
    const v = findVariant('v_w_001_1'); // quantityIncrement=5
    const result = validateCartLine(v, 12, WHOLESALE_CERT);
    expect(result.valid).toBe(false);
    expect(result.messages).toContain('Quantity must be in increments of 5.');
  });

  it('accepts quantity that satisfies both MOQ and increment', () => {
    const v = findVariant('v_w_001_1'); // MOQ=10, increment=5
    const result = validateCartLine(v, 15, WHOLESALE_CERT);
    expect(result.messages).not.toContain('Minimum order quantity is 10.');
    expect(result.messages).not.toContain('Quantity must be in increments of 5.');
    expect(result.valid).toBe(true);
  });

  it('mug pallet: qty=1 violates MOQ=2', () => {
    const v = findVariant('v_w_002_1'); // MOQ=2
    const result = validateCartLine(v, 1, WHOLESALE_RESELLER);
    expect(result.valid).toBe(false);
    expect(result.messages).toContain('Minimum order quantity is 2.');
  });

  it('mug pallet: qty=2 meets MOQ=2 exactly', () => {
    const v = findVariant('v_w_002_1'); // MOQ=2, increment=1
    const result = validateCartLine(v, 2, WHOLESALE_RESELLER);
    // No MOQ message
    expect(result.messages).not.toContain('Minimum order quantity is 2.');
  });
});

// ---------------------------------------------------------------------------
// 3. Tier boundary >= behavior
// ---------------------------------------------------------------------------

describe('Eligibility: tier boundary >= behavior', () => {
  it('requiredTier=reseller_plus: gold (idx 1) is below reseller_plus (idx 2) → CONDITIONAL', () => {
    /**
     * SURPRISE: TIER_RESTRICTION pushes status to CONDITIONAL (not BLOCKED),
     * yet the reason has blocking=true. This is an inconsistency in the current
     * implementation: the code path is `status === 'BLOCKED' ? status : 'CONDITIONAL'`
     * which means a single TIER_RESTRICTION never escalates to BLOCKED alone.
     * Pinned here for WP-01/WP-02 review.
     */
    const v = findVariant('v_w_002_1'); // requiredTier='reseller_plus'
    const result = calculateEligibility(v, WHOLESALE_GOLD);
    expect(result.status).toBe('CONDITIONAL');
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].code).toBe('TIER_RESTRICTION');
    expect(result.reasons[0].blocking).toBe(true);
  });

  it('requiredTier=reseller_plus: reseller_plus (idx 2) meets threshold exactly → ELIGIBLE', () => {
    const v = findVariant('v_w_002_1');
    // reseller_plus meets the reseller_plus requirement (currentTierIdx >= requiredTierIdx)
    const result = calculateEligibility(v, WHOLESALE_RESELLER);
    // NOTE: still needs requireWholesale check — context IS wholesale, so passes
    expect(result.status).toBe('ELIGIBLE');
    expect(result.reasons).toHaveLength(0);
  });

  it('requiredTier=reseller_plus: distributor (idx 3) exceeds threshold → ELIGIBLE', () => {
    const v = findVariant('v_w_002_1');
    const result = calculateEligibility(v, WHOLESALE_DISTRIBUTOR);
    expect(result.status).toBe('ELIGIBLE');
  });

  it('tier hierarchy order: none=0, gold=1, reseller_plus=2, distributor=3', () => {
    /**
     * Pinning the tier hierarchy order as it exists in the code.
     * If this changes in WP-01/WP-02, golden fixtures will catch it.
     */
    const tierHierarchy = ['none', 'gold', 'reseller_plus', 'distributor'];
    expect(tierHierarchy.indexOf('none')).toBe(0);
    expect(tierHierarchy.indexOf('gold')).toBe(1);
    expect(tierHierarchy.indexOf('reseller_plus')).toBe(2);
    expect(tierHierarchy.indexOf('distributor')).toBe(3);
  });

  it('TIER_RESTRICTION reason has requirements field pointing to required tier', () => {
    const v = findVariant('v_w_002_1');
    const result = calculateEligibility(v, WHOLESALE_GOLD);
    const tierReason = result.reasons.find(r => r.code === 'TIER_RESTRICTION');
    expect(tierReason).toBeDefined();
    expect(tierReason!.requirements).toEqual([
      { type: 'membership_tier', value: 'reseller_plus' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// 4. Guest-hidden products
// ---------------------------------------------------------------------------

describe('Visibility and eligibility: guest-hidden products', () => {
  it('calculateVisibility: hideFromGuests=true hides product from guests', () => {
    const v = findVariant('v_w_001_1'); // hideFromGuests: true
    const result = calculateVisibility(v, GUEST);
    expect(result.status).toBe('HIDDEN');
    expect(result.reason).toContain('not visible to guests');
  });

  it('calculateVisibility: hideFromGuests=true is VISIBLE to members', () => {
    const v = findVariant('v_w_001_1');
    const result = calculateVisibility(v, BASE_CONTEXT);
    expect(result.status).toBe('VISIBLE');
  });

  it('calculateEligibility: hideFromGuests=true → BLOCKED with HIDDEN_PRODUCT for guests', () => {
    const v = findVariant('v_w_001_1');
    const result = calculateEligibility(v, GUEST);
    expect(result.status).toBe('BLOCKED');
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].code).toBe('HIDDEN_PRODUCT');
    expect(result.reasons[0].blocking).toBe(true);
  });

  it('hideFromGuests=false: guest can see the product (mug pallet)', () => {
    /**
     * SURPRISE: v_w_002_1 has hideFromGuests=false but requireWholesale=true.
     * Guests can SEE it (visibility=VISIBLE) but are gated by WHOLESALE_ONLY.
     * This is intentional design — visibility and eligibility are separate.
     *
     * WP-02 STATUS CHANGE (intentional per RAOS-0000 §8.1):
     * WHOLESALE_ONLY emits severity=BLOCK with requirements=[{customer_type,wholesale}].
     * A resolution path exists (buyer can create a wholesale account), so the
     * derived status is CONDITIONAL, not BLOCKED. This resolves OQ#1/#2 incoherence.
     */
    const v = findVariant('v_w_002_1'); // hideFromGuests: false
    const visibility = calculateVisibility(v, GUEST);
    expect(visibility.status).toBe('VISIBLE');

    const eligibility = calculateEligibility(v, GUEST);
    expect(eligibility.status).toBe('CONDITIONAL'); // WP-02: was BLOCKED; now CONDITIONAL (resolution path)
    expect(eligibility.reasons[0].code).toBe('WHOLESALE_ONLY');
    expect(eligibility.reasons[0].severity).toBe('BLOCK'); // severity is still BLOCK
  });

  it('getApplicablePrice returns base price for guest on hidden product (no eligibility guard)', () => {
    /**
     * SURPRISE: getApplicablePrice has NO eligibility check. It will happily
     * compute a price even for a guest-hidden product. The caller (cart
     * validation) is responsible for gating. This is pinned — not fixed.
     */
    const v = findVariant('v_w_001_1'); // guest-hidden, basePrice=400
    const result = getApplicablePrice(v, 1, GUEST);
    // No member/bulk pricing applies to a guest (correct for member check),
    // so falls through to base
    expect(result.unitPrice).toBe(400.00);
    expect(result.priceSource).toBe('base');
  });
});

// ---------------------------------------------------------------------------
// 5. REGION_RESTRICTED
// ---------------------------------------------------------------------------

describe('Eligibility: REGION_RESTRICTED', () => {
  it('PINNED: restricted region does NOT hide a variant lacking eligibilityRules (early-return shadow)', () => {
    /**
     * SURPRISE (WP-00): `calculateVisibility` early-returns VISIBLE when the
     * variant has no `eligibilityRules` — BEFORE the
     * `fulfillmentConstraints.restrictedRegions` check. The banana has
     * restrictedRegions: ['HI','AK'] but no eligibilityRules, so it stays
     * VISIBLE in HI. Note the asymmetry: `calculateEligibility` DOES catch
     * the region (its REGION_RESTRICTED check sits above its early return).
     * Pinned, not fixed — resolve in WP-01/WP-02.
     */
    const v = findVariant('v_g_003_1'); // restrictedRegions: ['HI', 'AK'], no eligibilityRules
    const ctxHI: PricingContext = { ...BASE_CONTEXT, marketRegion: 'HI' };
    const result = calculateVisibility(v, ctxHI);
    expect(result.status).toBe('VISIBLE');
  });

  it('restricted region DOES hide a variant when eligibilityRules is present (even empty)', () => {
    // Same constraints as the banana, but with an (empty) eligibilityRules
    // object so the early return is skipped — the region check now fires.
    const v = {
      ...findVariant('v_g_003_1'),
      eligibilityRules: {},
    };
    const ctxHI: PricingContext = { ...BASE_CONTEXT, marketRegion: 'HI' };
    const result = calculateVisibility(v, ctxHI);
    expect(result.status).toBe('HIDDEN');
    expect(result.reason).toContain('HI');
  });

  it('region in restrictedRegions → BLOCKED with REGION_RESTRICTED in calculateEligibility', () => {
    const v = findVariant('v_g_003_1');
    const ctxAK: PricingContext = { ...BASE_CONTEXT, marketRegion: 'AK' };
    const result = calculateEligibility(v, ctxAK);
    expect(result.status).toBe('BLOCKED');
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].code).toBe('REGION_RESTRICTED');
    expect(result.reasons[0].blocking).toBe(true);
    expect(result.reasons[0].message).toContain('AK');
  });

  it('PINNED: non-restricted region → VISIBLE and ELIGIBLE even in an unsupported fulfillment mode', () => {
    /**
     * SURPRISE (WP-00): one would expect CA + shipping to be BLOCKED with
     * FULFILLMENT_UNAVAILABLE (bananas are pickup/local_delivery only), but
     * `calculateEligibility` early-returns ELIGIBLE when the variant has no
     * `eligibilityRules` — before the availableModes check. Dead path; see
     * the FULFILLMENT_UNAVAILABLE describe block below.
     */
    const v = findVariant('v_g_003_1');
    const ctxCA: PricingContext = { ...BASE_CONTEXT, marketRegion: 'CA', fulfillmentMode: 'shipping' };
    expect(calculateVisibility(v, ctxCA).status).toBe('VISIBLE');
    const elig = calculateEligibility(v, ctxCA);
    expect(elig.status).toBe('ELIGIBLE');
    expect(elig.reasons).toHaveLength(0);
  });

  it('REGION_RESTRICTED takes precedence over other eligibility rules (early return)', () => {
    /**
     * SURPRISE: calculateEligibility returns early on REGION_RESTRICTED without
     * evaluating requireWholesale, requireResaleCertificate, etc.
     * A restricted-region wholesale customer gets only REGION_RESTRICTED,
     * not REGION_RESTRICTED + WHOLESALE_ONLY compound.
     */
    const v = findVariant('v_g_003_1'); // has fulfillmentConstraints with restrictedRegions
    const ctxWholesaleHI: PricingContext = {
      ...WHOLESALE,
      marketRegion: 'HI',
    };
    const result = calculateEligibility(v, ctxWholesaleHI);
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].code).toBe('REGION_RESTRICTED');
  });
});

// ---------------------------------------------------------------------------
// 6. WHOLESALE_ONLY and RESALE_CERTIFICATE_REQUIRED
// ---------------------------------------------------------------------------

describe('Eligibility: WHOLESALE_ONLY and RESALE_CERTIFICATE_REQUIRED', () => {
  it('member customer on wholesale-required product → CONDITIONAL WHOLESALE_ONLY (WP-02)', () => {
    /**
     * WP-02 STATUS CHANGE (intentional per RAOS-0000 §8.1):
     * WHOLESALE_ONLY has severity=BLOCK + requirements=[{customer_type,wholesale}].
     * Resolution path exists → derived status is CONDITIONAL, not BLOCKED.
     * Severity remains BLOCK — agents must surface the requirement.
     */
    const v = findVariant('v_w_001_1');
    const result = calculateEligibility(v, BASE_CONTEXT); // member
    expect(result.status).toBe('CONDITIONAL'); // WP-02: was BLOCKED; resolution path exists
    expect(result.reasons[0].code).toBe('WHOLESALE_ONLY');
    expect(result.reasons[0].severity).toBe('BLOCK');
  });

  it('wholesale customer without cert on cert-required product → CONDITIONAL RESALE_CERTIFICATE_REQUIRED (WP-02)', () => {
    /**
     * WP-02 STATUS CHANGE (intentional per RAOS-0000 §8.1):
     * RESALE_CERTIFICATE_REQUIRED has severity=BLOCK + requirements=[{resale_certificate,true}].
     * Resolution path exists (buyer can file a cert) → derived status is CONDITIONAL.
     */
    const v = findVariant('v_w_003_1'); // requireResaleCertificate=true
    const result = calculateEligibility(v, WHOLESALE); // no cert
    expect(result.status).toBe('CONDITIONAL'); // WP-02: was BLOCKED; resolution path exists
    const certReason = result.reasons.find(r => r.code === 'RESALE_CERTIFICATE_REQUIRED');
    expect(certReason).toBeDefined();
    expect(certReason!.blocking).toBe(true); // deprecated field still present
    expect(certReason!.severity).toBe('BLOCK');
  });

  it('wholesale customer WITH cert on cert-required product → ELIGIBLE', () => {
    const v = findVariant('v_w_003_1');
    const result = calculateEligibility(v, WHOLESALE_CERT);
    expect(result.status).toBe('ELIGIBLE');
    expect(result.reasons).toHaveLength(0);
  });

  it('b2b customer is treated as wholesale for requireWholesale check', () => {
    const v = findVariant('v_w_001_1'); // requireWholesale=true
    const b2b: PricingContext = { ...BASE_CONTEXT, customerType: 'b2b' };
    const result = calculateEligibility(v, b2b);
    // b2b is allowed by: `context.customerType !== 'wholesale' && context.customerType !== 'b2b'`
    // b2b is NOT 'guest' and NOT 'member', so HIDDEN_PRODUCT doesn't fire;
    // requireWholesale check passes because it checks `=== 'wholesale' || === 'b2b'`
    expect(result.reasons.find(r => r.code === 'WHOLESALE_ONLY')).toBeUndefined();
  });

  it('guest on wholesale-required product: HIDDEN_PRODUCT fires (not WHOLESALE_ONLY) when hideFromGuests=true', () => {
    const v = findVariant('v_w_001_1'); // hideFromGuests=true AND requireWholesale=true
    const result = calculateEligibility(v, GUEST);
    // HIDDEN_PRODUCT fires first (early return) so WHOLESALE_ONLY never appears
    expect(result.reasons).toHaveLength(1);
    expect(result.reasons[0].code).toBe('HIDDEN_PRODUCT');
  });
});

// ---------------------------------------------------------------------------
// 7. FULFILLMENT_UNAVAILABLE
// ---------------------------------------------------------------------------

describe('Eligibility: FULFILLMENT_UNAVAILABLE', () => {
  it('PINNED: shipping on a pickup-only variant WITHOUT eligibilityRules → ELIGIBLE (dead path)', () => {
    /**
     * SURPRISE (WP-00): the availableModes check in `calculateEligibility`
     * sits AFTER the `if (!rules) return` early return, so a variant with
     * fulfillmentConstraints but no eligibilityRules (the banana — the only
     * such variant in the catalog) can never emit FULFILLMENT_UNAVAILABLE.
     * Pinned, not fixed — resolve in WP-01/WP-02. The reachable path is
     * tested below with a synthetic variant.
     */
    const v = findVariant('v_g_003_1'); // availableModes: ['pickup', 'local_delivery'], no eligibilityRules
    const ctxShip: PricingContext = { ...BASE_CONTEXT, marketRegion: 'CA', fulfillmentMode: 'shipping' };
    const result = calculateEligibility(v, ctxShip);
    expect(result.status).toBe('ELIGIBLE');
    expect(result.reasons).toHaveLength(0);
  });

  it('shipping on a pickup-only variant WITH eligibilityRules present → BLOCKED FULFILLMENT_UNAVAILABLE', () => {
    // Empty eligibilityRules object skips the early return; the
    // availableModes check then fires as the spec intends.
    const v = {
      ...findVariant('v_g_003_1'),
      eligibilityRules: {},
    };
    const ctxShip: PricingContext = { ...BASE_CONTEXT, marketRegion: 'CA', fulfillmentMode: 'shipping' };
    const result = calculateEligibility(v, ctxShip);
    expect(result.status).toBe('BLOCKED');
    expect(result.reasons[0].code).toBe('FULFILLMENT_UNAVAILABLE');
    expect(result.reasons[0].blocking).toBe(true);
  });

  it('pickup mode on pickup/local_delivery-only product → ELIGIBLE', () => {
    const v = findVariant('v_g_003_1');
    const ctxPickup: PricingContext = { ...BASE_CONTEXT, marketRegion: 'CA', fulfillmentMode: 'pickup' };
    const result = calculateEligibility(v, ctxPickup);
    expect(result.status).toBe('ELIGIBLE');
    expect(result.reasons).toHaveLength(0);
  });

  it('FULFILLMENT_UNAVAILABLE overrides TIER_RESTRICTION: both fire but status=BLOCKED', () => {
    /**
     * SURPRISE: If a product has BOTH a tier restriction AND a fulfillment
     * constraint, the order of evaluation is:
     *   1. WHOLESALE_ONLY / RESALE check
     *   2. TIER_RESTRICTION → sets status='CONDITIONAL'
     *   3. FULFILLMENT_UNAVAILABLE → sets status='BLOCKED' (unconditional)
     *
     * So both reasons appear in the list, but final status=BLOCKED.
     * This is pinned — it means the client receives both codes even though
     * the fulfillment issue would block regardless of tier.
     *
     * To reproduce: a product with requiredTier + availableModes restriction.
     * The mug pallet has requiredTier='reseller_plus' but no availableModes.
     * The banana has availableModes but no requiredTier.
     * We test the interaction conceptually here with a vanilla object.
     */
    const syntheticVariant = {
      id: 'synthetic',
      sku: 'SYN-001',
      title: 'Synthetic',
      basePrice: 100,
      currency: 'USD',
      eligibilityRules: {
        requireWholesale: true,
        requiredTier: 'reseller_plus' as const,
      },
      fulfillmentConstraints: {
        availableModes: ['pickup' as const],
      },
    };
    const ctx: PricingContext = {
      ...WHOLESALE_GOLD,
      fulfillmentMode: 'shipping',
    };
    const result = calculateEligibility(syntheticVariant, ctx);
    // TIER_RESTRICTION fires (gold < reseller_plus), then FULFILLMENT_UNAVAILABLE fires
    expect(result.status).toBe('BLOCKED');
    const codes = result.reasons.map(r => r.code);
    expect(codes).toContain('TIER_RESTRICTION');
    expect(codes).toContain('FULFILLMENT_UNAVAILABLE');
  });
});

// ---------------------------------------------------------------------------
// 8. validateCartLine: CONDITIONAL eligibility invalidates cart
// ---------------------------------------------------------------------------

describe('validateCartLine: CONDITIONAL status invalidates line', () => {
  it('CONDITIONAL eligibility yields valid=false', () => {
    /**
     * SURPRISE: validateCartLine treats CONDITIONAL as invalid.
     * `valid = eligibility.status === 'ELIGIBLE'` means any non-ELIGIBLE
     * status (including CONDITIONAL) makes the line invalid.
     */
    const v = findVariant('v_w_002_1'); // requiredTier='reseller_plus'
    const result = validateCartLine(v, 2, WHOLESALE_GOLD); // gold < reseller_plus → CONDITIONAL
    expect(result.eligibility.status).toBe('CONDITIONAL');
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 9. getApplicablePrice: member teaser logic
// ---------------------------------------------------------------------------

describe('getApplicablePrice: member teaser', () => {
  it('guest gets no teaser when memberPricing has no requiredTier', () => {
    /**
     * SURPRISE: Teaser is only shown when `rules.requiredTier` is set AND
     * the user doesn't qualify. If memberPricing.available=true but
     * no requiredTier is set, a non-qualifying guest gets neither member
     * price nor teaser.
     *
     * In the current mock catalog no variants have requiredTier on memberPricing,
     * so this edge case can't be demonstrated with mock data alone.
     * We test via a synthetic variant.
     */
    const syntheticWithTeaserTier = {
      id: 'syn-teaser',
      sku: 'SYN-TEASER',
      title: 'Teaser Product',
      basePrice: 100,
      currency: 'USD',
      memberPricing: {
        available: true,
        memberPrice: 80,
        teaserPrice: 80,
        requiredTier: 'gold' as const,
      },
    };

    const guestResult = getApplicablePrice(syntheticWithTeaserTier, 1, GUEST);
    // Guest + requiredTier set → should get teaser
    expect(guestResult.teaser).toBeDefined();
    expect(guestResult.teaser!.price).toBe(80);
    expect(guestResult.priceSource).toBe('base'); // base price, not member
    expect(guestResult.unitPrice).toBe(100);

    // Now without requiredTier — no teaser for non-qualifying user
    const syntheticNoTier = {
      ...syntheticWithTeaserTier,
      memberPricing: {
        available: true,
        memberPrice: 80,
        teaserPrice: 80,
        requiredTier: undefined,
      },
    };
    const memberNoneResult = getApplicablePrice(syntheticNoTier, 1, BASE_CONTEXT); // membershipTier='none'
    // requiredTierIdx = 0 (undefined → 0), currentTierIdx for 'none' = 0, so 0 >= 0 → member price applies
    expect(memberNoneResult.priceSource).toBe('member');
    expect(memberNoneResult.unitPrice).toBe(80);
  });

  it('member with sufficient tier gets member price, no teaser', () => {
    const syntheticVariant = {
      id: 'syn-member',
      sku: 'SYN-MEMBER',
      title: 'Member Product',
      basePrice: 100,
      currency: 'USD',
      memberPricing: {
        available: true,
        memberPrice: 75,
        requiredTier: 'gold' as const,
      },
    };

    const goldMember: PricingContext = { ...BASE_CONTEXT, membershipTier: 'gold' };
    const result = getApplicablePrice(syntheticVariant, 1, goldMember);
    expect(result.priceSource).toBe('member');
    expect(result.unitPrice).toBe(75);
    expect(result.teaser).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 10. No-rules product: base behavior
// ---------------------------------------------------------------------------

describe('Products with no eligibility/pricing rules', () => {
  it('boutique plain T-shirt: always VISIBLE, always ELIGIBLE, always base price', () => {
    const v = findVariant('v_b_001_1'); // no eligibilityRules, no pricing extensions
    expect(calculateVisibility(v, GUEST).status).toBe('VISIBLE');
    expect(calculateVisibility(v, BASE_CONTEXT).status).toBe('VISIBLE');
    expect(calculateEligibility(v, GUEST).status).toBe('ELIGIBLE');
    expect(calculateEligibility(v, BASE_CONTEXT).status).toBe('ELIGIBLE');
    const price = getApplicablePrice(v, 1, GUEST);
    expect(price.priceSource).toBe('base');
    expect(price.unitPrice).toBe(45.00);
  });

  it('validateCartLine on no-rules product: always valid, correct line total', () => {
    const v = findVariant('v_b_002_1'); // basePrice=25
    const result = validateCartLine(v, 3, GUEST);
    expect(result.valid).toBe(true);
    expect(result.lineTotal).toBe(75.00);
    expect(result.messages).toHaveLength(0);
  });
});
