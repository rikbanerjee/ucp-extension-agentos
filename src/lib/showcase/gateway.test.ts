import { describe, expect, it } from 'vitest';
import { createShowcaseGateway } from './fixture';
import { ShowcaseInputError } from './gateway';

const now = 1760000000000;
const freshLines = [{ productId: 'v_g_inv_002_1', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 1 }];

describe('showcase gateway', () => {
  it('keeps controlled storefront capabilities, catalogs, and versions isolated', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session'); const custom = createShowcaseGateway(now, 'thecustomhub', 'custom-session');
    expect(fresh.getStorefrontCapabilities()).toMatchObject({ storefrontId: 'fresh-corner', catalogVersion: 'fresh-corner-catalog-v3' });
    expect(custom.getStorefrontCapabilities()).toMatchObject({ storefrontId: 'thecustomhub', catalogVersion: 'thecustomhub-catalog-v1', memberPricingSupported: false });
    expect(fresh.searchProducts('robotics').candidates).toEqual([]); expect(custom.searchProducts('eggs').candidates).toEqual([]);
  });
  it('maps stale inventory to a repair and preserves the original plan context', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session'); const decision = fresh.evaluatePurchasePlan(freshLines, undefined, { budget: { amount: 80, currency: 'USD' }, substitutionsAllowed: true });
    expect(decision).toMatchObject({ status: 'REPAIRABLE', code: 'STOCK_STALE', allowedNextActions: ['find_valid_alternatives', 'apply_plan_repair'] });
    const repaired = fresh.applyPlanRepair(freshLines, 'replace-stale-farm-eggs-with-cage-free-eggs', 'repair-key-1', decision.decisionId);
    expect(repaired.decision.status).toBe('ELIGIBLE'); expect(repaired.lines[0].productId).toBe('v_fresh_cagefree_001');
    const cart = fresh.prepareCart(repaired.lines, 'cart-key-1', repaired.decision.decisionId); expect(cart.cart?.total).toBe(15.99); expect(cart.checkoutStarted).toBe(false);
  });
  it('rejects cross-storefront decisions and unverified delivery prose', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session'); const decision = fresh.evaluatePurchasePlan(freshLines); const custom = createShowcaseGateway(now, 'thecustomhub', 'custom-session');
    expect(() => custom.findValidAlternatives(freshLines, decision.decisionId)).toThrow(ShowcaseInputError);
    expect(fresh.evaluatePurchasePlan(freshLines, undefined, { requestedDeliveryWindow: 'before 9:15 p.m.' }).code).toBe('DELIVERY_WINDOW_UNSUPPORTED');
  });
  it('never fabricates a custom-order price, cart, order, or checkout', () => {
    const custom = createShowcaseGateway(now, 'thecustomhub', 'custom-session'); const quote = custom.requestQuote({ productId: 'v_customhub_quote_001', quantity: 25, requirements: 'Robotics team shirts', idempotencyKey: 'quote-key-1' });
    expect(quote).toMatchObject({ fixedPrice: null, cartCreated: false, orderPlaced: false, checkoutStarted: false, merchantReviewRequired: true });
  });
});
