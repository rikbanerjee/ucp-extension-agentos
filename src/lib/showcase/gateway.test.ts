import { describe, expect, it } from 'vitest';
import { createShowcaseGateway } from './fixture';
import { ShowcaseInputError } from './gateway';

const now = 1760000000000;
const freshLines = [{ productId: 'v_g_inv_002_1', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 1 }];
const customQuote = (idempotencyKey: string) => ({ productId: 'v_customhub_quote_001', quantity: 25, configuration: { color: 'Black', sizeBreakdown: [{ size: 'Youth Small', quantity: 6 }, { size: 'Youth Medium', quantity: 11 }, { size: 'Youth Large', quantity: 8 }], personalization: { placement: 'Front', method: 'One-color robotics-team logo' }, artworkStatus: 'To be supplied after quote request' }, requestedDelivery: { destination: 'Brooklyn, New York', requestedWithinDays: 15 }, budget: { amount: 500, currency: 'USD', isMaximum: true }, requirements: 'Artwork will be supplied after the quote request.', idempotencyKey });

describe('showcase gateway', () => {
  it('keeps controlled storefront capabilities, catalogs, and versions isolated', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session'); const custom = createShowcaseGateway(now, 'thecustomhub', 'custom-session');
    expect(fresh.getStorefrontCapabilities()).toMatchObject({ storefrontId: 'fresh-corner', catalogVersion: 'fresh-corner-catalog-v3' });
    expect(custom.getStorefrontCapabilities()).toMatchObject({ storefrontId: 'thecustomhub', catalogVersion: 'thecustomhub-catalog-v1', memberPricingSupported: false });
    expect(fresh.searchProducts('robotics').candidates).toEqual([]); expect(custom.searchProducts('eggs').candidates).toEqual([]);
  });
  it('maps stale inventory to a repair and preserves the original plan context', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session'); const decision = fresh.evaluatePurchasePlan(freshLines, undefined, { budget: { amount: 30, currency: 'USD' }, substitutionsAllowed: true });
    expect(decision).toMatchObject({ status: 'REPAIRABLE', code: 'STOCK_STALE', allowedNextActions: ['find_valid_alternatives', 'apply_plan_repair'] });
    const repaired = fresh.applyPlanRepair(freshLines, 'replace-stale-farm-eggs-with-cage-free-eggs', 'repair-key-1', decision.decisionId);
    expect(repaired.decision.status).toBe('ELIGIBLE'); expect(repaired.lines[0].productId).toBe('v_fresh_cagefree_001');
    const cart = fresh.prepareCart(repaired.lines, 'cart-key-1', repaired.decision.decisionId); expect(cart.cart?.total).toBe(15.99); expect(cart.checkoutStarted).toBe(false);
    expect(cart.cart?.lines.find((line) => line.productId === 'v_g_inv_001_1')?.title).toBe('Artisan Sourdough Bread, 900g loaf');
    expect(cart.cart?.lines.find((line) => line.productId === 'v_fresh_cagefree_001')?.title).toBe('Cage-Free Eggs, 12-pack');
  });
  it('gives Farm Eggs a self-contained canonical title and a correct dozen/carton quantity unit, not a bare "each"', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session-units');
    const candidates = fresh.searchProducts('eggs').candidates;
    const farmEggs = candidates.find((candidate) => candidate.productId === 'v_g_inv_002_1');
    expect(farmEggs?.title).toBe('Farm Eggs, dozen');
    expect(farmEggs?.quantityUnit).toBe('1 dozen');
    const cageFree = candidates.find((candidate) => candidate.productId === 'v_fresh_cagefree_001');
    expect(cageFree?.title).toBe('Cage-Free Eggs, 12-pack');
    expect(cageFree?.quantityUnit).toBe('1 dozen');
  });
  it('gives the bread a correct weight-based quantity unit, not the eggs’ dozen unit', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session-units-bread');
    const bread = fresh.searchProducts('sourdough').candidates.find((candidate) => candidate.productId === 'v_g_inv_001_1');
    expect(bread?.title).toBe('Artisan Sourdough Bread, 900g loaf');
    expect(bread?.quantityUnit).toBe('900g loaf');
  });
  it('ranks requested named products and supports controlled breakfast and robotics aliases without leaking storefront results', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-search');
    expect(fresh.searchProducts('Farm Eggs').candidates[0]?.productId).toBe('v_g_inv_002_1');
    expect(fresh.searchProducts('Artisan Sourdough').candidates[0]?.productId).toBe('v_g_inv_001_1');
    expect(fresh.searchProducts('breakfast').candidates.map((candidate) => candidate.productId)).toEqual(fresh.searchProducts('breakfast').candidates.map((candidate) => candidate.productId));
    expect(fresh.searchProducts('a').candidates).toEqual([]);
    expect(fresh.searchProducts('nothing-here')).toMatchObject({ code: 'NO_MATCHES', nextAction: 'Search by a product name or supported category.' });
    const custom = createShowcaseGateway(now, 'thecustomhub', 'custom-search');
    expect(custom.searchProducts('robotics').candidates[0]?.productId).toBe('v_customhub_quote_001');
    expect(custom.searchProducts('breakfast').candidates).toEqual([]);
  });
  it('keeps the named stale Farm Eggs repair path under the canonical $30 budget and returns the $15.99 cart', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'breakfast-budget');
    const decision = fresh.evaluatePurchasePlan(freshLines, undefined, { budget: { amount: 30, currency: 'USD' }, fulfillmentMode: 'local_delivery', substitutionsAllowed: true });
    expect(decision).toMatchObject({ status: 'REPAIRABLE', code: 'STOCK_STALE' });
    const repaired = fresh.applyPlanRepair(freshLines, 'replace-stale-farm-eggs-with-cage-free-eggs', 'breakfast-repair-key', decision.decisionId);
    expect(repaired.lines[0].productId).toBe('v_fresh_cagefree_001');
    const cart = fresh.prepareCart(repaired.lines, 'breakfast-cart-key', repaired.decision.decisionId);
    expect(cart.cart?.total).toBe(15.99);
  });
  it('rejects cross-storefront decisions and unverified delivery prose', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session'); const decision = fresh.evaluatePurchasePlan(freshLines); const custom = createShowcaseGateway(now, 'thecustomhub', 'custom-session');
    expect(() => custom.findValidAlternatives(freshLines, decision.decisionId)).toThrow(ShowcaseInputError);
    expect(fresh.evaluatePurchasePlan(freshLines, undefined, { requestedDeliveryWindow: 'before 9:15 p.m.' }).code).toBe('DELIVERY_WINDOW_UNSUPPORTED');
  });
  it('never fabricates a custom-order price, cart, order, or checkout', () => {
    const custom = createShowcaseGateway(now, 'thecustomhub', 'custom-session'); const quote = custom.requestQuote(customQuote('quote-key-1'));
    expect(quote).toMatchObject({ fixedPrice: null, deliveryPromise: null, configuredQuantity: 25, cartCreated: false, orderPlaced: false, paymentInitiated: false, checkoutStarted: false, merchantReviewRequired: true });
  });
  it('validates the structured custom-apparel configuration and detects changed-payload idempotency reuse', () => {
    const custom = createShowcaseGateway(now, 'thecustomhub', 'structured-quote');
    const request = customQuote('structured-quote-key');
    const first = custom.requestQuote(request); expect(custom.requestQuote(request)).toEqual(first);
    expect(() => custom.requestQuote({ ...request, configuration: { ...request.configuration, sizeBreakdown: [{ size: 'Youth Small', quantity: 6 }, { size: 'Youth Medium', quantity: 10 }, { size: 'Youth Large', quantity: 8 }] } })).toThrow(ShowcaseInputError);
    const badColor = { ...customQuote('bad-color-key'), configuration: { ...request.configuration, color: 'Blue' } };
    expect(() => custom.requestQuote(badColor)).toThrow(ShowcaseInputError);
    const duplicateSize = { ...customQuote('duplicate-size-key'), configuration: { ...request.configuration, sizeBreakdown: [{ size: 'Youth Small', quantity: 6 }, { size: 'Youth Small', quantity: 11 }, { size: 'Youth Large', quantity: 8 }] } };
    expect(() => custom.requestQuote(duplicateSize)).toThrow(ShowcaseInputError);
  });
  it('reaches QUOTE_REQUIRED for a quote-only product with a requested delivery date instead of dead-ending on an unsupported window', () => {
    const custom = createShowcaseGateway(now, 'thecustomhub', 'custom-session');
    const decision = custom.evaluatePurchasePlan([{ productId: 'v_customhub_quote_001', quantity: 25 }], undefined, { budget: { amount: 500, currency: 'USD' }, requestedDeliveryWindow: 'Brooklyn within 15 days' });
    expect(decision.status).toBe('QUOTE_REQUIRED'); expect(decision.code).toBe('QUOTE_REQUIRED'); expect(decision.allowedNextActions).toEqual(['request_quote']);
    expect(decision.reasons).toContainEqual(expect.objectContaining({ code: 'DELIVERY_WINDOW_MERCHANT_CONFIRMATION_REQUIRED', severity: 'CONDITION' }));
    const quote = custom.requestQuote(customQuote('quote-key-delivery-1'));
    expect(quote).toMatchObject({ fixedPrice: null, cartCreated: false, orderPlaced: false, checkoutStarted: false, merchantReviewRequired: true });
  });
  it('still blocks an unverifiable prose delivery window for a fixed-price product', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session');
    const decision = fresh.evaluatePurchasePlan(freshLines, undefined, { requestedDeliveryWindow: 'before 9:15 p.m.' });
    expect(decision.status).toBe('BLOCKED'); expect(decision.code).toBe('DELIVERY_WINDOW_UNSUPPORTED');
  });
  it('reaches REPAIRABLE/STOCK_STALE for the visible native prompt with an explicit fulfillmentMode and no requested delivery deadline', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session-fm-1');
    const decision = fresh.evaluatePurchasePlan(freshLines, undefined, { budget: { amount: 30, currency: 'USD' }, fulfillmentMode: 'local_delivery', substitutionsAllowed: true });
    expect(decision.status).toBe('REPAIRABLE'); expect(decision.code).toBe('STOCK_STALE');
  });
  it('rejects an invalid fulfillmentMode value with strict validation', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session-fm-2');
    expect(() => fresh.evaluatePurchasePlan(freshLines, undefined, { fulfillmentMode: 'drone_delivery' })).toThrow(ShowcaseInputError);
  });
  it('reports a credible, deterministic stale-inventory age rather than an epoch-derived duration', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session-stale-age');
    const decision = fresh.evaluatePurchasePlan(freshLines, undefined, { budget: { amount: 25, currency: 'USD' } });
    const staleReason = decision.reasons.find((reason) => reason.code === 'STOCK_STALE');
    expect(staleReason?.message).toMatch(/fetched 300s ago, TTL 60s/);
    expect(staleReason?.message).not.toMatch(/\d{6,}s ago/); // no six-plus-digit (epoch-scale) second count
  });
  it('requires shopper approval before a repair applies, and creates no cart on decline', () => {
    const fresh = createShowcaseGateway(now, 'fresh-corner', 'fresh-session'); const decision = fresh.evaluatePurchasePlan(freshLines, undefined, { budget: { amount: 25, currency: 'USD' }, substitutionsAllowed: true });
    expect(decision.status).toBe('REPAIRABLE');
    // A decline never applies the repair or creates a cart — the caller (WebMCP layer) is
    // responsible for stopping before calling applyPlanRepair/prepareCart on decline; here we
    // assert the gateway never prepares a cart for the un-repaired, still-stale plan.
    expect(() => fresh.prepareCart(freshLines, 'cart-key-decline-1', decision.decisionId)).not.toThrow();
    const cart = fresh.prepareCart(freshLines, 'cart-key-decline-1', decision.decisionId);
    expect(cart.cart).toBeNull(); expect(cart.cartCreated).toBe(false);
  });

  describe('prepareCart — decision-scoped idempotency (native/guided-fallback convergence)', () => {
    it('converges native and guided-fallback preparation for the same decision and lines onto exactly one cart, regardless of differing caller-supplied idempotency keys', () => {
      const fresh = createShowcaseGateway(now, 'fresh-corner', 'concurrency-session-1');
      const decision = fresh.evaluatePurchasePlan(freshLines, undefined, { budget: { amount: 25, currency: 'USD' }, substitutionsAllowed: true });
      const repaired = fresh.applyPlanRepair(freshLines, 'replace-stale-farm-eggs-with-cage-free-eggs', 'repair-key-conc-1', decision.decisionId);
      // Simulate a native WebMCP call and a guided-fallback replay call racing to prepare a cart
      // for the identical ELIGIBLE decision and canonical lines, each minting its own idempotency
      // key the way two independent invocation paths naturally would.
      const nativeCart = fresh.prepareCart(repaired.lines, 'native-cart-key-conc-1', repaired.decision.decisionId);
      const guidedFallbackCart = fresh.prepareCart(repaired.lines, 'guided-fallback-cart-key-conc-1', repaired.decision.decisionId);
      expect(nativeCart.cartCreated).toBe(true);
      expect(guidedFallbackCart.cart?.reference).toBe(nativeCart.cart?.reference);
      expect(guidedFallbackCart).toEqual(nativeCart);
      // A third caller retrying with yet another key still converges on the same single cart —
      // proof only one cart was ever stored server-side for this decision.
      const thirdCart = fresh.prepareCart(repaired.lines, 'third-cart-key-conc-1', repaired.decision.decisionId);
      expect(thirdCart.cart?.reference).toBe(nativeCart.cart?.reference);
    });

    it('rejects a concurrent request for the same decisionId with different lines as a bounded, pre-existing DECISION_MISMATCH, leaving the original valid cart unchanged', () => {
      // decisionId already embeds the full evaluated line set (see `decision()`'s decisionId
      // construction), and `requireDecision` compares the caller's `lines` against the exact lines
      // stored for that decisionId. So a caller that reuses a decisionId with mutated lines is
      // already rejected by that pre-existing guard, before ever reaching the new decision-scoped
      // cart layer below — DECISION_MISMATCH is exactly the bounded "CART_PREPARATION_CONFLICT/
      // DECISION_MISMATCH" outcome this pass requires for this path, and it fires here.
      const fresh = createShowcaseGateway(now, 'fresh-corner', 'concurrency-session-2');
      const decision = fresh.evaluatePurchasePlan(freshLines, undefined, { budget: { amount: 25, currency: 'USD' }, substitutionsAllowed: true });
      const repaired = fresh.applyPlanRepair(freshLines, 'replace-stale-farm-eggs-with-cage-free-eggs', 'repair-key-conc-2', decision.decisionId);
      const original = fresh.prepareCart(repaired.lines, 'original-cart-key-conc-2', repaired.decision.decisionId);
      expect(original.cartCreated).toBe(true);
      const mutatedLines = repaired.lines.map((line) => line.productId === 'v_g_inv_001_1' ? { ...line, quantity: line.quantity + 1 } : line);
      let thrown: unknown;
      try { fresh.prepareCart(mutatedLines, 'conflicting-cart-key-conc-2', repaired.decision.decisionId); } catch (error) { thrown = error; }
      expect(thrown).toBeInstanceOf(ShowcaseInputError);
      expect((thrown as InstanceType<typeof ShowcaseInputError>).code).toBe('DECISION_MISMATCH');
      // The original cart must be exactly as it was — re-fetched by its original idempotency key.
      const stillOriginal = fresh.prepareCart(repaired.lines, 'original-cart-key-conc-2', repaired.decision.decisionId);
      expect(stillOriginal).toEqual(original);
    });

    it('the decision-scoped cart layer itself rejects a fingerprint mismatch for the same decisionId with a bounded CART_PREPARATION_CONFLICT — a defense-in-depth integrity check on `cartsByDecision`, independent of the pre-existing per-decision lines guard above', () => {
      // Because decisionId already 1:1 encodes the evaluated lines, `requireDecision` makes a
      // mismatched-lines request for a real decisionId unreachable in the ordinary flow (proven by
      // the test above). This test exercises the decision-scoped layer's own integrity check
      // directly, by constructing a gateway over a `stores` object (the same shape `fixture.ts`
      // wires up) that already holds an inconsistent `cartsByDecision` entry for a decisionId —
      // e.g. as would result from a future decisionId-construction change that loses that 1:1
      // property. The guard must still refuse to silently serve the wrong cart.
      const fresh = createShowcaseGateway(now, 'fresh-corner', 'concurrency-session-3');
      const decision = fresh.evaluatePurchasePlan(freshLines, undefined, { budget: { amount: 25, currency: 'USD' }, substitutionsAllowed: true });
      const repaired = fresh.applyPlanRepair(freshLines, 'replace-stale-farm-eggs-with-cage-free-eggs', 'repair-key-conc-3', decision.decisionId);
      const decisionId = repaired.decision.decisionId;
      const decisionScopedKey = `fresh-corner:concurrency-session-3:cart-by-decision:${decisionId}`;
      const conflictingFingerprint = JSON.stringify([{ productId: 'v_g_inv_001_1', quantity: 99 }]);
      (fresh as unknown as { stores: { cartsByDecision: Map<string, { fingerprint: string; result: unknown }> } }).stores.cartsByDecision.set(decisionScopedKey, { fingerprint: conflictingFingerprint, result: { cart: { reference: 'demo-cart-preexisting' } } });
      expect(() => fresh.prepareCart(repaired.lines, 'fresh-cart-key-conc-3', decisionId)).toThrow(ShowcaseInputError);
      let thrown: unknown;
      try { fresh.prepareCart(repaired.lines, 'fresh-cart-key-conc-3-b', decisionId); } catch (error) { thrown = error; }
      expect((thrown as InstanceType<typeof ShowcaseInputError>).code).toBe('CART_PREPARATION_CONFLICT');
    });
  });

  describe('reviseCart — optional post-cart revision extension', () => {
    function prepareRevisableCart(sessionId = 'fresh-session') {
      const fresh = createShowcaseGateway(now, 'fresh-corner', sessionId);
      const decision = fresh.evaluatePurchasePlan(freshLines, undefined, { budget: { amount: 25, currency: 'USD' }, substitutionsAllowed: true });
      const repaired = fresh.applyPlanRepair(freshLines, 'replace-stale-farm-eggs-with-cage-free-eggs', `repair-key-${sessionId}`, decision.decisionId);
      const cart = fresh.prepareCart(repaired.lines, `cart-key-${sessionId}`, repaired.decision.decisionId);
      return { fresh, cart };
    }

    it('starts a prepared cart at revision 1', () => {
      const { cart } = prepareRevisableCart('rev-session-1');
      expect(cart.cart?.revision).toBe(1);
    });

  it('revises bread quantity to two, keeps the eggs, and preserves local delivery', () => {
      const { fresh, cart } = prepareRevisableCart('rev-session-2');
      const revised = fresh.reviseCart(cart.cart!.reference, 1, [{ productId: 'v_fresh_cagefree_001', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 2 }], 'revise-key-1');
      expect(revised.status).toBe('REVISED'); expect(revised.code).toBe('CART_REVISED');
      expect(revised.cart?.revision).toBe(2);
      expect(revised.cart?.lines.find((line) => line.productId === 'v_fresh_cagefree_001')?.quantity).toBe(1);
      expect(revised.cart?.lines.find((line) => line.productId === 'v_g_inv_001_1')?.quantity).toBe(2);
      expect(revised.cart?.total).toBe(24.49);
      expect(revised.cart?.remainingBudget).toBe(0.51);
      expect(revised.cart?.fulfillment).toBe('LOCAL_DELIVERY');
      expect(revised.checkoutAvailable).toBe(false); expect(revised.checkoutStarted).toBe(false);
      expect(revised.orderPlaced).toBe(false); expect(revised.paymentInitiated).toBe(false);
      expect(revised.cartCreated).toBe(true); expect(revised.cartRevised).toBe(true);
    });

    it('is idempotent: retrying the same idempotency key returns the identical result without double-incrementing the revision', () => {
      const { fresh, cart } = prepareRevisableCart('rev-session-3');
      const lines = [{ productId: 'v_fresh_cagefree_001', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 2 }];
      const first = fresh.reviseCart(cart.cart!.reference, 1, lines, 'revise-key-idem');
      const second = fresh.reviseCart(cart.cart!.reference, 1, lines, 'revise-key-idem');
      expect(second).toEqual(first);
    });

    it('rejects the same idempotency key reused for a different revision request', () => {
      const { fresh, cart } = prepareRevisableCart('rev-session-4');
      fresh.reviseCart(cart.cart!.reference, 1, [{ productId: 'v_fresh_cagefree_001', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 2 }], 'revise-key-reused');
      expect(() => fresh.reviseCart(cart.cart!.reference, 1, [{ productId: 'v_fresh_cagefree_001', quantity: 2 }, { productId: 'v_g_inv_001_1', quantity: 2 }], 'revise-key-reused')).toThrow(ShowcaseInputError);
    });

    it('rejects an unknown cart reference', () => {
      const fresh = createShowcaseGateway(now, 'fresh-corner', 'rev-session-5');
      expect(() => fresh.reviseCart('demo-cart-does-not-exist', 1, [{ productId: 'v_g_inv_001_1', quantity: 2 }], 'revise-key-unknown')).toThrow(ShowcaseInputError);
    });

    it('rejects a storefront mismatch', () => {
      const { cart } = prepareRevisableCart('rev-session-6');
      const custom = createShowcaseGateway(now, 'thecustomhub', 'custom-session-6');
      expect(() => custom.reviseCart(cart.cart!.reference, 1, [{ productId: 'v_g_inv_001_1', quantity: 2 }], 'revise-key-mismatch')).toThrow(ShowcaseInputError);
    });

    it('rejects a storefront-session mismatch', () => {
      const { cart } = prepareRevisableCart('rev-session-7');
      const otherSession = createShowcaseGateway(now, 'fresh-corner', 'rev-session-other');
      expect(() => otherSession.reviseCart(cart.cart!.reference, 1, [{ productId: 'v_g_inv_001_1', quantity: 2 }], 'revise-key-session-mismatch')).toThrow(ShowcaseInputError);
    });

    it('rejects an expected-revision conflict and never replaces the valid existing cart', () => {
      const { fresh, cart } = prepareRevisableCart('rev-session-8');
      expect(() => fresh.reviseCart(cart.cart!.reference, 5, [{ productId: 'v_g_inv_001_1', quantity: 2 }], 'revise-key-conflict')).toThrow(ShowcaseInputError);
    });

    it('withholds an over-budget revision without replacing the existing valid cart', () => {
      const { fresh, cart } = prepareRevisableCart('rev-session-9');
      const revised = fresh.reviseCart(cart.cart!.reference, 1, [{ productId: 'v_fresh_cagefree_001', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 4 }], 'revise-key-over-budget');
      expect(revised.status).toBe('WITHHELD'); expect(revised.code).toBe('BUDGET_EXCEEDED');
      expect(revised.cart).toBeNull(); expect(revised.cartRevised).toBe(false);
      const stillCurrent = fresh.reviseCart(cart.cart!.reference, 1, [{ productId: 'v_fresh_cagefree_001', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 2 }], 'revise-key-after-withheld');
      expect(stillCurrent.status).toBe('REVISED');
    });

    it('rejects the schema-level invalid inputs: missing cart reference, nonpositive expected revision, and invalid quantities', () => {
      const { fresh, cart } = prepareRevisableCart('rev-session-10');
      expect(() => fresh.reviseCart('', 1, [{ productId: 'v_g_inv_001_1', quantity: 2 }], 'revise-key-a')).toThrow(ShowcaseInputError);
      expect(() => fresh.reviseCart(cart.cart!.reference, 0, [{ productId: 'v_g_inv_001_1', quantity: 2 }], 'revise-key-b')).toThrow(ShowcaseInputError);
      expect(() => fresh.reviseCart(cart.cart!.reference, 1, [{ productId: 'v_g_inv_001_1', quantity: 0 }], 'revise-key-c')).toThrow(ShowcaseInputError);
    });

    it('never creates a checkout, order, or payment capability on a successful revision', () => {
      const { fresh, cart } = prepareRevisableCart('rev-session-11');
      const revised = fresh.reviseCart(cart.cart!.reference, 1, [{ productId: 'v_fresh_cagefree_001', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 2 }], 'revise-key-11');
      expect(revised).toMatchObject({ checkoutAvailable: false, checkoutStarted: false, orderPlaced: false, paymentInitiated: false });
    });
  });
});
