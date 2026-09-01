import { describe, expect, it, vi } from 'vitest';
import { ALL_WEBMCP_TOOLS, CANONICAL_PHASE_1_TOOLS, CANONICAL_TOOLS, OPTIONAL_CART_REVISION_TOOLS, createRetailAgentWebMcp, getToolsForState, getWebMcpToolSchema } from './index';
import type { PlanDecision, ReviseCartResult, RetailAgentGateway, WebMcpToolDescriptor } from './types';

const decision = (status: PlanDecision['status']): PlanDecision => ({ status, code: status === 'REPAIRABLE' ? 'STOCK_STALE' : status, decisionId: 'plan-1', lines: [{ productId: 'eggs', quantity: 1 }], reasons: [], allowedNextActions: status === 'REPAIRABLE' ? ['find_valid_alternatives', 'apply_plan_repair'] : ['prepare_validated_cart'], nextAction: 'Next action.', provenance: { storefrontId: 'fresh-corner', storefrontSessionId: 'session-1', catalogVersion: 'c1', policyVersion: 'p1', inventoryAsOf: 'now', evaluatedAt: 'now', expiresAt: 'later' }, alternatives: status === 'REPAIRABLE' ? [{ repairId: 'repair-1', title: 'Fresh eggs', changes: [{ field: 'line.productId', from: 'eggs', to: 'fresh-eggs' }], tradeoffs: { priceDelta: 0.5, currency: 'USD', timingDelta: 'same window' }, resolves: ['STOCK_STALE'], introduces: [], resultingStatus: 'ELIGIBLE' }] : [] });
const revisedCartResult: ReviseCartResult = { status: 'REVISED', code: 'CART_REVISED', previousCartReference: 'cart-1', cart: { reference: 'cart-1', revision: 2, lines: [{ productId: 'fresh-eggs', quantity: 1, title: 'Cage-Free Eggs', unitPrice: 7.49, lineTotal: 7.49 }, { productId: 'bread', quantity: 2, title: 'Artisan Sourdough Bread', unitPrice: 8.5, lineTotal: 17 }], total: 24.49, currency: 'USD', budget: { amount: 25, currency: 'USD' }, remainingBudget: 0.51, fulfillment: 'LOCAL_DELIVERY' }, cartCreated: true, cartRevised: true, checkoutAvailable: false, checkoutStarted: false, orderPlaced: false, paymentInitiated: false, nextAction: 'Review the revised cart. Checkout remains unavailable.' };
function gateway(withRevision = false): RetailAgentGateway { return { getStorefrontCapabilities: vi.fn(async () => ({ code: 'OK' })), searchCatalog: vi.fn(async () => ({ code: 'OK', candidates: [] })), evaluateShoppingPlan: vi.fn(async () => decision('REPAIRABLE')), findValidAlternatives: vi.fn(async () => ({ decisionId: 'plan-1', alternatives: decision('REPAIRABLE').alternatives })), applyPlanRepair: vi.fn(async () => ({ status: 'APPLIED' as const, repair: decision('REPAIRABLE').alternatives[0], decision: decision('ELIGIBLE'), lines: [{ productId: 'fresh-eggs', quantity: 1 }] })), prepareValidatedCart: vi.fn(async () => ({ cart: { reference: 'cart-1', revision: 1, lines: [], total: 0, currency: 'USD' }, code: 'CART_PREPARED', nextAction: 'Review.', checkoutAvailable: false as const, checkoutStarted: false as const })), requestQuote: vi.fn(async () => ({ requestReference: 'quote-1', status: 'QUOTE_REQUESTED' as const, code: 'QUOTE_REQUESTED', nextAction: 'Review.', fixedPrice: null, cartCreated: false as const, checkoutStarted: false as const, orderPlaced: false as const, merchantReviewRequired: true as const })), ...(withRevision ? { reviseValidatedCart: vi.fn(async () => revisedCartResult) } : {}) }; }
function setup(native = true, opts: { enableCartRevision?: boolean } = {}) { const descriptors: WebMcpToolDescriptor[] = []; const context = { registerTool: vi.fn((tool: WebMcpToolDescriptor) => { descriptors.push(tool); }), getTools: () => descriptors.map((tool) => tool.name) }; const sdk = createRetailAgentWebMcp({ gateway: gateway(Boolean(opts.enableCartRevision)), storefront: { getBuyerContext: () => ({}), requestRepairApproval: async () => 'approved' }, adapter: { getModelContext: () => native ? context : undefined }, clock: () => 1, enableCartRevision: opts.enableCartRevision }); return { sdk, descriptors, context }; }

/** Drives a fresh registration through repair → approval → cart preparation, returning the live
 * registration/descriptors/context for further assertions (used by the extension tests below). */
async function advanceToCartPrepared(opts: { enableCartRevision?: boolean } = { enableCartRevision: true }) {
  const { sdk, descriptors, context } = setup(true, opts);
  const registration = await sdk.register();
  await descriptors.find((tool) => tool.name === 'evaluate_shopping_plan')!.execute({ lines: [{ productId: 'eggs', quantity: 1 }] });
  const repair = descriptors.find((tool) => tool.name === 'apply_plan_repair')!;
  await repair.execute({ decisionId: 'plan-1', repairId: 'repair-1', lines: [{ productId: 'eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' });
  await registration.settleRegistry();
  await descriptors.find((tool) => tool.name === 'prepare_validated_cart')!.execute({ decisionId: 'plan-1', lines: [{ productId: 'fresh-eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' });
  await registration.settleRegistry();
  return { sdk, descriptors, context, registration };
}

describe('RetailAgentOS WebMCP descriptors', () => {
  it('provides strict schemas and standard annotations for seven tools', () => { const names = ['get_storefront_capabilities', 'search_catalog', 'evaluate_shopping_plan', 'find_valid_alternatives', 'apply_plan_repair', 'prepare_validated_cart', 'request_quote'] as const; expect(names).toHaveLength(7); names.forEach((name) => expect(getWebMcpToolSchema(name)).toMatchObject({ type: 'object', additionalProperties: false })); });
  it('declares a bounded fulfillmentMode enum on evaluate_shopping_plan, distinct from requestedDeliveryWindow, and rejects it via additionalProperties elsewhere', () => {
    const schema = getWebMcpToolSchema('evaluate_shopping_plan') as { properties: Record<string, unknown>; additionalProperties: boolean };
    expect(schema.properties.fulfillmentMode).toMatchObject({ type: 'string', enum: ['shipping', 'pickup', 'local_delivery'] });
    expect(schema.properties.requestedDeliveryWindow).toMatchObject({ type: 'string' });
    expect(schema.additionalProperties).toBe(false);
    // fulfillmentMode is not accepted on tools that don't declare it — it cannot be smuggled in via extra properties.
    expect((getWebMcpToolSchema('prepare_validated_cart') as { properties: Record<string, unknown> }).properties.fulfillmentMode).toBeUndefined();
  });
  it('passes an explicit fulfillmentMode through to the gateway, separate from requestedDeliveryWindow, and rejects an invalid enum value', async () => {
    const backingGateway = gateway();
    const sdkWithSpy = createRetailAgentWebMcp({ gateway: backingGateway, storefront: { getBuyerContext: () => ({}) }, adapter: { getModelContext: () => undefined } });
    const evaluate = sdkWithSpy.getDescriptors().evaluate_shopping_plan;
    await evaluate.execute({ lines: [{ productId: 'eggs', quantity: 1 }], fulfillmentMode: 'local_delivery' });
    expect(backingGateway.evaluateShoppingPlan).toHaveBeenCalledWith(expect.objectContaining({ fulfillmentMode: 'local_delivery', requestedDeliveryWindow: undefined }), expect.anything());
    const result = await evaluate.execute({ lines: [{ productId: 'eggs', quantity: 1 }], fulfillmentMode: 'drone_delivery' });
    expect(result.nextAction).toBe('Review the request and try again.');
  });
  it('registers only base tools initially, then replaces phase tools after decision', async () => { const { sdk, descriptors, context } = setup(); const registration = await sdk.register(); expect(registration.registeredTools).toEqual(['get_storefront_capabilities', 'search_catalog', 'evaluate_shopping_plan']); await descriptors.find((tool) => tool.name === 'evaluate_shopping_plan')!.execute({ lines: [{ productId: 'eggs', quantity: 1 }] }, { signal: new AbortController().signal }); expect(registration.registeredTools).toEqual(expect.arrayContaining(['find_valid_alternatives', 'apply_plan_repair'])); expect(registration.registeredTools).not.toContain('prepare_validated_cart'); expect(context.registerTool).toHaveBeenCalledTimes(5); });
  it('uses execution signals, cleans registration signals, and falls back to replay without native registration', async () => { const { sdk, descriptors } = setup(); const registration = await sdk.register(); const controller = new AbortController(); await descriptors[0].execute({}, { signal: controller.signal }); registration.dispose(); expect(registration.registeredTools).toEqual([]); const replay = setup(false); const replayRegistration = await replay.sdk.register(); expect(replayRegistration.supported).toBe(false); expect(replayRegistration.getReplayTools()).toEqual(getToolsForState('initial')); });
  it('normalizes missing, empty, and already-aborted execution options without secondary signal errors', async () => { const { sdk, descriptors } = setup(); await sdk.register(); await expect(descriptors[0].execute({})).resolves.toMatchObject({ code: 'OK' }); await expect(descriptors[0].execute({}, {})).resolves.toMatchObject({ code: 'OK' }); const controller = new AbortController(); controller.abort(); await expect(descriptors[0].execute({}, { signal: controller.signal })).resolves.toMatchObject({ code: 'CANCELLED' }); });
  it('cleans a partial registration instead of claiming a native registry', async () => { let calls = 0; const context = { registerTool: vi.fn(() => { calls += 1; if (calls === 2) throw new Error('nope'); }) }; const sdk = createRetailAgentWebMcp({ gateway: gateway(), storefront: { getBuyerContext: () => ({}) }, adapter: { getModelContext: () => context } }); await expect(sdk.register()).rejects.toThrow('REGISTRATION_FAILED'); });
  it('defers phase-tool removal until after an executing repair returns', async () => { const { sdk, descriptors } = setup(); const registration = await sdk.register(); await descriptors.find((tool) => tool.name === 'evaluate_shopping_plan')!.execute({ lines: [{ productId: 'eggs', quantity: 1 }] }); const repair = descriptors.find((tool) => tool.name === 'apply_plan_repair')!; const result = await repair.execute({ decisionId: 'plan-1', repairId: 'repair-1', lines: [{ productId: 'eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' }); expect(result).toMatchObject({ status: 'APPLIED' }); expect(registration.registeredTools).toContain('apply_plan_repair'); await registration.settleRegistry(); expect(registration.registeredTools).toContain('prepare_validated_cart'); expect(registration.registeredTools).not.toContain('apply_plan_repair'); });
  it('delegates quote work and preserves a null fixed price', async () => { const { sdk } = setup(false); const registration = await sdk.register(); const result = await registration.invoke('request_quote', { quantity: 25, requirements: 'Robotics shirts', idempotencyKey: 'abcdefgh' }); expect(result.fixedPrice).toBeNull(); });
  it('labels a guided invocation as replay even when a native model context exists', async () => {
    const events: string[] = []; const descriptors: WebMcpToolDescriptor[] = [];
    const sdk = createRetailAgentWebMcp({ gateway: gateway(), storefront: { getBuyerContext: () => ({}), onLifecycle: (event) => events.push(`${event.tool}:${event.lifecycle}:${event.source}`) }, adapter: { getModelContext: () => ({ registerTool: vi.fn((tool: WebMcpToolDescriptor) => { descriptors.push(tool); }) }) }, clock: () => 1 });
    const registration = await sdk.register();
    expect(registration.supported).toBe(true);
    await registration.invoke('get_storefront_capabilities', {});
    expect(events).toContain('get_storefront_capabilities:invoked:replay');
    expect(events.every((entry) => !entry.includes(':invoked:native'))).toBe(true);
  });
  it('labels a real native descriptor call as native, never mutated by a concurrent guided call', async () => {
    const events: string[] = []; const descriptors: WebMcpToolDescriptor[] = [];
    const sdk = createRetailAgentWebMcp({ gateway: gateway(), storefront: { getBuyerContext: () => ({}), onLifecycle: (event) => events.push(`${event.tool}:${event.lifecycle}:${event.source}`) }, adapter: { getModelContext: () => ({ registerTool: vi.fn((tool: WebMcpToolDescriptor) => { descriptors.push(tool); }) }) }, clock: () => 1 });
    const registration = await sdk.register();
    const nativeDescriptor = descriptors.find((tool) => tool.name === 'get_storefront_capabilities')!;
    // Simulate the real browser invoking the registered descriptor directly (no `source` option, as a
    // genuine WebMCP host would never set it) concurrently with a guided replay call.
    await Promise.all([nativeDescriptor.execute({}, { signal: new AbortController().signal }), registration.invoke('search_catalog', { query: 'eggs' })]);
    expect(events).toContain('get_storefront_capabilities:invoked:native');
    expect(events).toContain('search_catalog:invoked:replay');
  });
  it('returns equivalent commerce results for native and guided execution of the same descriptor', async () => {
    const { sdk, descriptors } = setup(true); await sdk.register();
    const capabilities = descriptors.find((tool) => tool.name === 'get_storefront_capabilities')!;
    const nativeResult = await capabilities.execute({});
    const replayResult = await capabilities.execute({}, { source: 'replay' });
    expect(nativeResult).toEqual(replayResult);
  });
});

describe('optional post-cart revision extension (revise_validated_cart)', () => {
  it('keeps the historical seven-tool Phase 1 catalog unchanged and documents the extension separately', () => {
    expect(CANONICAL_PHASE_1_TOOLS).toHaveLength(7);
    expect(CANONICAL_PHASE_1_TOOLS).not.toContain('revise_validated_cart');
    expect(CANONICAL_TOOLS).toEqual(CANONICAL_PHASE_1_TOOLS);
    expect(OPTIONAL_CART_REVISION_TOOLS).toEqual(['revise_validated_cart']);
    expect(ALL_WEBMCP_TOOLS).toEqual([...CANONICAL_PHASE_1_TOOLS, ...OPTIONAL_CART_REVISION_TOOLS]);
    expect(getWebMcpToolSchema('revise_validated_cart')).toMatchObject({ type: 'object', additionalProperties: false, required: ['cartReference', 'expectedRevision', 'lines', 'idempotencyKey'] });
  });

  it('is absent before a cart exists and absent while shopper approval is pending', async () => {
    const { sdk, descriptors } = setup(true, { enableCartRevision: true });
    const registration = await sdk.register();
    expect(registration.registeredTools).not.toContain('revise_validated_cart');
    // Enter the repairable/awaiting-shopper states without ever reaching cart_prepared.
    await descriptors.find((tool) => tool.name === 'evaluate_shopping_plan')!.execute({ lines: [{ productId: 'eggs', quantity: 1 }] });
    expect(registration.registeredTools).not.toContain('revise_validated_cart');
  });

  it('registers only after a cart is prepared, and withdraws prepare_validated_cart at that point', async () => {
    const { registration } = await advanceToCartPrepared();
    expect(registration.registeredTools).toContain('revise_validated_cart');
    expect(registration.registeredTools).not.toContain('prepare_validated_cart');
  });

  it('is never registered when the SDK does not enable the extension, even after cart preparation', async () => {
    const { registration } = await advanceToCartPrepared({ enableCartRevision: false });
    expect(registration.registeredTools).not.toContain('revise_validated_cart');
  });

  it('is never registered when the gateway does not implement reviseValidatedCart, even if enabled (e.g. TheCustomHub)', async () => {
    // enableCartRevision: true, but setup() only attaches gateway.reviseValidatedCart when requested —
    // this simulates a storefront (TheCustomHub) that never receives the cart-revision capability.
    const descriptors: WebMcpToolDescriptor[] = []; const context = { registerTool: vi.fn((tool: WebMcpToolDescriptor) => { descriptors.push(tool); }), getTools: () => descriptors.map((tool) => tool.name) };
    const sdk = createRetailAgentWebMcp({ gateway: gateway(false), storefront: { getBuyerContext: () => ({}), requestRepairApproval: async () => 'approved' }, adapter: { getModelContext: () => context }, clock: () => 1, enableCartRevision: true });
    const registration = await sdk.register();
    await descriptors.find((tool) => tool.name === 'evaluate_shopping_plan')!.execute({ lines: [{ productId: 'eggs', quantity: 1 }] });
    const repair = descriptors.find((tool) => tool.name === 'apply_plan_repair')!;
    await repair.execute({ decisionId: 'plan-1', repairId: 'repair-1', lines: [{ productId: 'eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' });
    await registration.settleRegistry();
    await descriptors.find((tool) => tool.name === 'prepare_validated_cart')!.execute({ decisionId: 'plan-1', lines: [{ productId: 'fresh-eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' });
    await registration.settleRegistry();
    expect(registration.registeredTools).not.toContain('revise_validated_cart');
  });

  it('native registration uses the real ModelContext adapter and a native call invokes the same descriptor/gateway handler', async () => {
    const { descriptors, context } = await advanceToCartPrepared();
    const descriptor = descriptors.find((tool) => tool.name === 'revise_validated_cart')!;
    expect(context.registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: 'revise_validated_cart' }), expect.anything());
    const result = await descriptor.execute({ cartReference: 'cart-1', expectedRevision: 1, lines: [{ productId: 'fresh-eggs', quantity: 1 }, { productId: 'bread', quantity: 2 }], idempotencyKey: 'revise-abcdefgh' }, { signal: new AbortController().signal });
    expect(result).toMatchObject({ status: 'REVISED', code: 'CART_REVISED' });
  });

  it('guided replay uses registration.invoke() and calls the identical descriptor and gateway handler', async () => {
    const { registration } = await advanceToCartPrepared();
    const result = await registration.invoke('revise_validated_cart', { cartReference: 'cart-1', expectedRevision: 1, lines: [{ productId: 'fresh-eggs', quantity: 1 }, { productId: 'bread', quantity: 2 }], idempotencyKey: 'revise-abcdefgh' });
    expect(result).toMatchObject({ status: 'REVISED', code: 'CART_REVISED' });
  });

  it('labels a native descriptor call native and a guided invoke() call replay, without mislabeling under concurrency', async () => {
    const events: string[] = [];
    const { sdk, descriptors } = setup(true, { enableCartRevision: true });
    // Attach the lifecycle probe by re-creating with telemetry; reuse the same gateway path via advanceToCartPrepared-equivalent steps.
    void sdk; void descriptors; void events;
    const withTelemetry = (() => {
      const evts: string[] = []; const localDescriptors: WebMcpToolDescriptor[] = []; const context = { registerTool: vi.fn((tool: WebMcpToolDescriptor) => { localDescriptors.push(tool); }), getTools: () => localDescriptors.map((tool) => tool.name) };
      const localSdk = createRetailAgentWebMcp({ gateway: gateway(true), storefront: { getBuyerContext: () => ({}), requestRepairApproval: async () => 'approved', onLifecycle: (event) => evts.push(`${event.tool}:${event.lifecycle}:${event.source}`) }, adapter: { getModelContext: () => context }, clock: () => 1, enableCartRevision: true });
      return { evts, localDescriptors, localSdk };
    })();
    const registration = await withTelemetry.localSdk.register();
    await withTelemetry.localDescriptors.find((tool) => tool.name === 'evaluate_shopping_plan')!.execute({ lines: [{ productId: 'eggs', quantity: 1 }] });
    const repair = withTelemetry.localDescriptors.find((tool) => tool.name === 'apply_plan_repair')!;
    await repair.execute({ decisionId: 'plan-1', repairId: 'repair-1', lines: [{ productId: 'eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' });
    await registration.settleRegistry();
    await withTelemetry.localDescriptors.find((tool) => tool.name === 'prepare_validated_cart')!.execute({ decisionId: 'plan-1', lines: [{ productId: 'fresh-eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' });
    await registration.settleRegistry();
    const nativeDescriptor = withTelemetry.localDescriptors.find((tool) => tool.name === 'revise_validated_cart')!;
    await Promise.all([
      nativeDescriptor.execute({ cartReference: 'cart-1', expectedRevision: 1, lines: [{ productId: 'fresh-eggs', quantity: 1 }, { productId: 'bread', quantity: 2 }], idempotencyKey: 'revise-native-1' }, { signal: new AbortController().signal }),
      registration.invoke('revise_validated_cart', { cartReference: 'cart-1', expectedRevision: 1, lines: [{ productId: 'fresh-eggs', quantity: 1 }, { productId: 'bread', quantity: 2 }], idempotencyKey: 'revise-guided-1' }),
    ]);
    expect(withTelemetry.evts).toContain('revise_validated_cart:invoked:native');
    expect(withTelemetry.evts).toContain('revise_validated_cart:invoked:replay');
  });

  it('the schema declares additionalProperties: false, and the handler rejects a missing cart reference, a nonpositive expected revision, and invalid quantities', async () => {
    expect(getWebMcpToolSchema('revise_validated_cart').additionalProperties).toBe(false);
    const { descriptors } = await advanceToCartPrepared();
    const descriptor = descriptors.find((tool) => tool.name === 'revise_validated_cart')!;
    await expect(descriptor.execute({ cartReference: 'cart-1', expectedRevision: 1, lines: [{ productId: 'x', quantity: 1 }], idempotencyKey: 'revise-abcdefgh' })).resolves.toMatchObject({ status: 'REVISED' });
    await expect(descriptor.execute({ expectedRevision: 1, lines: [{ productId: 'x', quantity: 1 }], idempotencyKey: 'revise-abcdefgh' })).resolves.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(descriptor.execute({ cartReference: 'cart-1', expectedRevision: 0, lines: [{ productId: 'x', quantity: 1 }], idempotencyKey: 'revise-abcdefgh' })).resolves.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(descriptor.execute({ cartReference: 'cart-1', expectedRevision: 1, lines: [{ productId: 'x', quantity: 0 }], idempotencyKey: 'revise-abcdefgh' })).resolves.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('never exposes checkout, order, or payment capability through the revision result', async () => {
    const { descriptors } = await advanceToCartPrepared();
    const descriptor = descriptors.find((tool) => tool.name === 'revise_validated_cart')!;
    const result = await descriptor.execute({ cartReference: 'cart-1', expectedRevision: 1, lines: [{ productId: 'fresh-eggs', quantity: 1 }, { productId: 'bread', quantity: 2 }], idempotencyKey: 'revise-abcdefgh' }) as unknown as ReviseCartResult;
    expect(result).toMatchObject({ checkoutAvailable: false, checkoutStarted: false, orderPlaced: false, paymentInitiated: false });
  });

  it('reset aborts the extension registration', async () => {
    const { registration } = await advanceToCartPrepared();
    expect(registration.registeredTools).toContain('revise_validated_cart');
    registration.dispose();
    expect(registration.registeredTools).toEqual([]);
  });
});
