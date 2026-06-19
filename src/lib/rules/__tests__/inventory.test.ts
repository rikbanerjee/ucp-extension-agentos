/**
 * WP-05 / RAOS-0005: Inventory & Availability — unit + edge-case tests
 *
 * Covers every reason code (including RESERVATION_EXPIRED which cannot appear
 * in the static golden fixture grid) and every edge case from the WP-05 brief.
 *
 * Tests are pure-function: no DOM, no network, no Date.now(). All use
 * injected now values.
 */

import { describe, it, expect } from 'vitest';
import { evaluateInventory, createSoftHold, isHoldActive } from '@/lib/rules/inventory';
import type { Variant } from '@/lib/types/core';
import type { InventoryConfig, InventoryHold } from '@/lib/types/inventory';
import type { BuyerContext } from '@/lib/types/context';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const BASE_NOW = 100_000; // 100s past Unix epoch

const shippingContext: BuyerContext = {
  customerType: 'guest',
  loyaltyTier: 'guest',
  membershipTier: 'none',
  marketRegion: 'US',
  fulfillmentMode: 'shipping',
  accountLinked: false,
  taxExempt: false,
  resaleCertificateOnFile: false,
  trust: { mode: 'asserted' },
};

const pickupContext: BuyerContext = {
  ...shippingContext,
  fulfillmentMode: 'pickup',
};

function makeVariant(inventory: InventoryConfig): Variant {
  return {
    id: 'v_test',
    sku: 'TEST-SKU',
    title: 'Test Variant',
    basePrice: 10.00,
    currency: 'USD',
    inventory,
  };
}

function makeVariantNoInventory(): Variant {
  return {
    id: 'v_no_inv',
    sku: 'TEST-NOINV',
    title: 'No Inventory Variant',
    basePrice: 10.00,
    currency: 'USD',
  };
}

// ---------------------------------------------------------------------------
// No inventory config — passthrough (preserves pre-RAOS-0005 behavior)
// ---------------------------------------------------------------------------

describe('variants without inventory config', () => {
  it('returns in_stock with no reasons when variant has no inventory field', () => {
    const result = evaluateInventory({
      variant: makeVariantNoInventory(),
      context: shippingContext,
      holds: [],
      now: BASE_NOW,
    });
    expect(result.availability.state).toBe('in_stock');
    expect(result.reasons).toHaveLength(0);
    expect(result.blocked).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// OUT_OF_STOCK (BLOCK)
// ---------------------------------------------------------------------------

describe('OUT_OF_STOCK', () => {
  it('emits OUT_OF_STOCK BLOCK when state=out_of_stock', () => {
    const result = evaluateInventory({
      variant: makeVariant({
        state: 'out_of_stock',
        reservationPolicy: 'none',
      }),
      context: shippingContext,
      holds: [],
      now: BASE_NOW,
    });
    expect(result.blocked).toBe(true);
    const oos = result.reasons.find(r => r.code === 'OUT_OF_STOCK');
    expect(oos).toBeDefined();
    expect(oos?.severity).toBe('BLOCK');
    // Resolution path: notify-me (RAOS-0013 forward-ref)
    expect(oos?.requirements?.some(req => req.value === 'notify-me')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// LOW_STOCK (INFO)
// ---------------------------------------------------------------------------

describe('LOW_STOCK', () => {
  it('emits LOW_STOCK INFO when state=low_stock with quantityAvailable', () => {
    const result = evaluateInventory({
      variant: makeVariant({
        state: 'low_stock',
        quantityAvailable: 3,
        lowStockThreshold: 5,
        reservationPolicy: 'none',
      }),
      context: shippingContext,
      holds: [],
      now: BASE_NOW,
    });
    expect(result.blocked).toBe(false);
    const lowStock = result.reasons.find(r => r.code === 'LOW_STOCK');
    expect(lowStock).toBeDefined();
    expect(lowStock?.severity).toBe('INFO');
    // onlyXLeft should be set
    expect(result.availability.onlyXLeft).toBe(3);
  });

  it('emits LOW_STOCK when declared in_stock but qty <= threshold', () => {
    const result = evaluateInventory({
      variant: makeVariant({
        state: 'in_stock',
        quantityAvailable: 2,
        lowStockThreshold: 5,
        reservationPolicy: 'none',
      }),
      context: shippingContext,
      holds: [],
      now: BASE_NOW,
    });
    const lowStock = result.reasons.find(r => r.code === 'LOW_STOCK');
    expect(lowStock).toBeDefined();
  });

  it('does NOT emit LOW_STOCK when qty > threshold', () => {
    const result = evaluateInventory({
      variant: makeVariant({
        state: 'in_stock',
        quantityAvailable: 10,
        lowStockThreshold: 5,
        reservationPolicy: 'none',
      }),
      context: shippingContext,
      holds: [],
      now: BASE_NOW,
    });
    const lowStock = result.reasons.find(r => r.code === 'LOW_STOCK');
    expect(lowStock).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// BACKORDER_AVAILABLE (CONDITION)
// ---------------------------------------------------------------------------

describe('BACKORDER_AVAILABLE', () => {
  it('emits BACKORDER_AVAILABLE CONDITION when state=backorder', () => {
    const result = evaluateInventory({
      variant: makeVariant({
        state: 'backorder',
        backorderEta: '2026-09-01',
        reservationPolicy: 'soft_hold',
        reservationTtlSeconds: 900,
      }),
      context: shippingContext,
      holds: [],
      now: BASE_NOW,
    });
    expect(result.blocked).toBe(false);
    const bo = result.reasons.find(r => r.code === 'BACKORDER_AVAILABLE');
    expect(bo).toBeDefined();
    expect(bo?.severity).toBe('CONDITION');
    // ETA must appear in message or requirements
    expect(bo?.message).toContain('2026-09-01');
  });

  it('backorder vs hard OOS: backorder emits CONDITION, not BLOCK', () => {
    const backorderResult = evaluateInventory({
      variant: makeVariant({ state: 'backorder', backorderEta: '2026-09-01', reservationPolicy: 'none' }),
      context: shippingContext,
      holds: [],
      now: BASE_NOW,
    });
    const oosResult = evaluateInventory({
      variant: makeVariant({ state: 'out_of_stock', reservationPolicy: 'none' }),
      context: shippingContext,
      holds: [],
      now: BASE_NOW,
    });
    expect(backorderResult.blocked).toBe(false);
    expect(oosResult.blocked).toBe(true);
    expect(backorderResult.reasons[0].code).toBe('BACKORDER_AVAILABLE');
    expect(oosResult.reasons[0].code).toBe('OUT_OF_STOCK');
  });
});

// ---------------------------------------------------------------------------
// PREORDER_NOT_YET_BUYABLE (CONDITION)
// ---------------------------------------------------------------------------

describe('PREORDER_NOT_YET_BUYABLE', () => {
  it('emits PREORDER_NOT_YET_BUYABLE CONDITION when state=preorder', () => {
    const result = evaluateInventory({
      variant: makeVariant({
        state: 'preorder',
        preorderReleaseDate: '2027-03-01',
        reservationPolicy: 'soft_hold',
      }),
      context: shippingContext,
      holds: [],
      now: BASE_NOW,
    });
    expect(result.blocked).toBe(false);
    const pre = result.reasons.find(r => r.code === 'PREORDER_NOT_YET_BUYABLE');
    expect(pre).toBeDefined();
    expect(pre?.severity).toBe('CONDITION');
    // Item is visible but not addable (CONDITION, not BLOCK)
    expect(pre?.message).toContain('2027-03-01');
  });
});

// ---------------------------------------------------------------------------
// STOCK_STALE (CONDITION)
// ---------------------------------------------------------------------------

describe('STOCK_STALE', () => {
  it('emits STOCK_STALE when data is past TTL', () => {
    const fetchedAt = 1000; // 1 second past epoch
    const ttl = 60;         // 60 second TTL
    const now = fetchedAt + ttl * 1000 + 1; // 1ms past expiry

    const result = evaluateInventory({
      variant: makeVariant({
        state: 'in_stock',
        quantityAvailable: 10,
        reservationPolicy: 'none',
        dataFetchedAt: fetchedAt,
        dataTtlSeconds: ttl,
      }),
      context: shippingContext,
      holds: [],
      now,
    });
    const stale = result.reasons.find(r => r.code === 'STOCK_STALE');
    expect(stale).toBeDefined();
    expect(stale?.severity).toBe('CONDITION');
    expect(result.blocked).toBe(false); // stale is a CONDITION, not a BLOCK
  });

  it('does NOT emit STOCK_STALE when data is within TTL', () => {
    const fetchedAt = BASE_NOW - 30_000; // 30s before now
    const ttl = 60; // 60s TTL — still valid

    const result = evaluateInventory({
      variant: makeVariant({
        state: 'in_stock',
        quantityAvailable: 10,
        reservationPolicy: 'none',
        dataFetchedAt: fetchedAt,
        dataTtlSeconds: ttl,
      }),
      context: shippingContext,
      holds: [],
      now: BASE_NOW,
    });
    const stale = result.reasons.find(r => r.code === 'STOCK_STALE');
    expect(stale).toBeUndefined();
  });

  /**
   * EDGE CASE: stock changes between recommend and add.
   * Same variant, two now values straddling TTL:
   *   - at t=now1 (data fresh): no STOCK_STALE
   *   - at t=now2=now1+TTL+1 (data stale): STOCK_STALE emitted
   */
  it('stock changes between recommend and add: straddling TTL produces different outputs', () => {
    const fetchedAt = 50_000;
    const ttl = 60;
    const nowFresh = fetchedAt + ttl * 1000 - 1000; // 1s before expiry
    const nowStale = fetchedAt + ttl * 1000 + 1000; // 1s after expiry

    const variant = makeVariant({
      state: 'in_stock',
      quantityAvailable: 5,
      reservationPolicy: 'soft_hold',
      reservationTtlSeconds: 900,
      dataFetchedAt: fetchedAt,
      dataTtlSeconds: ttl,
    });

    const resultFresh = evaluateInventory({ variant, context: shippingContext, holds: [], now: nowFresh });
    const resultStale = evaluateInventory({ variant, context: shippingContext, holds: [], now: nowStale });

    expect(resultFresh.reasons.find(r => r.code === 'STOCK_STALE')).toBeUndefined();
    expect(resultStale.reasons.find(r => r.code === 'STOCK_STALE')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// LOCATION_OUT_OF_STOCK (CONDITION)
// ---------------------------------------------------------------------------

describe('LOCATION_OUT_OF_STOCK', () => {
  it('emits LOCATION_OUT_OF_STOCK CONDITION when pickup buyer has partial location availability', () => {
    const result = evaluateInventory({
      variant: makeVariant({
        state: 'in_stock',
        quantityAvailable: 4,
        perLocation: [
          { locationId: 'store_A', quantity: 4 },
          { locationId: 'store_B', quantity: 0 },
        ],
        reservationPolicy: 'soft_hold',
      }),
      context: pickupContext,
      holds: [],
      now: BASE_NOW,
    });
    const locOos = result.reasons.find(r => r.code === 'LOCATION_OUT_OF_STOCK');
    expect(locOos).toBeDefined();
    expect(locOos?.severity).toBe('CONDITION');
    expect(locOos?.message).toContain('store_A');
    expect(locOos?.message).toContain('store_B');
    expect(result.blocked).toBe(false);
  });

  it('emits OUT_OF_STOCK BLOCK when ALL pickup locations have zero stock', () => {
    const result = evaluateInventory({
      variant: makeVariant({
        state: 'in_stock',
        quantityAvailable: 0,
        perLocation: [
          { locationId: 'store_A', quantity: 0 },
          { locationId: 'store_B', quantity: 0 },
        ],
        reservationPolicy: 'none',
      }),
      context: pickupContext,
      holds: [],
      now: BASE_NOW,
    });
    const oos = result.reasons.find(r => r.code === 'OUT_OF_STOCK');
    expect(oos).toBeDefined();
    expect(oos?.severity).toBe('BLOCK');
    expect(result.blocked).toBe(true);
  });

  it('does NOT emit location reasons for shipping mode', () => {
    const result = evaluateInventory({
      variant: makeVariant({
        state: 'in_stock',
        quantityAvailable: 4,
        perLocation: [
          { locationId: 'store_A', quantity: 4 },
          { locationId: 'store_B', quantity: 0 },
        ],
        reservationPolicy: 'none',
      }),
      context: shippingContext, // shipping mode — no per-location check
      holds: [],
      now: BASE_NOW,
    });
    const locOos = result.reasons.find(r => r.code === 'LOCATION_OUT_OF_STOCK');
    expect(locOos).toBeUndefined();
  });

  /**
   * EDGE CASE: pickup location-dependent availability vs buyer fulfillmentMode.
   * Shipping buyer sees in_stock (no location filtering).
   * Pickup buyer sees LOCATION_OUT_OF_STOCK (partial).
   */
  it('fulfillmentMode changes availability: shipping sees in_stock, pickup sees LOCATION_OUT_OF_STOCK', () => {
    const variant = makeVariant({
      state: 'in_stock',
      quantityAvailable: 4,
      perLocation: [
        { locationId: 'store_A', quantity: 4 },
        { locationId: 'store_B', quantity: 0 },
      ],
      reservationPolicy: 'soft_hold',
    });

    const shippingResult = evaluateInventory({ variant, context: shippingContext, holds: [], now: BASE_NOW });
    const pickupResult = evaluateInventory({ variant, context: pickupContext, holds: [], now: BASE_NOW });

    expect(shippingResult.reasons.find(r => r.code === 'LOCATION_OUT_OF_STOCK')).toBeUndefined();
    expect(pickupResult.reasons.find(r => r.code === 'LOCATION_OUT_OF_STOCK')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// RESERVATION_EXPIRED (BLOCK)
// ---------------------------------------------------------------------------

describe('RESERVATION_EXPIRED', () => {
  it('emits RESERVATION_EXPIRED BLOCK when an active hold has expired', () => {
    const heldAt = BASE_NOW - 1000 * 1000; // held 1000s ago
    const ttl = 900; // 900s TTL — expired

    const hold: InventoryHold = {
      variantId: 'v_test',
      quantity: 1,
      heldAt,
      ttlSeconds: ttl,
    };

    const result = evaluateInventory({
      variant: makeVariant({
        state: 'in_stock',
        quantityAvailable: 5,
        reservationPolicy: 'soft_hold',
        reservationTtlSeconds: ttl,
      }),
      context: shippingContext,
      holds: [hold],
      now: BASE_NOW,
    });
    const expired = result.reasons.find(r => r.code === 'RESERVATION_EXPIRED');
    expect(expired).toBeDefined();
    expect(expired?.severity).toBe('BLOCK');
    expect(result.blocked).toBe(true);
  });

  it('does NOT emit RESERVATION_EXPIRED when hold is still active', () => {
    const heldAt = BASE_NOW - 100 * 1000; // held 100s ago
    const ttl = 900; // 900s TTL — still valid (100s < 900s)

    const hold: InventoryHold = {
      variantId: 'v_test',
      quantity: 1,
      heldAt,
      ttlSeconds: ttl,
    };

    const result = evaluateInventory({
      variant: makeVariant({
        state: 'in_stock',
        quantityAvailable: 5,
        reservationPolicy: 'soft_hold',
        reservationTtlSeconds: ttl,
      }),
      context: shippingContext,
      holds: [hold],
      now: BASE_NOW,
    });
    const expired = result.reasons.find(r => r.code === 'RESERVATION_EXPIRED');
    expect(expired).toBeUndefined();
  });

  /**
   * EDGE CASE: reservation expiry — two now values straddling TTL.
   * At now1 (inside TTL): no RESERVATION_EXPIRED.
   * At now2 (past TTL): RESERVATION_EXPIRED emitted.
   */
  it('reservation expiry: straddling TTL boundary flips from no-block to BLOCK', () => {
    const heldAt = BASE_NOW;
    const ttl = 900;

    const hold: InventoryHold = {
      variantId: 'v_test',
      quantity: 1,
      heldAt,
      ttlSeconds: ttl,
    };

    const variant = makeVariant({
      state: 'in_stock',
      quantityAvailable: 1,
      reservationPolicy: 'soft_hold',
      reservationTtlSeconds: ttl,
    });

    // Before expiry
    const resultBefore = evaluateInventory({
      variant,
      context: shippingContext,
      holds: [hold],
      now: heldAt + ttl * 1000 - 1, // 1ms before expiry
    });
    expect(resultBefore.reasons.find(r => r.code === 'RESERVATION_EXPIRED')).toBeUndefined();

    // After expiry
    const resultAfter = evaluateInventory({
      variant,
      context: shippingContext,
      holds: [hold],
      now: heldAt + ttl * 1000 + 1, // 1ms after expiry
    });
    expect(resultAfter.reasons.find(r => r.code === 'RESERVATION_EXPIRED')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// createSoftHold / isHoldActive helpers
// ---------------------------------------------------------------------------

describe('createSoftHold', () => {
  it('creates a hold with the correct fields', () => {
    const hold = createSoftHold('v_abc', 2, BASE_NOW, 900);
    expect(hold.variantId).toBe('v_abc');
    expect(hold.quantity).toBe(2);
    expect(hold.heldAt).toBe(BASE_NOW);
    expect(hold.ttlSeconds).toBe(900);
  });
});

describe('isHoldActive', () => {
  it('returns true when hold has not expired', () => {
    const hold = createSoftHold('v_abc', 1, BASE_NOW, 900);
    expect(isHoldActive(hold, BASE_NOW + 899_000)).toBe(true);
  });

  it('returns false when hold has expired', () => {
    const hold = createSoftHold('v_abc', 1, BASE_NOW, 900);
    expect(isHoldActive(hold, BASE_NOW + 901_000)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Freshness envelope
// ---------------------------------------------------------------------------

describe('freshness envelope', () => {
  it('computedAt is always the injected now (never Date.now())', () => {
    const now = 999_999;
    const result = evaluateInventory({
      variant: makeVariant({ state: 'in_stock', reservationPolicy: 'none' }),
      context: shippingContext,
      holds: [],
      now,
    });
    expect(result.availability.freshness.computedAt).toBe(now);
  });

  it('ttlSeconds defaults to 60 when not set', () => {
    const result = evaluateInventory({
      variant: makeVariant({ state: 'in_stock', reservationPolicy: 'none' }),
      context: shippingContext,
      holds: [],
      now: BASE_NOW,
    });
    expect(result.availability.freshness.ttlSeconds).toBe(60);
  });

  it('ttlSeconds uses configured value when set', () => {
    const result = evaluateInventory({
      variant: makeVariant({ state: 'in_stock', reservationPolicy: 'none', dataTtlSeconds: 300 }),
      context: shippingContext,
      holds: [],
      now: BASE_NOW,
    });
    expect(result.availability.freshness.ttlSeconds).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// Oversell race (documented determinism property)
// ---------------------------------------------------------------------------

describe('oversell race: deterministic per-evaluation', () => {
  /**
   * Two agents evaluate the same last unit at the same now.
   * Each evaluation is deterministic and identical — both see in_stock.
   * The race is a checkout-time concern (atomic stock decrement).
   * The reservation TTL is the mitigation: after TTL, RESERVATION_EXPIRED
   * forces re-evaluation before checkout.
   */
  it('two simultaneous evaluations of the same in-stock variant produce identical outputs', () => {
    const variant = makeVariant({
      state: 'in_stock',
      quantityAvailable: 1,
      reservationPolicy: 'soft_hold',
      reservationTtlSeconds: 900,
    });

    const result1 = evaluateInventory({ variant, context: shippingContext, holds: [], now: BASE_NOW });
    const result2 = evaluateInventory({ variant, context: shippingContext, holds: [], now: BASE_NOW });

    expect(result1).toEqual(result2);
    expect(result1.blocked).toBe(false);
    expect(result1.availability.state).toBe('in_stock');
  });
});
