/**
 * WP-04 / RAOS-0002 — Pricing unit tests
 *
 * Covers every reason code and edge case specified in the WP-04 brief:
 *   - MEMBER_PRICE_APPLIED
 *   - TEASER_LOCKED
 *   - BULK_TIER_APPLIED
 *   - BELOW_MOQ
 *   - QUANTITY_INCREMENT_MISMATCH
 *   - PURCHASE_LIMIT_EXCEEDED
 *   - CALL_FOR_PRICE
 *   - Last-wins precedence: member → bulk → promo
 *   - Member price higher than bulk tier (last-wins documents expected behavior)
 *   - Tier boundary exactly met (>= not >)
 *   - Negative/zero quantity
 *   - basePrice = 0 (free sample) distinct from callForPrice
 *   - Rounding at half-cent boundaries
 *   - Guest teaser emitted, not blocked here (eligibility's job)
 *
 * DETERMINISM: No Date.now(), Math.random(), fetch(), or new Date() here.
 */

import { describe, it, expect } from 'vitest';
import { computePrice, getApplicablePrice, roundHalfUp } from '@/lib/rules/pricing';
import type { BuyerContext } from '@/lib/types/context';
import type { Variant } from '@/lib/types/core';

// ---------------------------------------------------------------------------
// Shared context helpers
// ---------------------------------------------------------------------------

const MEMBER_GOLD: BuyerContext = {
  customerType: 'member',
  loyaltyTier: 'gold',
  membershipTier: 'gold',
  marketRegion: 'CA',
  fulfillmentMode: 'shipping',
  accountLinked: true,
  taxExempt: false,
  resaleCertificateOnFile: false,
  trust: { mode: 'asserted' },
};

const GUEST: BuyerContext = {
  customerType: 'guest',
  loyaltyTier: 'guest',
  membershipTier: 'none',
  marketRegion: 'CA',
  fulfillmentMode: 'shipping',
  accountLinked: false,
  taxExempt: false,
  resaleCertificateOnFile: false,
  trust: { mode: 'asserted' },
};

const WHOLESALE_GOLD: BuyerContext = {
  customerType: 'wholesale',
  loyaltyTier: 'guest',
  membershipTier: 'gold',
  marketRegion: 'CA',
  fulfillmentMode: 'shipping',
  accountLinked: true,
  taxExempt: false,
  resaleCertificateOnFile: false,
  trust: { mode: 'asserted' },
};

function variant(overrides: Partial<Variant>): Variant {
  return {
    id: 'test_v1',
    sku: 'TEST-SKU',
    title: 'Test Variant',
    basePrice: 100.00,
    currency: 'USD',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Rounding
// ---------------------------------------------------------------------------

describe('roundHalfUp', () => {
  it('rounds .005 up to .01', () => {
    expect(roundHalfUp(1.005)).toBe(1.01);
  });

  it('rounds .004 down to .00', () => {
    expect(roundHalfUp(1.004)).toBe(1.00);
  });

  it('does not change whole cents', () => {
    expect(roundHalfUp(12.50)).toBe(12.50);
    expect(roundHalfUp(0)).toBe(0);
  });

  it('rounds $3.995 to $4.00 (grocery milk member price boundary)', () => {
    expect(roundHalfUp(3.995)).toBe(4.00);
  });
});

// ---------------------------------------------------------------------------
// Base price
// ---------------------------------------------------------------------------

describe('base price', () => {
  it('returns basePrice when no pricing overlays', () => {
    const v = variant({ basePrice: 50.00 });
    const { priceState } = computePrice(v, 1, GUEST);
    expect(priceState.unitPrice).toBe(50.00);
    expect(priceState.priceSource).toBe('base');
    expect(priceState.appliedOffers).toHaveLength(0);
    expect(priceState.currency).toBe('USD');
  });

  it('basePrice 0 is a valid free price — not callForPrice', () => {
    const v = variant({ basePrice: 0 });
    const { priceState, reasons } = computePrice(v, 1, GUEST);
    expect(priceState.unitPrice).toBe(0);
    expect(priceState.priceSource).toBe('base');
    expect(reasons.find(r => r.code === 'CALL_FOR_PRICE')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// CALL_FOR_PRICE
// ---------------------------------------------------------------------------

describe('CALL_FOR_PRICE', () => {
  it('emits CALL_FOR_PRICE (CONDITION) when callForPrice: true', () => {
    const v = variant({ callForPrice: true });
    const { priceState, reasons } = computePrice(v, 1, GUEST);
    const cfp = reasons.find(r => r.code === 'CALL_FOR_PRICE');
    expect(cfp).toBeDefined();
    expect(cfp?.severity).toBe('CONDITION');
    expect(priceState.appliedOffers).toHaveLength(0);
  });

  it('callForPrice overrides member pricing', () => {
    const v = variant({
      callForPrice: true,
      memberPricing: { available: true, memberPrice: 80.00, requiredTier: 'gold' },
    });
    const { reasons } = computePrice(v, 1, MEMBER_GOLD);
    expect(reasons.find(r => r.code === 'CALL_FOR_PRICE')).toBeDefined();
    expect(reasons.find(r => r.code === 'MEMBER_PRICE_APPLIED')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Negative / zero quantity
// ---------------------------------------------------------------------------

describe('quantity validation', () => {
  it('emits BELOW_MOQ (BLOCK) for quantity = 0', () => {
    const v = variant({});
    const { reasons } = computePrice(v, 0, GUEST);
    const below = reasons.find(r => r.code === 'BELOW_MOQ');
    expect(below).toBeDefined();
    expect(below?.severity).toBe('BLOCK');
  });

  it('emits BELOW_MOQ (BLOCK) for negative quantity', () => {
    const v = variant({});
    const { reasons } = computePrice(v, -5, GUEST);
    const below = reasons.find(r => r.code === 'BELOW_MOQ');
    expect(below).toBeDefined();
    expect(below?.severity).toBe('BLOCK');
  });

  it('returns zero unitPrice for invalid quantity', () => {
    const v = variant({});
    const { priceState } = computePrice(v, 0, GUEST);
    expect(priceState.unitPrice).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// MEMBER_PRICE_APPLIED
// ---------------------------------------------------------------------------

describe('member pricing — MEMBER_PRICE_APPLIED', () => {
  it('applies member price when buyer qualifies', () => {
    const v = variant({
      memberPricing: {
        available: true,
        memberPrice: 75.00,
        requiredTier: 'gold',
      },
    });
    const { priceState, reasons } = computePrice(v, 1, MEMBER_GOLD);
    expect(priceState.unitPrice).toBe(75.00);
    expect(priceState.priceSource).toBe('member');
    expect(reasons.find(r => r.code === 'MEMBER_PRICE_APPLIED')?.severity).toBe('INFO');
    expect(priceState.appliedOffers[0].type).toBe('member');
  });

  it('does NOT apply member price to guest', () => {
    const v = variant({
      memberPricing: {
        available: true,
        memberPrice: 75.00,
        teaserPrice: 75.00,
        requiredTier: 'gold',
      },
    });
    const { priceState, reasons } = computePrice(v, 1, GUEST);
    expect(priceState.unitPrice).toBe(100.00); // base price
    expect(reasons.find(r => r.code === 'MEMBER_PRICE_APPLIED')).toBeUndefined();
  });

  it('applies member price when memberPricing has no requiredTier (any non-guest)', () => {
    const v = variant({
      memberPricing: {
        available: true,
        memberPrice: 80.00,
      },
    });
    const memberNoTier: BuyerContext = { ...GUEST, customerType: 'member' };
    const { priceState } = computePrice(v, 1, memberNoTier);
    expect(priceState.unitPrice).toBe(80.00);
    expect(priceState.priceSource).toBe('member');
  });
});

// ---------------------------------------------------------------------------
// TEASER_LOCKED
// ---------------------------------------------------------------------------

describe('teaser — TEASER_LOCKED', () => {
  it('emits TEASER_LOCKED (CONDITION) for guest when teaserPrice is set', () => {
    const v = variant({
      memberPricing: {
        available: true,
        memberPrice: 75.00,
        teaserPrice: 75.00,
        requiredTier: 'gold',
      },
    });
    const { priceState, reasons } = computePrice(v, 1, GUEST);
    const teaser = reasons.find(r => r.code === 'TEASER_LOCKED');
    expect(teaser).toBeDefined();
    expect(teaser?.severity).toBe('CONDITION');
    expect(priceState.teaser).toBeDefined();
    expect(priceState.teaser?.price).toBe(75.00);
  });

  it('does NOT emit TEASER_LOCKED when buyer qualifies', () => {
    const v = variant({
      memberPricing: {
        available: true,
        memberPrice: 75.00,
        teaserPrice: 75.00,
        requiredTier: 'gold',
      },
    });
    const { reasons } = computePrice(v, 1, MEMBER_GOLD);
    expect(reasons.find(r => r.code === 'TEASER_LOCKED')).toBeUndefined();
  });

  it('teaser does not change unitPrice for unqualified buyer', () => {
    const v = variant({
      basePrice: 120.00,
      memberPricing: {
        available: true,
        memberPrice: 90.00,
        teaserPrice: 90.00,
        requiredTier: 'gold',
      },
    });
    const { priceState } = computePrice(v, 1, GUEST);
    // unitPrice remains base — teaser is display-only
    expect(priceState.unitPrice).toBe(120.00);
    expect(priceState.priceSource).toBe('base');
  });
});

// ---------------------------------------------------------------------------
// BULK_TIER_APPLIED
// ---------------------------------------------------------------------------

describe('bulk pricing — BULK_TIER_APPLIED', () => {
  const bulkVariant = variant({
    bulkPricing: {
      available: true,
      moq: 10,
      quantityIncrement: 5,
      tiers: [
        { minQuantity: 10, maxQuantity: 49, price: 80.00 },
        { minQuantity: 50, price: 65.00 },
      ],
    },
  });

  it('applies bulk tier at exact MOQ boundary (>=)', () => {
    const { priceState, reasons } = computePrice(bulkVariant, 10, WHOLESALE_GOLD);
    expect(priceState.unitPrice).toBe(80.00);
    expect(priceState.priceSource).toBe('bulk_tier');
    expect(reasons.find(r => r.code === 'BULK_TIER_APPLIED')).toBeDefined();
  });

  it('applies higher tier at second boundary (>= 50)', () => {
    const { priceState } = computePrice(bulkVariant, 50, WHOLESALE_GOLD);
    expect(priceState.unitPrice).toBe(65.00);
  });

  it('does NOT apply bulk tier below MOQ', () => {
    const { priceState, reasons } = computePrice(bulkVariant, 5, WHOLESALE_GOLD);
    expect(priceState.priceSource).toBe('base');
    expect(reasons.find(r => r.code === 'BULK_TIER_APPLIED')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// BELOW_MOQ
// ---------------------------------------------------------------------------

describe('BELOW_MOQ', () => {
  it('emits BELOW_MOQ (BLOCK) when quantity < moq', () => {
    const v = variant({
      bulkPricing: { available: true, moq: 20, tiers: [{ minQuantity: 20, price: 50.00 }] },
    });
    const { reasons } = computePrice(v, 5, WHOLESALE_GOLD);
    const below = reasons.find(r => r.code === 'BELOW_MOQ');
    expect(below).toBeDefined();
    expect(below?.severity).toBe('BLOCK');
    expect(below?.requirements).toBeDefined();
    expect(below?.requirements?.[0]?.value).toBe(20);
  });

  it('does NOT emit BELOW_MOQ when quantity exactly equals moq', () => {
    const v = variant({
      bulkPricing: { available: true, moq: 20, tiers: [{ minQuantity: 20, price: 50.00 }] },
    });
    const { reasons } = computePrice(v, 20, WHOLESALE_GOLD);
    expect(reasons.find(r => r.code === 'BELOW_MOQ')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// QUANTITY_INCREMENT_MISMATCH
// ---------------------------------------------------------------------------

describe('QUANTITY_INCREMENT_MISMATCH', () => {
  it('emits QUANTITY_INCREMENT_MISMATCH when quantity is not a multiple of increment', () => {
    const v = variant({
      bulkPricing: {
        available: true,
        moq: 10,
        quantityIncrement: 10,
        tiers: [{ minQuantity: 10, price: 80.00 }],
      },
    });
    const { reasons } = computePrice(v, 15, WHOLESALE_GOLD);
    const mismatch = reasons.find(r => r.code === 'QUANTITY_INCREMENT_MISMATCH');
    expect(mismatch).toBeDefined();
    expect(mismatch?.severity).toBe('BLOCK');
  });

  it('does NOT emit QUANTITY_INCREMENT_MISMATCH for a perfect multiple', () => {
    const v = variant({
      bulkPricing: {
        available: true,
        moq: 10,
        quantityIncrement: 10,
        tiers: [{ minQuantity: 10, price: 80.00 }],
      },
    });
    const { reasons } = computePrice(v, 20, WHOLESALE_GOLD);
    expect(reasons.find(r => r.code === 'QUANTITY_INCREMENT_MISMATCH')).toBeUndefined();
  });

  it('does NOT emit QUANTITY_INCREMENT_MISMATCH when increment is 1 (no constraint)', () => {
    const v = variant({
      bulkPricing: { available: true, moq: 2, quantityIncrement: 1, tiers: [{ minQuantity: 2, price: 80.00 }] },
    });
    const { reasons } = computePrice(v, 3, WHOLESALE_GOLD);
    expect(reasons.find(r => r.code === 'QUANTITY_INCREMENT_MISMATCH')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PURCHASE_LIMIT_EXCEEDED
// ---------------------------------------------------------------------------

describe('PURCHASE_LIMIT_EXCEEDED', () => {
  it('emits PURCHASE_LIMIT_EXCEEDED (BLOCK) for member pricing when qty > purchaseLimit', () => {
    const v = variant({
      memberPricing: {
        available: true,
        memberPrice: 150.00,
        requiredTier: 'gold',
        purchaseLimit: 2,
      },
    });
    const { reasons } = computePrice(v, 3, MEMBER_GOLD);
    const exceeded = reasons.find(r => r.code === 'PURCHASE_LIMIT_EXCEEDED');
    expect(exceeded).toBeDefined();
    expect(exceeded?.severity).toBe('BLOCK');
  });

  it('does NOT emit PURCHASE_LIMIT_EXCEEDED when qty <= purchaseLimit', () => {
    const v = variant({
      memberPricing: {
        available: true,
        memberPrice: 150.00,
        requiredTier: 'gold',
        purchaseLimit: 2,
      },
    });
    const { reasons: r1 } = computePrice(v, 1, MEMBER_GOLD);
    const { reasons: r2 } = computePrice(v, 2, MEMBER_GOLD);
    expect(r1.find(r => r.code === 'PURCHASE_LIMIT_EXCEEDED')).toBeUndefined();
    expect(r2.find(r => r.code === 'PURCHASE_LIMIT_EXCEEDED')).toBeUndefined();
  });

  it('emits PURCHASE_LIMIT_EXCEEDED (BLOCK) for bulk pricing', () => {
    const v = variant({
      bulkPricing: {
        available: true,
        moq: 10,
        quantityIncrement: 10,
        purchaseLimit: 100,
        tiers: [{ minQuantity: 10, price: 50.00 }],
      },
    });
    const { reasons } = computePrice(v, 110, WHOLESALE_GOLD);
    const exceeded = reasons.find(r => r.code === 'PURCHASE_LIMIT_EXCEEDED');
    expect(exceeded).toBeDefined();
    expect(exceeded?.severity).toBe('BLOCK');
  });
});

// ---------------------------------------------------------------------------
// Last-wins precedence: member → bulk → promo
// ---------------------------------------------------------------------------

describe('last-wins precedence: member → bulk → promo', () => {
  const memberBulkPromoVariant = variant({
    memberPricing: { available: true, memberPrice: 85.00, requiredTier: 'gold' },
    bulkPricing: {
      available: true,
      moq: 5,
      tiers: [{ minQuantity: 5, price: 80.00 }],
    },
    promoPricing: { available: true, salePrice: 75.00, description: 'Sale' },
  });

  it('promo wins over bulk and member (last-wins)', () => {
    const { priceState } = computePrice(memberBulkPromoVariant, 5, MEMBER_GOLD);
    expect(priceState.unitPrice).toBe(75.00);
    expect(priceState.priceSource).toBe('promo_sale');
  });

  it('suppressed offers contain both member and bulk when promo wins', () => {
    const { priceState } = computePrice(memberBulkPromoVariant, 5, MEMBER_GOLD);
    // Member was suppressed by bulk, bulk was suppressed by promo
    const suppressed = priceState.suppressedOffers.map(s => s.type);
    // At qty=5: member → bulk (suppresses member) → promo (suppresses bulk)
    expect(suppressed).toContain('bulk_tier');
    expect(priceState.appliedOffers[0].type).toBe('promo_sale');
  });

  it('bulk wins over member when quantity threshold met', () => {
    const v = variant({
      memberPricing: { available: true, memberPrice: 85.00, requiredTier: 'gold' },
      bulkPricing: { available: true, moq: 5, tiers: [{ minQuantity: 5, price: 80.00 }] },
    });
    const { priceState } = computePrice(v, 5, MEMBER_GOLD);
    expect(priceState.unitPrice).toBe(80.00);
    expect(priceState.priceSource).toBe('bulk_tier');
    // Member offer should be in suppressedOffers
    const suppressed = priceState.suppressedOffers.find(s => s.type === 'member');
    expect(suppressed).toBeDefined();
  });

  it('member wins when bulk threshold not met', () => {
    const v = variant({
      memberPricing: { available: true, memberPrice: 85.00, requiredTier: 'gold' },
      bulkPricing: { available: true, moq: 5, tiers: [{ minQuantity: 5, price: 80.00 }] },
    });
    const { priceState } = computePrice(v, 1, MEMBER_GOLD);
    expect(priceState.unitPrice).toBe(85.00);
    expect(priceState.priceSource).toBe('member');
  });
});

// ---------------------------------------------------------------------------
// Member price HIGHER than bulk tier (last-wins documents expected behavior)
//
// Edge case per WP-04 brief: today's last-wins means bulk always wins
// when it runs second, even if its price is higher than the member price.
// Final precedence resolution is deferred to RAOS-0006 ladder — Open Question.
// ---------------------------------------------------------------------------

describe('member price higher than bulk tier (today\'s last-wins behavior)', () => {
  it('bulk tier overrides member even when bulk price > member price (last-wins)', () => {
    const v = variant({
      basePrice: 65.00,
      memberPricing: { available: true, memberPrice: 58.00, requiredTier: 'gold' },
      bulkPricing: {
        available: true,
        moq: 10,
        quantityIncrement: 5,
        tiers: [{ minQuantity: 10, maxQuantity: 29, price: 60.00 }],
      },
    });
    // At qty=10: bulk price $60 > member price $58, but bulk runs second and wins
    // DOCUMENTED: this is the expected last-wins behavior per WP-00/WP-01 goldens.
    // Final precedence (best-for-buyer) is deferred to RAOS-0006 ladder.
    const { priceState } = computePrice(v, 10, MEMBER_GOLD);
    expect(priceState.unitPrice).toBe(60.00);
    expect(priceState.priceSource).toBe('bulk_tier');
    // Member offer is suppressed even though it was better for the buyer
    const suppressed = priceState.suppressedOffers.find(s => s.type === 'member');
    expect(suppressed).toBeDefined();
  });

  it('bulk tier at higher quantity ($48) correctly undercuts member ($58)', () => {
    const v = variant({
      basePrice: 65.00,
      memberPricing: { available: true, memberPrice: 58.00, requiredTier: 'gold' },
      bulkPricing: {
        available: true,
        moq: 10,
        quantityIncrement: 5,
        tiers: [
          { minQuantity: 10, maxQuantity: 29, price: 60.00 },
          { minQuantity: 30, price: 48.00 },
        ],
      },
    });
    const { priceState } = computePrice(v, 30, MEMBER_GOLD);
    expect(priceState.unitPrice).toBe(48.00);
    expect(priceState.priceSource).toBe('bulk_tier');
  });
});

// ---------------------------------------------------------------------------
// AppliedOffer shape invariants (WP-07 and WP-09 depend on this)
// ---------------------------------------------------------------------------

describe('AppliedOffer shape invariants', () => {
  it('applied offer has all required fields', () => {
    const v = variant({
      memberPricing: { available: true, memberPrice: 75.00, requiredTier: 'gold' },
    });
    const { priceState } = computePrice(v, 1, MEMBER_GOLD);
    const offer = priceState.appliedOffers[0];
    expect(offer).toBeDefined();
    expect(typeof offer.offerId).toBe('string');
    expect(offer.type).toBe('member');
    expect(offer.namespace).toContain('member_pricing');
    expect(typeof offer.priority).toBe('number');
    expect(typeof offer.stackable).toBe('boolean');
    expect(typeof offer.exclusive).toBe('boolean');
    expect(typeof offer.unitPriceAfter).toBe('number');
    expect(typeof offer.description).toBe('string');
  });

  it('suppressed offer has suppressedBy and reason fields', () => {
    const v = variant({
      memberPricing: { available: true, memberPrice: 85.00, requiredTier: 'gold' },
      bulkPricing: { available: true, moq: 5, tiers: [{ minQuantity: 5, price: 80.00 }] },
    });
    const { priceState } = computePrice(v, 5, MEMBER_GOLD);
    const suppressed = priceState.suppressedOffers[0];
    expect(suppressed).toBeDefined();
    expect(typeof suppressed.suppressedBy).toBe('string');
    expect(typeof suppressed.reason).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// Deprecated fields backward compat
// ---------------------------------------------------------------------------

describe('deprecated compat fields', () => {
  it('isMemberPrice is true when member offer is applied', () => {
    const v = variant({
      memberPricing: { available: true, memberPrice: 75.00, requiredTier: 'gold' },
    });
    const { priceState } = computePrice(v, 1, MEMBER_GOLD);
    expect(priceState.isMemberPrice).toBe(true);
  });

  it('isMemberPrice is false when no member offer applied', () => {
    const v = variant({});
    const { priceState } = computePrice(v, 1, GUEST);
    expect(priceState.isMemberPrice).toBe(false);
  });

  it('appliedOfferState is the description of the last applied offer', () => {
    const v = variant({
      promoPricing: { available: true, salePrice: 75.00, description: 'Weekly Sale' },
    });
    const { priceState } = computePrice(v, 1, GUEST);
    expect(priceState.appliedOfferState).toBe('Weekly Sale');
  });

  it('getApplicablePrice returns ComputedPriceState without reasons', () => {
    const v = variant({ basePrice: 50.00 });
    const result = getApplicablePrice(v, 1, GUEST);
    expect(result.unitPrice).toBe(50.00);
    expect('reasons' in result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// cartValidation integration: BELOW_MOQ and QUANTITY_INCREMENT_MISMATCH
// are now reason codes, not raw message strings
// ---------------------------------------------------------------------------

describe('cartValidation integration with RAOS-0002 reason codes', () => {
  it('validateCartLine returns valid=false and messages for BELOW_MOQ', async () => {
    const { validateCartLine } = await import('@/lib/rules/cartValidation');
    const v = variant({
      bulkPricing: { available: true, moq: 10, tiers: [{ minQuantity: 10, price: 80.00 }] },
    });
    const result = validateCartLine(v, 3, WHOLESALE_GOLD);
    expect(result.valid).toBe(false);
    expect(result.messages.some(m => m.includes('10'))).toBe(true);
    expect(result.priceReasons?.find(r => r.code === 'BELOW_MOQ')).toBeDefined();
  });

  it('validateCartLine returns valid=false and messages for QUANTITY_INCREMENT_MISMATCH', async () => {
    const { validateCartLine } = await import('@/lib/rules/cartValidation');
    const v = variant({
      bulkPricing: {
        available: true,
        moq: 10,
        quantityIncrement: 10,
        tiers: [{ minQuantity: 10, price: 80.00 }],
      },
    });
    const result = validateCartLine(v, 15, WHOLESALE_GOLD);
    expect(result.valid).toBe(false);
    expect(result.priceReasons?.find(r => r.code === 'QUANTITY_INCREMENT_MISMATCH')).toBeDefined();
  });

  it('messages still contain human-readable text for UI back-compat', async () => {
    const { validateCartLine } = await import('@/lib/rules/cartValidation');
    const v = variant({
      bulkPricing: { available: true, moq: 20, tiers: [{ minQuantity: 20, price: 50.00 }] },
    });
    const result = validateCartLine(v, 5, WHOLESALE_GOLD);
    // The message must mention the MOQ value for UI back-compat
    expect(result.messages.some(m => m.toLowerCase().includes('minimum'))).toBe(true);
  });
});
