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
  evaluate_shopping_plan: { type: 'object', properties: { lines: linesSchema(), budget: { type: 'object', properties: { amount: { type: 'number', minimum: 0, maximum: 100000 }, currency: { type: 'string', minLength: 3, maxLength: 3 } }, required: ['amount', 'currency'], additionalProperties: false }, requestedDeliveryWindow: { type: 'string', minLength: 1, maxLength: 120 }, substitutionsAllowed: { type: 'boolean' } }, required: ['lines'], additionalProperties: false },
  find_valid_alternatives: { type: 'object', properties: { decisionId: { type: 'string', minLength: 1, maxLength: 240 }, lines: linesSchema() }, required: ['decisionId', 'lines'], additionalProperties: false },
  apply_plan_repair: { type: 'object', properties: { decisionId: { type: 'string', minLength: 1, maxLength: 240 }, repairId: { type: 'string', minLength: 1, maxLength: 160 }, lines: linesSchema(), idempotencyKey: { type: 'string', minLength: 8, maxLength: 160 } }, required: ['decisionId', 'repairId', 'lines', 'idempotencyKey'], additionalProperties: false },
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
  let phaseController: AbortController | undefined; let baseController: AbortController | undefined; const sessionController = new AbortController();
  let modelContext: ReturnType<WebMcpBrowserAdapter['getModelContext']>; const activeTools = new Set<WebMcpToolName>(); let deferredTransition: Promise<void> = Promise.resolve();
  /** Registration lifecycle events (registered/unregistered) genuinely happen through the native
   * browser API whenever `modelContext` exists — that is true regardless of whether a guided
   * mission or a real agent later invokes the tool, so it is safe to label from browser capability. */
  const registrationSource = (): 'native' | 'replay' => (modelContext ? 'native' : 'replay');
  const emit = (tool: WebMcpToolName, lifecycle: WebMcpTelemetryEvent['lifecycle'], src: 'native' | 'replay', detail: Partial<WebMcpTelemetryEvent> = {}) => { const event: WebMcpTelemetryEvent = { id: `webmcp-${++eventId}`, step: ++step, timestamp: clock(), tool, source: src, lifecycle, ...detail }; input.telemetry?.(event); input.storefront.onLifecycle?.(event); };
  const descriptors = makeDescriptors();

  function names() { return modelContext ? [...activeTools] : getToolsForState(state, cartRevisionEnabled); }
  async function transition(nextState: ShowcaseState) {
    const previous = state; const oldTools = phaseTools(state, cartRevisionEnabled); const newTools = phaseTools(nextState, cartRevisionEnabled);
    if (disposed || previous === nextState || oldTools.join('|') === newTools.join('|')) { state = nextState; return names(); }
    state = nextState;
    if (phaseController) { phaseController.abort(); oldTools.forEach((tool) => { if (activeTools.delete(tool)) emit(tool, 'unregistered', registrationSource(), { previousState: previous, nextState, registryRemoved: oldTools }); }); }
    phaseController = new AbortController();
    if (!modelContext) return getToolsForState(state, cartRevisionEnabled);
    const added: WebMcpToolName[] = [];
    try { for (const tool of newTools) { await modelContext.registerTool(descriptors[tool], { signal: phaseController.signal }); added.push(tool); activeTools.add(tool); emit(tool, 'registered', registrationSource(), { previousState: previous, nextState, registryAdded: newTools }); } }
    catch (error) { phaseController.abort(); added.forEach((tool) => { activeTools.delete(tool); emit(tool, 'registration_cleanup', registrationSource(), { previousState: previous, nextState, registryRemoved: [tool], error: message(error) }); }); state = previous; throw new Error('REGISTRATION_FAILED'); }
    return names();
  }
  function queueTransition(nextState: ShowcaseState) { deferredTransition = deferredTransition.then(() => new Promise<void>((resolve) => setTimeout(resolve, 0))).then(() => transition(nextState).then(() => undefined)); return deferredTransition; }
  async function settleRegistry() { await deferredTransition; return names(); }

  async function register(): Promise<WebMcpRegistration> {
    modelContext = adapter.getModelContext();
    if (modelContext) { baseController = new AbortController(); const added: WebMcpToolName[] = [];
      try { for (const tool of BASE_TOOLS) { await modelContext.registerTool(descriptors[tool], { signal: baseController.signal }); added.push(tool); activeTools.add(tool); emit(tool, 'registered', 'native', { nextState: state, registryAdded: BASE_TOOLS }); } }
      catch (error) { baseController.abort(); added.forEach((tool) => { activeTools.delete(tool); emit(tool, 'registration_cleanup', 'native', { registryRemoved: [tool], error: message(error) }); }); modelContext = undefined; throw new Error('REGISTRATION_FAILED'); }
    }
    return { supported: Boolean(modelContext), get registeredTools() { return modelContext ? [...activeTools] : []; }, getReplayTools: () => getToolsForState(state, cartRevisionEnabled), invoke: async (name, args, signal) => { const result = await descriptors[name].execute(args, { signal, source: 'replay' }); await settleRegistry(); return result; }, setState: transition, settleRegistry, getNativeToolNames: async () => { if (!modelContext?.getTools) return []; const observed = await modelContext.getTools(); return observed.map((tool) => typeof tool === 'string' ? tool : tool.name).filter((tool): tool is WebMcpToolName => ALL_WEBMCP_TOOLS.includes(tool as WebMcpToolName)); }, dispose: () => { if (disposed) return; disposed = true; const previous = state; const src = registrationSource(); sessionController.abort(); phaseController?.abort(); baseController?.abort(); [...activeTools].forEach((tool) => emit(tool, 'unregistered', src, { previousState: previous, nextState: 'initial' })); activeTools.clear(); state = 'initial'; } };
  }

  function makeDescriptors(): Record<WebMcpToolName, WebMcpToolDescriptor> {
    const descriptor = (name: WebMcpToolName, title: string, description: string, annotations: WebMcpToolAnnotations, handler: (args: JsonObject, signal: AbortSignal, source: 'native' | 'replay') => Promise<{ result: JsonObject; nextState?: ShowcaseState; defer?: boolean }>): WebMcpToolDescriptor => ({ name, title, description, annotations, inputSchema: SCHEMAS[name], async execute(args, options = {}) {
      // Explicit per-invocation source: a real browser/model-context call never sets `options.source`,
      // so an omitted value means the registered native descriptor was invoked directly — 'native'.
      // The guided-mission `invoke()` path always passes `source: 'replay'` explicitly. Merely having
      // `document.modelContext` available must never flip a guided call to 'native' — there is no
      // shared mutable flag here, so concurrent native and guided calls cannot mislabel each other.
      const invocationSource: 'native' | 'replay' = options.source ?? 'native';
      const started = clock(); const signal = combinedSignal(options.signal, sessionController.signal); emit(name, 'invoked', invocationSource, { previousState: state });
      try { if (signal.aborted) throw abortError(); const outcome = await handler(args, signal, invocationSource); const before = state; if (outcome.nextState) { if (outcome.defer) void queueTransition(outcome.nextState); else await transition(outcome.nextState); } emit(name, 'completed', invocationSource, { decisionCode: typeof outcome.result.code === 'string' ? outcome.result.code : undefined, previousState: before, nextState: outcome.nextState ?? state, durationMs: clock() - started }); return outcome.result; }
      catch (error) { const cancelled = signal.aborted || isAbort(error); emit(name, cancelled ? 'cancelled' : 'failed', invocationSource, { error: message(error), previousState: state, nextState: state, durationMs: clock() - started }); return { code: cancelled ? 'CANCELLED' : message(error), nextAction: cancelled ? 'The request was cancelled.' : 'Review the request and try again.' }; }
    }});
    return {
      get_storefront_capabilities: descriptor('get_storefront_capabilities', 'Get storefront capabilities', 'Read the active storefront’s fulfillment, pricing, substitution, quote, cart, and checkout boundaries before planning.', { readOnlyHint: true, untrustedContentHint: false }, async (_args, signal) => ({ result: await input.gateway.getStorefrontCapabilities({ signal }) })),
      search_catalog: descriptor('search_catalog', 'Search catalog', 'Find bounded candidates from the active storefront catalog. Results may require plan evaluation before action.', { readOnlyHint: true, untrustedContentHint: true }, async (args, signal) => ({ result: await input.gateway.searchCatalog({ query: stringArg(args, 'query', 240), limit: optionalInt(args, 'limit', 12) }, { signal }) })),
      evaluate_shopping_plan: descriptor('evaluate_shopping_plan', 'Evaluate shopping plan', 'Evaluate proposed items and shopper constraints against current merchant inventory, pricing, fulfillment, and policy. This tool does not modify a cart.', { readOnlyHint: true, untrustedContentHint: false }, async (args, signal) => { const result = await input.gateway.evaluateShoppingPlan({ lines: linesArg(args), budget: budgetArg(args), requestedDeliveryWindow: optionalString(args, 'requestedDeliveryWindow', 120), substitutionsAllowed: optionalBoolean(args, 'substitutionsAllowed') }, { signal }); input.storefront.onDecision?.(result); return { result: result as unknown as JsonObject, nextState: stateFromDecision(result) }; }),
      find_valid_alternatives: descriptor('find_valid_alternatives', 'Find valid alternatives', 'Return only merchant-valid alternatives for the active RetailAgentOS decision. This tool does not apply a replacement.', { readOnlyHint: true, untrustedContentHint: true }, async (args, signal) => ({ result: await input.gateway.findValidAlternatives({ decisionId: stringArg(args, 'decisionId', 240), lines: linesArg(args) }, { signal }) as unknown as JsonObject })),
      apply_plan_repair: descriptor('apply_plan_repair', 'Apply approved plan repair', 'Present one RetailAgentOS-approved repair to the shopper and wait for explicit approval before applying it. This tool does not prepare a cart or start checkout.', { readOnlyHint: false, untrustedContentHint: false }, async (args, signal, source) => { const decisionId = stringArg(args, 'decisionId', 240); const repairId = stringArg(args, 'repairId', 160); const lines = linesArg(args); const alternatives = await input.gateway.findValidAlternatives({ decisionId, lines }, { signal }); const proposal = alternatives.alternatives.find((item) => item.repairId === repairId); if (!proposal) throw new Error('INVALID_REPAIR'); await transition('awaiting_shopper'); emit('apply_plan_repair', 'waiting_for_shopper', source, { previousState: 'repairable', nextState: 'awaiting_shopper' }); if (!input.storefront.requestRepairApproval) throw new Error('SHOPPER_APPROVAL_UNAVAILABLE'); const approval = await input.storefront.requestRepairApproval(proposal, { decisionId, repairId, signal }); if (signal.aborted) throw abortError(); if (approval === 'declined') return { result: { status: 'DECLINED', code: 'SHOPPER_DECLINED', decisionId, cartCreated: false, nextAction: 'No cart was created.' }, nextState: 'repairable' as const }; const result = await input.gateway.applyPlanRepair({ decisionId, repairId, lines, idempotencyKey: stringArg(args, 'idempotencyKey', 160) }, { signal }); input.storefront.onDecision?.(result.decision); return { result: result as unknown as JsonObject, nextState: stateFromDecision(result.decision), defer: true }; }),
      prepare_validated_cart: descriptor('prepare_validated_cart', 'Prepare validated cart', 'Revalidate an eligible RetailAgentOS decision and prepare a cart for visible shopper review. Checkout is not exposed.', { readOnlyHint: false, untrustedContentHint: false }, async (args, signal) => { const result = await input.gateway.prepareValidatedCart({ decisionId: stringArg(args, 'decisionId', 240), lines: linesArg(args), idempotencyKey: stringArg(args, 'idempotencyKey', 160) }, { signal }); input.storefront.onCart?.(result); return { result: result as unknown as JsonObject, nextState: result.cart ? 'cart_prepared' as const : undefined, defer: Boolean(result.cart) }; }),
      request_quote: descriptor('request_quote', 'Request merchant quote', 'Submit custom-order requirements for merchant review when no valid fixed price exists. This tool creates no cart, order, payment, or checkout.', { readOnlyHint: false, untrustedContentHint: false }, async (args, signal) => { const result = await input.gateway.requestQuote({ productId: optionalString(args, 'productId', 120), quantity: requiredInt(args, 'quantity', 99999), requirements: stringArg(args, 'requirements', 2000), idempotencyKey: stringArg(args, 'idempotencyKey', 160) }, { signal }); input.storefront.onQuote?.(result); return { result: result as unknown as JsonObject, nextState: 'quote_requested' as const, defer: true }; }),
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
function stringArg(args: JsonObject, key: string, max: number) { const value = args[key]; if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('INVALID_INPUT'); return value.trim(); }
function optionalString(args: JsonObject, key: string, max: number) { return args[key] === undefined ? undefined : stringArg(args, key, max); }
function requiredInt(args: JsonObject, key: string, max: number) { const value = args[key]; if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) throw new Error('INVALID_INPUT'); return value; }
function optionalInt(args: JsonObject, key: string, max: number) { return args[key] === undefined ? undefined : requiredInt(args, key, max); }
function optionalBoolean(args: JsonObject, key: string) { const value = args[key]; if (value !== undefined && typeof value !== 'boolean') throw new Error('INVALID_INPUT'); return value as boolean | undefined; }
function budgetArg(args: JsonObject) { if (args.budget === undefined) return undefined; const value = args.budget; if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_INPUT'); const budget = value as JsonObject; const amount = budget.amount; if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || amount > 100000) throw new Error('INVALID_INPUT'); return { amount, currency: stringArg(budget, 'currency', 3) }; }
function linesArg(args: JsonObject) { const lines = args.lines; if (!Array.isArray(lines) || lines.length < 1 || lines.length > 20) throw new Error('INVALID_INPUT'); return lines.map((line) => { if (!line || typeof line !== 'object' || Array.isArray(line)) throw new Error('INVALID_INPUT'); const value = line as JsonObject; return { productId: stringArg(value, 'productId', 120), quantity: requiredInt(value, 'quantity', 99999) }; }); }
function stateFromDecision(decision: PlanDecision): ShowcaseState { return decision.status === 'REPAIRABLE' ? 'repairable' : decision.status === 'ELIGIBLE' ? 'eligible' : decision.status === 'QUOTE_REQUIRED' ? 'quote_required' : 'initial'; }
