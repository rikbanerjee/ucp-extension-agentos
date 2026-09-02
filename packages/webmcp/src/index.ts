export * from './types';
export { createBrowserAdapter } from './browser';

import { createBrowserAdapter } from './browser';
import type { CanonicalWebMcpToolName, JsonObject, OptionalWebMcpToolName, PlanDecision, RetailAgentGateway, ShowcaseState, StorefrontBridge, WebMcpBrowserAdapter, WebMcpRegistration, WebMcpTelemetryEvent, WebMcpToolAnnotations, WebMcpToolDescriptor, WebMcpToolName } from './types';

/** The seven canonical Phase 1 tools, shipped as the original descriptor catalog. */
export const CANONICAL_PHASE_1_TOOLS: CanonicalWebMcpToolName[] = ['get_storefront_capabilities', 'search_catalog', 'evaluate_shopping_plan', 'find_valid_alternatives', 'apply_plan_repair', 'prepare_validated_cart', 'request_quote'];
/** Back-compat alias — existing code/tests importing `CANONICAL_TOOLS` keep working unchanged. */
export const CANONICAL_TOOLS: WebMcpToolName[] = CANONICAL_PHASE_1_TOOLS;
/** Optional post-cart revision extension, added after Phase 1 shipped. Not part of the historical seven. */
export const OPTIONAL_CART_REVISION_TOOLS: OptionalWebMcpToolName[] = ['revise_validated_cart'];
export const ALL_WEBMCP_TOOLS: WebMcpToolName[] = [...CANONICAL_PHASE_1_TOOLS, ...OPTIONAL_CART_REVISION_TOOLS];
const BASE_TOOLS = CANONICAL_PHASE_1_TOOLS.slice(0, 3);
const PHASE_TOOLS: Record<ShowcaseState, WebMcpToolName[]> = { initial: [], repairable: ['find_valid_alternatives', 'apply_plan_repair'], awaiting_shopper: ['find_valid_alternatives', 'apply_plan_repair'], eligible: ['prepare_validated_cart'], quote_required: ['request_quote'], quote_requested: [], cart_prepared: [] };
const linesSchema = () => ({ type: 'array', minItems: 1, maxItems: 20, items: { type: 'object', properties: { productId: { type: 'string', minLength: 1, maxLength: 120 }, quantity: { type: 'integer', minimum: 1, maximum: 99999 } }, required: ['productId', 'quantity'], additionalProperties: false } });
const SCHEMAS: Record<WebMcpToolName, JsonObject> = {
  get_storefront_capabilities: { type: 'object', properties: {}, additionalProperties: false },
  search_catalog: { type: 'object', properties: { query: { type: 'string', minLength: 1, maxLength: 240 }, limit: { type: 'integer', minimum: 1, maximum: 12 } }, required: ['query'], additionalProperties: false },
  evaluate_shopping_plan: { type: 'object', properties: { lines: linesSchema(), budget: { type: 'object', properties: { amount: { type: 'number', minimum: 0, maximum: 100000 }, currency: { type: 'string', minLength: 3, maxLength: 3 } }, required: ['amount', 'currency'], additionalProperties: false }, fulfillmentMode: { type: 'string', enum: ['shipping', 'pickup', 'local_delivery'], description: 'How the order will be fulfilled by this storefront (its advertised fulfillment mode). Not a delivery deadline — use requestedDeliveryWindow for an actual requested date/time.' }, requestedDeliveryWindow: { type: 'string', minLength: 1, maxLength: 120, description: 'An actual requested delivery deadline or window (e.g. a date or time-of-day the shopper needs the order by). Never put a fulfillment mode like "local delivery" or "pickup" here — use fulfillmentMode for that.' }, substitutionsAllowed: { type: 'boolean' } }, required: ['lines'], additionalProperties: false },
  find_valid_alternatives: { type: 'object', properties: { decisionId: { type: 'string', minLength: 1, maxLength: 240 }, lines: linesSchema() }, required: ['decisionId', 'lines'], additionalProperties: false },
  apply_plan_repair: { type: 'object', properties: { decisionId: { type: 'string', minLength: 1, maxLength: 240, description: 'The exact decisionId returned by evaluate_shopping_plan for the pre-repair plan.' }, repairId: { type: 'string', minLength: 1, maxLength: 160, description: 'The RetailAgentOS-approved repairId returned for that decision.' }, lines: { ...linesSchema(), description: 'The exact pre-repair lines returned by evaluate_shopping_plan. Do not send repaired or replacement lines.' }, idempotencyKey: { type: 'string', minLength: 8, maxLength: 160, description: 'A caller-generated key used to make this shopper-approved repair idempotent.' } }, required: ['decisionId', 'repairId', 'lines', 'idempotencyKey'], additionalProperties: false },
  prepare_validated_cart: { type: 'object', properties: { decisionId: { type: 'string', minLength: 1, maxLength: 240 }, lines: linesSchema(), idempotencyKey: { type: 'string', minLength: 8, maxLength: 160 } }, required: ['decisionId', 'lines', 'idempotencyKey'], additionalProperties: false },
  request_quote: { type: 'object', properties: { productId: { type: 'string', minLength: 1, maxLength: 120 }, quantity: { type: 'integer', minimum: 1, maximum: 99999 }, requirements: { type: 'string', minLength: 1, maxLength: 2000 }, idempotencyKey: { type: 'string', minLength: 8, maxLength: 160 } }, required: ['quantity', 'requirements', 'idempotencyKey'], additionalProperties: false },
  revise_validated_cart: { type: 'object', properties: { cartReference: { type: 'string', minLength: 1, maxLength: 200 }, expectedRevision: { type: 'integer', minimum: 1, maximum: 1000000 }, lines: linesSchema(), idempotencyKey: { type: 'string', minLength: 8, maxLength: 160 } }, required: ['cartReference', 'expectedRevision', 'lines', 'idempotencyKey'], additionalProperties: false },
};

export function getWebMcpToolSchema(name: WebMcpToolName): JsonObject { return SCHEMAS[name]; }
/** `cartRevisionEnabled` gates the optional extension into the `cart_prepared` phase — it is never
 * registered for a storefront/session that has not enabled it (e.g. TheCustomHub never passes true). */
export function getToolsForState(state: ShowcaseState, cartRevisionEnabled = false): WebMcpToolName[] { return [...BASE_TOOLS, ...phaseTools(state, cartRevisionEnabled)]; }
function phaseTools(state: ShowcaseState, cartRevisionEnabled: boolean): WebMcpToolName[] { return state === 'cart_prepared' && cartRevisionEnabled ? [...PHASE_TOOLS[state], ...OPTIONAL_CART_REVISION_TOOLS] : PHASE_TOOLS[state]; }

export function createRetailAgentWebMcp(input: { gateway: RetailAgentGateway; storefront: StorefrontBridge; adapter?: WebMcpBrowserAdapter; clock?: () => number; telemetry?: (event: WebMcpTelemetryEvent) => void; enableCartRevision?: boolean }) {
  const adapter = input.adapter ?? createBrowserAdapter(); const clock = input.clock ?? Date.now;
  const cartRevisionEnabled = Boolean(input.enableCartRevision && input.gateway.reviseValidatedCart);
  let step = 0; let eventId = 0; let state: ShowcaseState = 'initial'; let disposed = false;
  // `phaseController` always tracks the controller for the *currently active* phase's registrations.
  // `phaseGeneration`/`toolGeneration` let deferred cleanup from an older transition recognize (and
  // skip) a tool that a newer transition has since re-registered under the same name — see
  // `activatePhase`/`scheduleCleanup` below.
  let phaseController: AbortController | undefined; let baseController: AbortController | undefined; const sessionController = new AbortController();
  let phaseGeneration = 0; let phaseGenerationCounter = 0; const toolGeneration = new Map<WebMcpToolName, number>();
  /**
   * Every not-yet-cleaned-up superseded phase generation, keyed by its own generation number.
   * `scheduleCleanup` populates an entry when a transition supersedes a phase; `performCleanup`
   * (below) is the single place that ever tears one down — normally from the deferred
   * `setTimeout(0)` tick in `scheduleCleanup`, but also called directly, and synchronously, from
   * two other places: `activatePhase`, right before registering a tool name that collides with a
   * still-pending stale generation (so a real host that rejects re-registering an in-use name never
   * sees a duplicate — the stale generation is, by construction, always fully superseded once any of
   * its tool names is about to be re-registered for the new phase); and `dispose()`, so a superseded
   * controller is always aborted even mid-cleanup, never left dangling.
   */
  const pendingCleanups = new Map<number, { controller: AbortController; tools: WebMcpToolName[]; previous: ShowcaseState; nextState: ShowcaseState }>();
  let cleanupChain: Promise<void> = Promise.resolve();
  let modelContext: ReturnType<WebMcpBrowserAdapter['getModelContext']>; const activeTools = new Set<WebMcpToolName>();
  /** Registration lifecycle events (registered/unregistered) genuinely happen through the native
   * browser API whenever `modelContext` exists — that is true regardless of whether a guided
   * mission or a real agent later invokes the tool, so it is safe to label from browser capability. */
  const registrationSource = (): 'native' | 'replay' => (modelContext ? 'native' : 'replay');
  const emit = (tool: WebMcpToolName, lifecycle: WebMcpTelemetryEvent['lifecycle'], src: 'native' | 'replay', detail: Partial<WebMcpTelemetryEvent> = {}) => { const event: WebMcpTelemetryEvent = { id: `webmcp-${++eventId}`, step: ++step, timestamp: clock(), tool, source: src, lifecycle, ...detail }; input.telemetry?.(event); input.storefront.onLifecycle?.(event); };
  const descriptors = makeDescriptors();

  function names() { return modelContext ? [...activeTools] : getToolsForState(state, cartRevisionEnabled); }

  /**
   * Activates `nextState`'s phase tools and only then returns — every `registerTool()` promise for
   * the new phase has settled and the tool is visible in `activeTools`/the native registry before
   * this resolves. This is what makes the post-approval handoff deterministic: a native browser
   * agent that receives `apply_plan_repair`'s result already sees `prepare_validated_cart`
   * registered, because that registration completed *before* `execute()` returned.
   *
   * Removal of the *previous* phase's tools (including the tool whose handler is still resolving
   * the very call that triggered this transition) is never done here — it is scheduled via
   * `scheduleCleanup` to run after the current callback has returned, using a generation token so a
   * late cleanup can never remove a same-named tool a newer transition has since re-registered.
   */
  async function activatePhase(nextState: ShowcaseState): Promise<WebMcpToolName[]> {
    const previous = state;
    if (disposed) { state = nextState; return names(); }
    const oldTools = phaseTools(previous, cartRevisionEnabled);
    const newTools = phaseTools(nextState, cartRevisionEnabled);
    if (previous === nextState || oldTools.join('|') === newTools.join('|')) { state = nextState; return names(); }

    const oldController = phaseController; const oldGeneration = phaseGeneration;
    const newController = new AbortController(); const newGeneration = ++phaseGenerationCounter;

    if (!modelContext) {
      state = nextState; phaseController = newController; phaseGeneration = newGeneration;
      scheduleCleanup(oldController, oldGeneration, oldTools, previous, nextState);
      return names();
    }

    const added: WebMcpToolName[] = [];
    try {
      for (const tool of newTools) {
        // A stale, not-yet-cleaned-up generation can still hold this exact tool name registered
        // (its deferred cleanup tick hasn't fired yet — e.g. a rapid ELIGIBLE -> REPAIRABLE ->
        // ELIGIBLE re-transition before the first cleanup's setTimeout(0) elapses). Force that
        // stale generation's cleanup through now, synchronously, before attempting to register the
        // same name again — a real host that rejects re-registering an in-use name must never see
        // a duplicate. This is always safe: a name collision only occurs when the colliding
        // generation's whole tool group is superseded by this transition.
        const staleGeneration = toolGeneration.get(tool);
        if (staleGeneration !== undefined && staleGeneration !== newGeneration) performCleanup(staleGeneration);
        await modelContext.registerTool(descriptors[tool], { signal: newController.signal });
        added.push(tool); activeTools.add(tool); toolGeneration.set(tool, newGeneration);
        emit(tool, 'registered', registrationSource(), { previousState: previous, nextState, registryAdded: newTools });
      }
    } catch (error) {
      newController.abort();
      added.forEach((tool) => {
        if (toolGeneration.get(tool) === newGeneration) { activeTools.delete(tool); toolGeneration.delete(tool); }
        emit(tool, 'registration_cleanup', registrationSource(), { previousState: previous, nextState, registryRemoved: [tool], error: message(error) });
      });
      // The previous valid state/registrations are untouched — no partial "unlocked" state is ever visible.
      throw new Error('REGISTRATION_FAILED');
    }

    state = nextState; phaseController = newController; phaseGeneration = newGeneration;
    scheduleCleanup(oldController, oldGeneration, oldTools, previous, nextState);
    return names();
  }

  /** Defers removal of a superseded phase's registrations until after the current microtask/callback
   * has returned (a `setTimeout(0)` tick), so the tool whose handler triggered the transition is never
   * aborted before its own result resolves. Chained on `cleanupChain` so `settleRegistry()` — used by
   * guided replay and tests — can await full settlement deterministically. Records the generation in
   * `pendingCleanups` so it can also be torn down early — see `performCleanup`. */
  function scheduleCleanup(oldController: AbortController | undefined, oldGeneration: number, oldTools: WebMcpToolName[], previous: ShowcaseState, nextState: ShowcaseState) {
    if (!oldController || oldTools.length === 0) return;
    pendingCleanups.set(oldGeneration, { controller: oldController, tools: oldTools, previous, nextState });
    cleanupChain = cleanupChain.then(() => new Promise<void>((resolve) => setTimeout(resolve, 0))).then(() => performCleanup(oldGeneration));
  }

  /**
   * Tears down one superseded generation — the single place that ever does so. Called from three
   * places: `scheduleCleanup`'s deferred `setTimeout(0)` tick (the normal path); `activatePhase`,
   * synchronously, right before re-registering a colliding tool name from a still-pending stale
   * generation; and `dispose()`, for every generation still pending at shutdown.
   *
   * The superseded controller is ALWAYS aborted, unconditionally — that must happen even after
   * `dispose()`, so a captured controller is never left dangling. Only the telemetry emission and
   * `activeTools`/`toolGeneration` bookkeeping below the abort are suppressed once disposed — dispose
   * already clears that bookkeeping itself for every tool, and stale post-dispose telemetry would be
   * misleading.
   */
  function performCleanup(generation: number) {
    const entry = pendingCleanups.get(generation);
    if (!entry) return;
    pendingCleanups.delete(generation);
    const { controller, tools, previous, nextState } = entry;
    controller.abort();
    if (disposed) return;
    tools.forEach((tool) => {
      // A newer generation may have already re-registered this same tool name — never remove it.
      if (toolGeneration.get(tool) !== generation) return;
      if (activeTools.delete(tool)) { toolGeneration.delete(tool); emit(tool, 'unregistered', registrationSource(), { previousState: previous, nextState, registryRemoved: tools }); }
    });
  }

  /** External/administrative state changes (reset, scenario switch) go through the same activation
   * path, then wait for cleanup to finish so callers observe a fully settled registry. */
  async function transition(nextState: ShowcaseState): Promise<WebMcpToolName[]> { const result = await activatePhase(nextState); await cleanupChain; return result; }
  async function settleRegistry() { await cleanupChain; return names(); }

  async function register(): Promise<WebMcpRegistration> {
    modelContext = adapter.getModelContext();
    if (modelContext) { baseController = new AbortController(); const added: WebMcpToolName[] = [];
      try { for (const tool of BASE_TOOLS) { await modelContext.registerTool(descriptors[tool], { signal: baseController.signal }); added.push(tool); activeTools.add(tool); emit(tool, 'registered', 'native', { nextState: state, registryAdded: BASE_TOOLS }); } }
      catch (error) { baseController.abort(); added.forEach((tool) => { activeTools.delete(tool); emit(tool, 'registration_cleanup', 'native', { registryRemoved: [tool], error: message(error) }); }); modelContext = undefined; throw new Error('REGISTRATION_FAILED'); }
    }
    return { supported: Boolean(modelContext), get registeredTools() { return modelContext ? [...activeTools] : []; }, getReplayTools: () => getToolsForState(state, cartRevisionEnabled), invoke: async (name, args, signal) => { const result = await descriptors[name].execute(args, { signal, source: 'replay' }); await settleRegistry(); return result; }, setState: transition, settleRegistry, getNativeToolNames: async () => { if (!modelContext?.getTools) return []; const observed = await modelContext.getTools(); return observed.map((tool) => typeof tool === 'string' ? tool : tool.name).filter((tool): tool is WebMcpToolName => ALL_WEBMCP_TOOLS.includes(tool as WebMcpToolName)); }, dispose: () => {
      if (disposed) return; disposed = true;
      const previous = state; const src = registrationSource();
      sessionController.abort(); phaseController?.abort(); baseController?.abort();
      // Every not-yet-cleaned-up superseded generation is aborted too, even mid-cleanup —
      // `performCleanup` always aborts the controller unconditionally and only suppresses the
      // telemetry/bookkeeping below it once `disposed` is true (which it now is).
      [...pendingCleanups.keys()].forEach((generation) => performCleanup(generation));
      [...activeTools].forEach((tool) => emit(tool, 'unregistered', src, { previousState: previous, nextState: 'initial' }));
      activeTools.clear(); toolGeneration.clear(); state = 'initial';
    } };
  }

  function makeDescriptors(): Record<WebMcpToolName, WebMcpToolDescriptor> {
    const descriptor = (name: WebMcpToolName, title: string, description: string, annotations: WebMcpToolAnnotations, handler: (args: JsonObject, signal: AbortSignal, source: 'native' | 'replay') => Promise<{ result: JsonObject; nextState?: ShowcaseState }>): WebMcpToolDescriptor => ({ name, title, description, annotations, inputSchema: SCHEMAS[name], async execute(args, options = {}) {
      // Explicit per-invocation source: a real browser/model-context call never sets `options.source`,
      // so an omitted value means the registered native descriptor was invoked directly — 'native'.
      // The guided-mission `invoke()` path always passes `source: 'replay'` explicitly. Merely having
      // `document.modelContext` available must never flip a guided call to 'native' — there is no
      // shared mutable flag here, so concurrent native and guided calls cannot mislabel each other.
      const invocationSource: 'native' | 'replay' = options.source ?? 'native';
      const started = clock(); const signal = combinedSignal(options.signal, sessionController.signal); emit(name, 'invoked', invocationSource, { previousState: state });
      try {
        if (signal.aborted) throw abortError();
        const outcome = await handler(args, signal, invocationSource);
        const before = state;
        // Next-phase tools (if any) are fully registered and visible before this returns — see
        // `activatePhase`. Only the previous phase's cleanup is deferred, and never the registration
        // that made the newly available tool observable to the caller of *this* execute().
        if (outcome.nextState) await activatePhase(outcome.nextState);
        emit(name, 'completed', invocationSource, { decisionCode: typeof outcome.result.code === 'string' ? outcome.result.code : undefined, previousState: before, nextState: outcome.nextState ?? state, durationMs: clock() - started });
        return outcome.result;
      }
      catch (error) { const cancelled = signal.aborted || isAbort(error); const failure = errorResult(cancelled ? 'CANCELLED' : message(error)); emit(name, cancelled ? 'cancelled' : 'failed', invocationSource, { error: failure.code, previousState: state, nextState: state, durationMs: clock() - started }); return failure; }
    }});
    return {
      get_storefront_capabilities: descriptor('get_storefront_capabilities', 'Get storefront capabilities', 'Read the active storefront’s fulfillment, pricing, substitution, quote, cart, and checkout boundaries before planning.', { readOnlyHint: true, untrustedContentHint: false }, async (_args, signal) => ({ result: await input.gateway.getStorefrontCapabilities({ signal }) })),
      search_catalog: descriptor('search_catalog', 'Search catalog', 'Find bounded candidates from the active storefront catalog. Results may require plan evaluation before action.', { readOnlyHint: true, untrustedContentHint: true }, async (args, signal) => ({ result: await input.gateway.searchCatalog({ query: stringArg(args, 'query', 240), limit: optionalInt(args, 'limit', 12) }, { signal }) })),
      evaluate_shopping_plan: descriptor('evaluate_shopping_plan', 'Evaluate shopping plan', 'Evaluate proposed items and shopper constraints against current merchant inventory, pricing, fulfillment, and policy. Call get_storefront_capabilities first to discover supportedFulfillmentModes, then pass the matching fulfillmentMode here — it is distinct from requestedDeliveryWindow (an actual requested delivery deadline) and from consumption intent (which meal/occasion the items are for, captured only in free-form shopper framing). This tool does not modify a cart.', { readOnlyHint: true, untrustedContentHint: false }, async (args, signal) => { const result = await input.gateway.evaluateShoppingPlan({ lines: linesArg(args), budget: budgetArg(args), fulfillmentMode: optionalEnum(args, 'fulfillmentMode', ['shipping', 'pickup', 'local_delivery']), requestedDeliveryWindow: optionalString(args, 'requestedDeliveryWindow', 120), substitutionsAllowed: optionalBoolean(args, 'substitutionsAllowed') }, { signal }); input.storefront.onDecision?.(result); return { result: result as unknown as JsonObject, nextState: stateFromDecision(result) }; }),
      find_valid_alternatives: descriptor('find_valid_alternatives', 'Find valid alternatives', 'Return only merchant-valid alternatives for the active RetailAgentOS decision. This tool does not apply a replacement.', { readOnlyHint: true, untrustedContentHint: true }, async (args, signal) => ({ result: await input.gateway.findValidAlternatives({ decisionId: stringArg(args, 'decisionId', 240), lines: linesArg(args) }, { signal }) as unknown as JsonObject })),
      apply_plan_repair: descriptor('apply_plan_repair', 'Apply approved plan repair', 'Present one RetailAgentOS-approved repair and wait for explicit shopper approval. The lines input must exactly match the pre-repair lines returned by evaluate_shopping_plan for the supplied decisionId. Do not send repaired or replacement lines. On approval, the result returns the repaired lines and eligible decision for the next action. This tool does not prepare a cart or start checkout.', { readOnlyHint: false, untrustedContentHint: false }, async (args, signal, source) => {
        const decisionId = stringArg(args, 'decisionId', 240); const repairId = stringArg(args, 'repairId', 160); const lines = linesArg(args);
        const alternatives = await input.gateway.findValidAlternatives({ decisionId, lines }, { signal });
        const proposal = alternatives.alternatives.find((item) => item.repairId === repairId);
        if (!proposal) throw new Error('INVALID_REPAIR');
        await activatePhase('awaiting_shopper');
        emit('apply_plan_repair', 'waiting_for_shopper', source, { previousState: 'repairable', nextState: 'awaiting_shopper' });
        if (!input.storefront.requestRepairApproval) throw new Error('SHOPPER_APPROVAL_UNAVAILABLE');
        const approval = await input.storefront.requestRepairApproval(proposal, { decisionId, repairId, signal });
        if (signal.aborted) throw abortError();
        if (approval === 'declined') return { result: { status: 'DECLINED', code: 'SHOPPER_DECLINED', decisionId, cartCreated: false, nextAction: 'No cart was created.' }, nextState: 'repairable' as const };
        const repairResult = await input.gateway.applyPlanRepair({ decisionId, repairId, lines, idempotencyKey: stringArg(args, 'idempotencyKey', 160) }, { signal });
        input.storefront.onDecision?.(repairResult.decision);
        // Top-level continuation contract (in addition to the preserved nested `decision`/`repair`
        // objects) so a browser agent can act on the result without digging through nested fields —
        // see the "repair result contract" invariant in AGENTS.md / WEBMCP-PLATFORM-BUILD.md.
        const enriched: JsonObject = { ...repairResult, status: 'APPLIED', code: 'REPAIR_APPLIED', decisionId: repairResult.decision.decisionId, allowedNextActions: ['prepare_validated_cart'], nextAction: 'Immediately invoke prepare_validated_cart using this decisionId and these approved lines. Prepare the cart for visible review only. Do not check out.', cartCreated: false, checkoutAvailable: false, checkoutStarted: false, orderPlaced: false };
        return { result: enriched, nextState: stateFromDecision(repairResult.decision) };
      }),
      prepare_validated_cart: descriptor('prepare_validated_cart', 'Prepare validated cart', 'Revalidate an eligible RetailAgentOS decision and prepare a cart for visible shopper review. Checkout is not exposed.', { readOnlyHint: false, untrustedContentHint: false }, async (args, signal) => { const result = await input.gateway.prepareValidatedCart({ decisionId: stringArg(args, 'decisionId', 240), lines: linesArg(args), idempotencyKey: stringArg(args, 'idempotencyKey', 160) }, { signal }); input.storefront.onCart?.(result); return { result: result as unknown as JsonObject, nextState: result.cart ? 'cart_prepared' as const : undefined }; }),
      request_quote: descriptor('request_quote', 'Request merchant quote', 'Submit custom-order requirements for merchant review when no valid fixed price exists. This tool creates no cart, order, payment, or checkout.', { readOnlyHint: false, untrustedContentHint: false }, async (args, signal) => { const result = await input.gateway.requestQuote({ productId: optionalString(args, 'productId', 120), quantity: requiredInt(args, 'quantity', 99999), requirements: stringArg(args, 'requirements', 2000), idempotencyKey: stringArg(args, 'idempotencyKey', 160) }, { signal }); input.storefront.onQuote?.(result); return { result: result as unknown as JsonObject, nextState: 'quote_requested' as const }; }),
      // Optional post-cart revision extension: revalidates a proposed final line set against the
      // original shopper constraints and merchant policy, then replaces the prepared review cart
      // only if the revised plan remains eligible. Never registered before a cart exists, during the
      // approval gate, or for a storefront/session that has not enabled it. Cannot check out.
      revise_validated_cart: descriptor('revise_validated_cart', 'Revise validated cart', 'Revalidate a proposed final line set against the original shopper constraints and merchant policy, then replace the prepared review cart only if the revised plan remains eligible. This tool cannot check out, place an order, or initiate payment.', { readOnlyHint: false, untrustedContentHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false }, async (args, signal) => {
        if (!input.gateway.reviseValidatedCart) throw new Error('CART_REVISION_UNAVAILABLE');
        const result = await input.gateway.reviseValidatedCart({ cartReference: stringArg(args, 'cartReference', 200), expectedRevision: requiredInt(args, 'expectedRevision', 1000000), lines: linesArg(args), idempotencyKey: stringArg(args, 'idempotencyKey', 160) }, { signal });
        input.storefront.onCartRevision?.(result);
        // The tool stays registered afterward — a shopper may want to review the outcome or try again;
        // it never advances the WebMCP registration state machine beyond `cart_prepared`.
        return { result: result as unknown as JsonObject };
      }),
    };
  }
  return { register, getDescriptors: () => descriptors };
}

function combinedSignal(browser: AbortSignal | undefined, session: AbortSignal): AbortSignal { if (!browser) return session; const any = (AbortSignal as typeof AbortSignal & { any?: (signals: AbortSignal[]) => AbortSignal }).any; if (any) return any([browser, session]); const controller = new AbortController(); const abort = () => controller.abort(); browser.addEventListener('abort', abort, { once: true }); session.addEventListener('abort', abort, { once: true }); if (browser.aborted || session.aborted) controller.abort(); return controller.signal; }
function abortError() { return new DOMException('The operation was aborted.', 'AbortError'); }
function isAbort(error: unknown) { return error instanceof DOMException && error.name === 'AbortError'; }
function message(error: unknown) { return error instanceof Error && error.message ? error.message.slice(0, 120) : 'TOOL_FAILED'; }
function errorResult(code: string): JsonObject & { code: string; message: string; nextAction: string; retryable: boolean } {
  const guidance: Record<string, { message: string; nextAction: string; retryable: boolean }> = {
    INVALID_INPUT: { message: 'The request does not match the tool contract.', nextAction: 'Check the tool schema and submit bounded valid fields.', retryable: true },
    INVALID_REPAIR: { message: 'The requested repair is not currently valid.', nextAction: 'Re-run evaluate_shopping_plan and choose a returned repairId.', retryable: true },
    DECISION_MISMATCH: { message: 'The supplied lines do not match the evaluated plan.', nextAction: 'Re-run evaluate_shopping_plan and use its exact decisionId and lines.', retryable: true },
    DECISION_EXPIRED: { message: 'The evaluated decision is no longer valid.', nextAction: 'Re-run evaluate_shopping_plan before taking the next action.', retryable: true },
    STOREFRONT_MISMATCH: { message: 'This request belongs to a different storefront.', nextAction: 'Read the active storefront capabilities and start a new plan.', retryable: true },
    CONTEXT_MISMATCH: { message: 'This request belongs to a different storefront session or fulfillment context.', nextAction: 'Re-run the plan in the active storefront session.', retryable: true },
    PRODUCT_NOT_FOUND: { message: 'The requested product is not in the active controlled storefront.', nextAction: 'Search the active catalog and use a returned productId.', retryable: true },
    IDEMPOTENCY_KEY_REQUIRED: { message: 'A valid idempotency key is required for this mutation.', nextAction: 'Provide one caller-generated idempotency key between 8 and 160 characters.', retryable: true },
    IDEMPOTENCY_KEY_REUSED: { message: 'This idempotency key was used for a different request.', nextAction: 'Reuse it only for the same request or generate a new key.', retryable: true },
    CART_PREPARATION_CONFLICT: { message: 'A cart already exists for this decision with different lines.', nextAction: 'Re-run evaluate_shopping_plan before preparing a new cart.', retryable: true },
    CART_REVISION_CONFLICT: { message: 'The cart changed since it was read.', nextAction: 'Re-read the cart and retry with its current revision.', retryable: true },
    BUDGET_EXCEEDED: { message: 'The evaluated plan exceeds the shopper budget.', nextAction: 'Adjust the lines or budget and re-run evaluate_shopping_plan.', retryable: true },
    CANCELLED: { message: 'The request was cancelled.', nextAction: 'Start a new explicit request when ready.', retryable: true },
    REGISTRATION_FAILED: { message: 'The browser could not register this WebMCP capability.', nextAction: 'Use guided replay or refresh after resolving browser support.', retryable: true },
  };
  const result = guidance[code] ?? { message: 'The requested safe action could not be completed.', nextAction: 'Review the result and start a new bounded request.', retryable: false };
  return { code, ...result };
}
function stringArg(args: JsonObject, key: string, max: number) { const value = args[key]; if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('INVALID_INPUT'); return value.trim(); }
function optionalString(args: JsonObject, key: string, max: number) { return args[key] === undefined ? undefined : stringArg(args, key, max); }
function optionalEnum<T extends string>(args: JsonObject, key: string, allowed: readonly T[]): T | undefined { const value = args[key]; if (value === undefined) return undefined; if (typeof value !== 'string' || !allowed.includes(value as T)) throw new Error('INVALID_INPUT'); return value as T; }
function requiredInt(args: JsonObject, key: string, max: number) { const value = args[key]; if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) throw new Error('INVALID_INPUT'); return value; }
function optionalInt(args: JsonObject, key: string, max: number) { return args[key] === undefined ? undefined : requiredInt(args, key, max); }
function optionalBoolean(args: JsonObject, key: string) { const value = args[key]; if (value !== undefined && typeof value !== 'boolean') throw new Error('INVALID_INPUT'); return value as boolean | undefined; }
function budgetArg(args: JsonObject) { if (args.budget === undefined) return undefined; const value = args.budget; if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_INPUT'); const budget = value as JsonObject; const amount = budget.amount; if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 100000) throw new Error('INVALID_INPUT'); return { amount, currency: stringArg(budget, 'currency', 3) }; }
function linesArg(args: JsonObject) { const lines = args.lines; if (!Array.isArray(lines) || lines.length < 1 || lines.length > 20) throw new Error('INVALID_INPUT'); return lines.map((line) => { if (!line || typeof line !== 'object' || Array.isArray(line)) throw new Error('INVALID_INPUT'); const value = line as JsonObject; return { productId: stringArg(value, 'productId', 120), quantity: requiredInt(value, 'quantity', 99999) }; }); }
function stateFromDecision(decision: PlanDecision): ShowcaseState { return decision.status === 'REPAIRABLE' ? 'repairable' : decision.status === 'ELIGIBLE' ? 'eligible' : decision.status === 'QUOTE_REQUIRED' ? 'quote_required' : 'initial'; }
