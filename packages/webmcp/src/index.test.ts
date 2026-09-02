import { describe, expect, it, vi } from 'vitest';
import { ALL_WEBMCP_TOOLS, CANONICAL_PHASE_1_TOOLS, CANONICAL_TOOLS, OPTIONAL_CART_REVISION_TOOLS, createRetailAgentWebMcp, getToolsForState, getWebMcpToolSchema } from './index';
import type { PlanDecision, ReviseCartResult, RetailAgentGateway, WebMcpToolDescriptor } from './types';

const decision = (status: PlanDecision['status']): PlanDecision => ({ status, code: status === 'REPAIRABLE' ? 'STOCK_STALE' : status, decisionId: 'plan-1', lines: [{ productId: 'eggs', quantity: 1 }], reasons: [], allowedNextActions: status === 'REPAIRABLE' ? ['find_valid_alternatives', 'apply_plan_repair'] : ['prepare_validated_cart'], nextAction: 'Next action.', provenance: { storefrontId: 'fresh-corner', storefrontSessionId: 'session-1', catalogVersion: 'c1', policyVersion: 'p1', inventoryAsOf: 'now', evaluatedAt: 'now', expiresAt: 'later' }, alternatives: status === 'REPAIRABLE' ? [{ repairId: 'repair-1', title: 'Fresh eggs', changes: [{ field: 'line.productId', from: 'eggs', to: 'fresh-eggs' }], tradeoffs: { priceDelta: 0.5, currency: 'USD', timingDelta: 'same window' }, resolves: ['STOCK_STALE'], introduces: [], resultingStatus: 'ELIGIBLE' }] : [] });
const revisedCartResult: ReviseCartResult = { status: 'REVISED', code: 'CART_REVISED', previousCartReference: 'cart-1', cart: { reference: 'cart-1', revision: 2, lines: [{ productId: 'fresh-eggs', quantity: 1, title: 'Cage-Free Eggs', unitPrice: 7.49, lineTotal: 7.49 }, { productId: 'bread', quantity: 2, title: 'Artisan Sourdough Bread', unitPrice: 8.5, lineTotal: 17 }], total: 24.49, currency: 'USD', budget: { amount: 30, currency: 'USD' }, remainingBudget: 5.51, fulfillment: 'LOCAL_DELIVERY' }, cartCreated: true, cartRevised: true, checkoutAvailable: false, checkoutStarted: false, orderPlaced: false, paymentInitiated: false, nextAction: 'Review the revised cart. Checkout remains unavailable.' };
function gateway(withRevision = false): RetailAgentGateway { return { getStorefrontCapabilities: vi.fn(async () => ({ code: 'OK' })), searchCatalog: vi.fn(async () => ({ code: 'OK', candidates: [] })), evaluateShoppingPlan: vi.fn(async () => decision('REPAIRABLE')), findValidAlternatives: vi.fn(async () => ({ decisionId: 'plan-1', alternatives: decision('REPAIRABLE').alternatives })), applyPlanRepair: vi.fn(async () => ({ status: 'APPLIED' as const, repair: decision('REPAIRABLE').alternatives[0], decision: decision('ELIGIBLE'), lines: [{ productId: 'fresh-eggs', quantity: 1 }] })), prepareValidatedCart: vi.fn(async () => ({ cart: { reference: 'cart-1', revision: 1, lines: [], total: 0, currency: 'USD' }, code: 'CART_PREPARED', nextAction: 'Review.', checkoutAvailable: false as const, checkoutStarted: false as const })), requestQuote: vi.fn(async () => ({ requestReference: 'quote-1', status: 'QUOTE_REQUESTED' as const, code: 'QUOTE_REQUESTED', nextAction: 'Review.', fixedPrice: null, deliveryPromise: null, cartCreated: false as const, checkoutStarted: false as const, orderPlaced: false as const, paymentInitiated: false as const, merchantReviewRequired: true as const })), ...(withRevision ? { reviseValidatedCart: vi.fn(async () => revisedCartResult) } : {}) }; }
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
    expect(result.nextAction).toBe('Check the tool schema and submit bounded valid fields.');
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

describe('native registration-before-return handoff (post-approval determinism)', () => {
  /** A fake ModelContext whose `registerTool` can be held pending on demand — lets a test observe the
   * exact moment `prepare_validated_cart`'s registration completes relative to `apply_plan_repair`'s
   * `execute()` promise resolving. */
  function controllableContext() {
    const descriptors: WebMcpToolDescriptor[] = [];
    const pending = new Map<string, { resolve: () => void }>();
    const holds = new Set<string>();
    const registerCalls: string[] = [];
    const context = {
      registerTool: vi.fn((tool: WebMcpToolDescriptor) => {
        descriptors.push(tool);
        registerCalls.push(tool.name);
        if (holds.has(tool.name)) {
          return new Promise<void>((resolve) => { pending.set(tool.name, { resolve }); });
        }
        return undefined;
      }),
      getTools: () => descriptors.map((tool) => tool.name),
    };
    return {
      context, descriptors, registerCalls,
      hold: (name: string) => holds.add(name),
      release: (name: string) => { pending.get(name)?.resolve(); pending.delete(name); },
    };
  }

  it('does not resolve apply_plan_repair until the pending prepare_validated_cart registration completes, and prepare_validated_cart is invocable immediately afterward without settleRegistry()', async () => {
    const fake = controllableContext();
    let approvalResolve: ((value: 'approved' | 'declined') => void) | undefined;
    const sdk = createRetailAgentWebMcp({
      gateway: gateway(),
      storefront: { getBuyerContext: () => ({}), requestRepairApproval: async () => new Promise((resolve) => { approvalResolve = resolve; }) },
      adapter: { getModelContext: () => fake.context },
      clock: () => 1,
    });
    const registration = await sdk.register();
    await fake.descriptors.find((tool) => tool.name === 'evaluate_shopping_plan')!.execute({ lines: [{ productId: 'eggs', quantity: 1 }] });

    fake.hold('prepare_validated_cart');
    const repair = fake.descriptors.find((tool) => tool.name === 'apply_plan_repair')!;
    let repairResolved = false;
    const repairPromise = repair.execute({ decisionId: 'plan-1', repairId: 'repair-1', lines: [{ productId: 'eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' }).then((result) => { repairResolved = true; return result; });

    // Let the mission pause for shopper approval, then approve it.
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(approvalResolve).toBeDefined();
    approvalResolve!('approved');

    // The registration for prepare_validated_cart is being awaited and is being held pending —
    // apply_plan_repair's execute() must not resolve while that registration is outstanding.
    await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
    expect(repairResolved).toBe(false);
    expect(registration.registeredTools).not.toContain('prepare_validated_cart');

    // Resolve the held registration promise.
    fake.release('prepare_validated_cart');
    const repairResult = await repairPromise;

    // apply_plan_repair has now resolved, and prepare_validated_cart is *already* observable — no
    // settleRegistry() call was made.
    expect(repairResult).toMatchObject({ status: 'APPLIED', code: 'REPAIR_APPLIED', decisionId: 'plan-1', allowedNextActions: ['prepare_validated_cart'], cartCreated: false, checkoutAvailable: false, checkoutStarted: false, orderPlaced: false });
    expect(registration.registeredTools).toContain('prepare_validated_cart');
    // The still-executing apply_plan_repair registration must not have been aborted before its own
    // result resolved — it remains observable until the deferred cleanup tick runs.
    expect(registration.registeredTools).toContain('apply_plan_repair');

    // Invoke prepare_validated_cart immediately, with no settleRegistry() call in between.
    const prepare = fake.descriptors.find((tool) => tool.name === 'prepare_validated_cart')!;
    const prepareResult = await prepare.execute({ decisionId: 'plan-1', lines: [{ productId: 'fresh-eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' });
    expect(prepareResult).toMatchObject({ code: 'CART_PREPARED' });
    expect((prepareResult as { cart?: unknown }).cart).toBeTruthy();
    expect((prepareResult as { checkoutAvailable?: boolean }).checkoutAvailable).toBe(false);
    expect((prepareResult as { orderPlaced?: boolean }).orderPlaced).toBeFalsy();

    // Old repair tools are eventually removed, and no duplicate registrations occurred.
    await registration.settleRegistry();
    expect(registration.registeredTools).not.toContain('apply_plan_repair');
    expect(registration.registeredTools).not.toContain('find_valid_alternatives');
    const prepareCallCount = fake.registerCalls.filter((name) => name === 'prepare_validated_cart').length;
    expect(prepareCallCount).toBe(1);
  });

  it('a real REPAIRABLE -> approved apply_plan_repair -> ELIGIBLE -> immediate evaluate back to REPAIRABLE (before the old cleanup tick fires) never double-registers a name, keeps only the newest repair registrations, and removes prepare_validated_cart', async () => {
    // A fake native registry that behaves the way a real strict WebMCP host would: it rejects
    // `registerTool` for a name that is already registered, and only frees a name once the
    // registration's AbortSignal actually fires. This is what makes the test meaningful — if
    // `activatePhase` ever tried to register a still-registered name (a stale, not-yet-cleaned-up
    // generation), this fake would throw instead of silently tolerating it.
    const activeNames = new Set<string>();
    const byName = new Map<string, WebMcpToolDescriptor>();
    const context = {
      registerTool: vi.fn((tool: WebMcpToolDescriptor, opts?: { signal?: AbortSignal }) => {
        if (activeNames.has(tool.name)) throw new Error(`DUPLICATE_REGISTRATION:${tool.name}`);
        activeNames.add(tool.name); byName.set(tool.name, tool);
        opts?.signal?.addEventListener('abort', () => { activeNames.delete(tool.name); }, { once: true });
      }),
      getTools: () => [...activeNames],
    };
    const sdk = createRetailAgentWebMcp({ gateway: gateway(), storefront: { getBuyerContext: () => ({}), requestRepairApproval: async () => 'approved' }, adapter: { getModelContext: () => context }, clock: () => 1 });
    const registration = await sdk.register();

    // REPAIRABLE: registers find_valid_alternatives + apply_plan_repair.
    await byName.get('evaluate_shopping_plan')!.execute({ lines: [{ productId: 'eggs', quantity: 1 }] });
    expect(registration.registeredTools).toEqual(expect.arrayContaining(['find_valid_alternatives', 'apply_plan_repair']));

    // approved apply_plan_repair -> ELIGIBLE: prepare_validated_cart is registered and visible
    // before execute() resolves (registration-before-return); find_valid_alternatives/
    // apply_plan_repair's cleanup is scheduled but deliberately not yet ticked.
    await byName.get('apply_plan_repair')!.execute({ decisionId: 'plan-1', repairId: 'repair-1', lines: [{ productId: 'eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' });
    expect(registration.registeredTools).toContain('prepare_validated_cart');
    expect(registration.registeredTools).toContain('apply_plan_repair'); // still present — cleanup deferred, not yet ticked

    // Immediately (no macrotask elapses — no setTimeout(0) tick) evaluate again, landing back on
    // REPAIRABLE. This re-registers find_valid_alternatives/apply_plan_repair while their prior
    // (stale, not-yet-cleaned-up) generation is technically still active in the fake registry — the
    // exact race this test targets. No DUPLICATE_REGISTRATION error must be thrown.
    await byName.get('evaluate_shopping_plan')!.execute({ lines: [{ productId: 'eggs', quantity: 1 }] });

    await registration.settleRegistry();

    // Newest repair registrations survive.
    expect(registration.registeredTools).toContain('apply_plan_repair');
    expect(registration.registeredTools).toContain('find_valid_alternatives');
    // Stale cleanup removed only the superseded prepare_validated_cart registration.
    expect(registration.registeredTools).not.toContain('prepare_validated_cart');
    // registeredTools and the fake native registry agree.
    expect(new Set(registration.registeredTools)).toEqual(activeNames);
    expect(new Set(await registration.getNativeToolNames!())).toEqual(new Set(registration.registeredTools));
  });

  it('disposing immediately after a next-phase registration, before its deferred cleanup tick fires, still aborts the superseded controller and leaves the fake native registry completely empty', async () => {
    const activeNames = new Set<string>();
    const byName = new Map<string, WebMcpToolDescriptor>();
    const context = {
      registerTool: vi.fn((tool: WebMcpToolDescriptor, opts?: { signal?: AbortSignal }) => {
        activeNames.add(tool.name); byName.set(tool.name, tool);
        opts?.signal?.addEventListener('abort', () => { activeNames.delete(tool.name); }, { once: true });
      }),
      getTools: () => [...activeNames],
    };
    const sdk = createRetailAgentWebMcp({ gateway: gateway(), storefront: { getBuyerContext: () => ({}), requestRepairApproval: async () => 'approved' }, adapter: { getModelContext: () => context }, clock: () => 1 });
    const registration = await sdk.register();
    await byName.get('evaluate_shopping_plan')!.execute({ lines: [{ productId: 'eggs', quantity: 1 }] });
    // approved apply_plan_repair -> ELIGIBLE: prepare_validated_cart registered; apply_plan_repair/
    // find_valid_alternatives cleanup scheduled but not yet ticked.
    await byName.get('apply_plan_repair')!.execute({ decisionId: 'plan-1', repairId: 'repair-1', lines: [{ productId: 'eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' });
    expect(activeNames.size).toBeGreaterThan(0);

    // Dispose right now — strictly before the deferred cleanup's setTimeout(0) tick.
    registration.dispose();

    expect(registration.registeredTools).toEqual([]);
    // The fake native registry itself — not just this SDK's bookkeeping — is completely empty: the
    // superseded phase controller was aborted by dispose(), not left dangling for a tick that will
    // never meaningfully run.
    expect(activeNames.size).toBe(0);

    // Letting any pending timers/microtasks settle afterward must not resurrect or duplicate anything.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(activeNames.size).toBe(0);
    expect(registration.registeredTools).toEqual([]);
  });

  it('registration failure for the next phase does not display an unlocked capability and preserves the previous valid state', async () => {
    const context = { registerTool: vi.fn((tool: WebMcpToolDescriptor) => { if (tool.name === 'prepare_validated_cart') throw new Error('nope'); }), getTools: () => [] };
    const sdk = createRetailAgentWebMcp({ gateway: gateway(), storefront: { getBuyerContext: () => ({}), requestRepairApproval: async () => 'approved' }, adapter: { getModelContext: () => context }, clock: () => 1 });
    const registration = await sdk.register();
    const evaluate = (sdk.getDescriptors()).evaluate_shopping_plan;
    await evaluate.execute({ lines: [{ productId: 'eggs', quantity: 1 }] });
    const repair = sdk.getDescriptors().apply_plan_repair;
    await expect(repair.execute({ decisionId: 'plan-1', repairId: 'repair-1', lines: [{ productId: 'eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' })).resolves.toMatchObject({ code: 'REGISTRATION_FAILED' });
    // Nothing from the failed attempt is left registered as "unlocked", and the previous valid
    // registration (apply_plan_repair) is preserved rather than torn down.
    expect(registration.registeredTools).not.toContain('prepare_validated_cart');
    expect(registration.registeredTools).toContain('apply_plan_repair');
  });

  it('declined approval never exposes prepare_validated_cart', async () => {
    const declineDescriptors: WebMcpToolDescriptor[] = []; const context = { registerTool: vi.fn((tool: WebMcpToolDescriptor) => { declineDescriptors.push(tool); }), getTools: () => declineDescriptors.map((tool) => tool.name) };
    const declineSdk = createRetailAgentWebMcp({ gateway: gateway(), storefront: { getBuyerContext: () => ({}), requestRepairApproval: async () => 'declined' }, adapter: { getModelContext: () => context }, clock: () => 1 });
    const registration = await declineSdk.register();
    await declineDescriptors.find((tool) => tool.name === 'evaluate_shopping_plan')!.execute({ lines: [{ productId: 'eggs', quantity: 1 }] });
    const repair = declineDescriptors.find((tool) => tool.name === 'apply_plan_repair')!;
    const result = await repair.execute({ decisionId: 'plan-1', repairId: 'repair-1', lines: [{ productId: 'eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' });
    expect(result).toMatchObject({ status: 'DECLINED' });
    await registration.settleRegistry();
    expect(registration.registeredTools).not.toContain('prepare_validated_cart');
  });

  it('reset (dispose) during a pending approval cancels safely and clears the registry', async () => {
    const { sdk, descriptors } = setup(true);
    const registration = await sdk.register();
    await descriptors.find((tool) => tool.name === 'evaluate_shopping_plan')!.execute({ lines: [{ productId: 'eggs', quantity: 1 }] });
    const repair = descriptors.find((tool) => tool.name === 'apply_plan_repair')!;
    const promise = repair.execute({ decisionId: 'plan-1', repairId: 'repair-1', lines: [{ productId: 'eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' });
    registration.dispose();
    const result = await promise;
    expect(result).toMatchObject({ code: 'CANCELLED' });
    expect(registration.registeredTools).toEqual([]);
  });

  it('guided replay still completes end to end and is always tagged source: replay, even for prepare_validated_cart', async () => {
    const events: string[] = [];
    const descriptors: WebMcpToolDescriptor[] = []; const context = { registerTool: vi.fn((tool: WebMcpToolDescriptor) => { descriptors.push(tool); }), getTools: () => descriptors.map((tool) => tool.name) };
    const sdk = createRetailAgentWebMcp({ gateway: gateway(), storefront: { getBuyerContext: () => ({}), requestRepairApproval: async () => 'approved', onLifecycle: (event) => events.push(`${event.tool}:${event.lifecycle}:${event.source}`) }, adapter: { getModelContext: () => context }, clock: () => 1 });
    const registration = await sdk.register();
    await registration.invoke('evaluate_shopping_plan', { lines: [{ productId: 'eggs', quantity: 1 }] });
    const applied = await registration.invoke('apply_plan_repair', { decisionId: 'plan-1', repairId: 'repair-1', lines: [{ productId: 'eggs', quantity: 1 }], idempotencyKey: 'abcdefgh' }) as { decisionId?: string; lines?: Array<{ productId: string; quantity: number }> };
    const prepared = await registration.invoke('prepare_validated_cart', { decisionId: applied.decisionId, lines: applied.lines, idempotencyKey: 'abcdefgh' });
    expect(prepared).toMatchObject({ code: 'CART_PREPARED' });
    expect(events.filter((entry) => entry.includes('prepare_validated_cart:invoked'))).toEqual(['prepare_validated_cart:invoked:replay']);
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
