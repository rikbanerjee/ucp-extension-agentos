export * from './types';
export { createBrowserAdapter } from './browser';

import { createBrowserAdapter } from './browser';
import type { CompactDecision, PrepareCartRequest, RetailAgentGateway, StorefrontBridge, WebMcpBrowserAdapter, WebMcpDeploymentConfig, WebMcpRegistration, WebMcpTelemetryEvent, WebMcpToolDescriptor, WebMcpToolName } from './types';

const SCHEMAS: Record<WebMcpToolName, Record<string, unknown>> = {
  search_products: { type: 'object', properties: { query: { type: 'string', maxLength: 240 }, limit: { type: 'integer', minimum: 1, maximum: 12 } }, required: ['query'], additionalProperties: false },
  evaluate_offer: { type: 'object', properties: { productId: { type: 'string', maxLength: 120 }, quantity: { type: 'integer', minimum: 1, maximum: 9999 } }, required: ['productId', 'quantity'], additionalProperties: false },
  prepare_cart: { type: 'object', properties: { lines: { type: 'array', minItems: 1, maxItems: 20 }, idempotencyKey: { type: 'string', minLength: 8, maxLength: 160 } }, required: ['lines', 'idempotencyKey'], additionalProperties: false },
  request_quote: { type: 'object', properties: { productId: { type: 'string', maxLength: 120 }, quantity: { type: 'integer', minimum: 1, maximum: 99999 }, requirements: { type: 'string', minLength: 1, maxLength: 2000 }, idempotencyKey: { type: 'string', minLength: 8, maxLength: 160 } }, required: ['quantity', 'requirements', 'idempotencyKey'], additionalProperties: false },
};

export function getWebMcpToolSchema(name: WebMcpToolName): Record<string, unknown> { return SCHEMAS[name]; }
export function compactDecision(decision: CompactDecision, maxCharacters = 900): CompactDecision {
  const compact = { ...decision, reasons: decision.reasons.map((reason) => ({ code: reason.code, severity: reason.severity, message: reason.message.slice(0, 180) })) };
  return JSON.stringify(compact).length <= maxCharacters ? compact : { ...compact, reasons: compact.reasons.slice(0, 2), nextAction: compact.nextAction.slice(0, 180) };
}

export function createRetailAgentWebMcp(input: { config: WebMcpDeploymentConfig; gateway: RetailAgentGateway; storefront: StorefrontBridge; adapter?: WebMcpBrowserAdapter; telemetry?: (event: WebMcpTelemetryEvent) => void }): { register(): Promise<WebMcpRegistration> } {
  const adapter = input.adapter ?? createBrowserAdapter();
  const emit = input.telemetry ?? (() => undefined);
  const context = () => input.storefront.getBuyerContext();
  let activeSignal: AbortSignal | undefined;
  const descriptors: Record<WebMcpToolName, WebMcpToolDescriptor> = {
    search_products: descriptor('search_products', 'Find products that match the shopper request.', { readOnlyHint: true, destructiveHint: false, openWorldHint: false, untrustedContentHint: true }, async (args, signal) => input.gateway.searchProducts({ query: stringArg(args, 'query', 240), limit: numberArg(args, 'limit') ?? input.config.maximumResults ?? 6, buyerContext: context() }, { signal })),
    evaluate_offer: descriptor('evaluate_offer', 'Check a product against current merchant selling rules.', { readOnlyHint: true, destructiveHint: false, openWorldHint: false, untrustedContentHint: true }, async (args, signal) => {
      const result = await input.gateway.evaluateOffer({ productId: stringArg(args, 'productId', 120), quantity: numberArg(args, 'quantity') ?? 1, buyerContext: context() }, { signal });
      if (result.eligible) await input.storefront.showProduct?.(result.productId);
      return { ...result, decision: compactDecision(result.decision) };
    }),
    prepare_cart: descriptor('prepare_cart', 'Re-evaluate eligible products and prepare a visible cart. Checkout still requires user confirmation.', { readOnlyHint: false, destructiveHint: false, openWorldHint: false, untrustedContentHint: true }, async (args, signal) => {
      const result = await input.gateway.prepareCart({ lines: linesArg(args), idempotencyKey: stringArg(args, 'idempotencyKey', 160), buyerContext: context() } as PrepareCartRequest, { signal });
      if (result.cart) await input.storefront.prepareCart?.(result.cart.lines);
      input.storefront.notify?.({ code: result.code, message: result.nextAction, level: result.cart ? 'success' : 'warning' });
      return { ...result, decisions: result.decisions.map((decision) => compactDecision(decision)) };
    }),
    request_quote: descriptor('request_quote', 'Submit a structured custom-order quote request; no fixed price is created.', { readOnlyHint: false, destructiveHint: false, openWorldHint: false, untrustedContentHint: true }, async (args, signal) => {
      if (!input.gateway.requestQuote) throw new Error('QUOTE_NOT_CONFIGURED');
      return input.gateway.requestQuote({ productId: optionalStringArg(args, 'productId', 120), quantity: numberArg(args, 'quantity') ?? 1, requirements: stringArg(args, 'requirements', 2000), idempotencyKey: stringArg(args, 'idempotencyKey', 160), buyerContext: context() }, { signal });
    }),
  };
  return { async register() {
    const modelContext = adapter.getModelContext();
    if (!modelContext) return { supported: false, registeredTools: [], dispose() {} };
    const controller = new AbortController();
    activeSignal = controller.signal;
    const registeredTools: WebMcpToolName[] = [];
    for (const name of input.config.enabledTools) {
      if (name === 'request_quote' && !input.gateway.requestQuote) continue;
      await modelContext.registerTool(descriptors[name], { signal: controller.signal });
      registeredTools.push(name); emit({ name: 'tool_registered', tool: name });
    }
    return { supported: true, registeredTools, dispose: () => controller.abort() };
  }};
  function descriptor(name: WebMcpToolName, description: string, annotations: WebMcpToolDescriptor['annotations'], execute: (args: Record<string, unknown>, signal: AbortSignal) => Promise<unknown>): WebMcpToolDescriptor {
    return { name, description, inputSchema: SCHEMAS[name], annotations, async execute(args) { try { emit({ name: 'tool_called', tool: name }); return asObject(await execute(args, activeSignal ?? new AbortController().signal)); } catch (error) { const code = error instanceof Error ? error.message : 'TOOL_FAILED'; emit({ name: 'tool_failed', tool: name, code }); return { code, nextAction: 'Review the request and try again.' }; } } };
  }
}

function asObject(value: unknown): Record<string, unknown> { return value && typeof value === 'object' ? value as Record<string, unknown> : { value }; }
function stringArg(args: Record<string, unknown>, key: string, max: number): string { const value = args[key]; if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('INVALID_INPUT'); return value.trim(); }
function optionalStringArg(args: Record<string, unknown>, key: string, max: number): string | undefined { return args[key] === undefined ? undefined : stringArg(args, key, max); }
function numberArg(args: Record<string, unknown>, key: string): number | undefined { const value = args[key]; if (value === undefined) return undefined; if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) throw new Error('INVALID_INPUT'); return value; }
function linesArg(args: Record<string, unknown>): Array<{ productId: string; quantity: number }> { const value = args.lines; if (!Array.isArray(value) || value.length === 0 || value.length > 20) throw new Error('INVALID_INPUT'); return value.map((line) => { if (!line || typeof line !== 'object') throw new Error('INVALID_INPUT'); const candidate = line as Record<string, unknown>; return { productId: stringArg(candidate, 'productId', 120), quantity: numberArg(candidate, 'quantity') ?? 1 }; }); }
