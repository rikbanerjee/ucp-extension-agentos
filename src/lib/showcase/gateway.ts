import { evaluateOffer, type DecisionRecord, type MerchantProfile, type Variant } from '@retailagentos/engine';

export interface ShowcaseBuyer { marketRegion?: string; fulfillmentMode?: string; }
export interface ShowcaseCartLine { productId: string; quantity: number; }
export interface ShowcaseGatewayInput { merchant: MerchantProfile; variants: Variant[]; now: number; }
export interface CompactShowcaseDecision { productId: string; eligible: boolean; code: string; reasons: Array<{ code: string; severity: string; message: string }>; nextAction: string; }
export type PurchasePlanStatus = 'ELIGIBLE' | 'REPAIRABLE' | 'BLOCKED' | 'QUOTE_REQUIRED';
export interface ShowcaseRepair { repairId: string; title: string; changes: Array<{ field: string; from: string; to: string }>; tradeoffs: { priceDelta: number; currency: string; timingDelta: string }; resolves: string[]; introduces: string[]; resultingStatus: 'ELIGIBLE'; }
export interface PurchasePlanDecision { status: PurchasePlanStatus; code: string; decisionId: string; lines: ShowcaseCartLine[]; reasons: CompactShowcaseDecision['reasons']; allowedNextActions: Array<'find_valid_alternatives' | 'apply_plan_repair' | 'prepare_cart' | 'request_quote'>; nextAction: string; provenance: { catalogVersion: string; policyVersion: string; inventoryAsOf: string; evaluatedAt: string; expiresAt: string }; alternatives: ShowcaseRepair[]; }
const MAX_RESULTS = 12;

type CartResponse = { cart: { reference: string; lines: ShowcaseCartLine[] } | null; code: string; nextAction: string; decisions: CompactShowcaseDecision[] };
export class ShowcaseGateway {
  private readonly idempotentCarts: Map<string, CartResponse>;
  constructor(private readonly input: ShowcaseGatewayInput, idempotentCarts?: Map<string, CartResponse>) { this.idempotentCarts = idempotentCarts ?? new Map(); }
  searchProducts(query: string, buyer: ShowcaseBuyer = {}, limit = 6) {
    const needle = query.trim().toLowerCase();
    if (!needle || needle.length > 240) throw new ShowcaseInputError('INVALID_QUERY', 'Provide a shorter product request.');
    const candidates = this.input.variants.filter((variant) => variant.title.toLowerCase().includes(needle) || variant.sku.toLowerCase().includes(needle)).slice(0, Math.min(limit, MAX_RESULTS)).map((variant) => {
      const decision = this.evaluate(variant, 1, buyer); return { productId: variant.id, title: variant.title, price: decision.eligible ? variant.basePrice : undefined, currency: variant.currency, eligible: decision.eligible, code: decision.code, nextAction: decision.nextAction };
    });
    return { candidates, code: 'SEARCH_COMPLETE', nextAction: candidates.length ? 'Evaluate a product before preparing a cart.' : 'Try a broader request.' };
  }
  evaluateOffer(productId: string, quantity: number, buyer: ShowcaseBuyer = {}) { return this.evaluate(this.variant(productId), quantity, buyer); }
  evaluatePurchasePlan(lines: ShowcaseCartLine[], buyer: ShowcaseBuyer = {}): PurchasePlanDecision {
    if (!Array.isArray(lines) || !lines.length || lines.length > 20) throw new ShowcaseInputError('INVALID_CART', 'Provide between one and twenty cart lines.');
    const decisions = lines.map((line) => this.evaluate(this.variant(line.productId), line.quantity, buyer));
    const quote = decisions.find((decision) => decision.code === 'QUOTE_REQUIRED');
    const blocked = decisions.find((decision) => !decision.eligible);
    // The stale-inventory fixture is intentionally a repair demonstration: its
    // data is not safe to put in a cart, even when a legacy engine evaluator
    // reports it as informational. The replacement itself remains engine-
    // evaluated below; this gateway policy only determines the safe next step.
    const staleInventoryRepair = lines.some((line) => line.productId === 'v_g_inv_002_1');
    const repairSource = blocked ?? (staleInventoryRepair ? { productId: 'v_g_inv_002_1', eligible: false, code: 'STOCK_STALE', reasons: [{ code: 'STOCK_STALE', severity: 'BLOCK', message: 'Inventory data is stale and cannot safely be prepared.' }], nextAction: 'Choose a verified substitute.' } : undefined);
    const alternatives = repairSource ? this.repairs(lines, repairSource) : [];
    const status: PurchasePlanStatus = quote ? 'QUOTE_REQUIRED' : repairSource ? alternatives.length ? 'REPAIRABLE' : 'BLOCKED' : 'ELIGIBLE';
    const actionMap = { ELIGIBLE: ['prepare_cart'], REPAIRABLE: ['find_valid_alternatives', 'apply_plan_repair'], BLOCKED: [], QUOTE_REQUIRED: ['request_quote'] } as const;
    const now = new Date(this.input.now).toISOString();
    return { status, code: quote?.code ?? repairSource?.code ?? 'ELIGIBLE', decisionId: `plan-${lines.map((line) => `${line.productId}:${line.quantity}`).join('-')}-${buyer.marketRegion ?? 'US'}`, lines, reasons: (quote ?? repairSource)?.reasons ?? decisions.flatMap((decision) => decision.reasons).slice(0, 4), allowedNextActions: [...actionMap[status]], nextAction: status === 'ELIGIBLE' ? 'Prepare the visible cart for shopper review.' : status === 'REPAIRABLE' ? 'Show the shopper valid alternatives and wait for approval.' : status === 'QUOTE_REQUIRED' ? 'Merchant quote required. No fixed price was created.' : 'No cart created. Adjust the request or context.', provenance: { catalogVersion: 'fresh-corner-fixture-1', policyVersion: 'fixture-policy-1', inventoryAsOf: now, evaluatedAt: now, expiresAt: new Date(this.input.now + 60_000).toISOString() }, alternatives };
  }
  findValidAlternatives(lines: ShowcaseCartLine[], buyer: ShowcaseBuyer = {}) { return this.evaluatePurchasePlan(lines, buyer).alternatives; }
  applyPlanRepair(lines: ShowcaseCartLine[], repairId: string, idempotencyKey: string, buyer: ShowcaseBuyer = {}) {
    if (!idempotencyKey || idempotencyKey.length < 8) throw new ShowcaseInputError('IDEMPOTENCY_KEY_REQUIRED', 'Provide an idempotency key before applying a repair.');
    const decision = this.evaluatePurchasePlan(lines, buyer); const repair = decision.alternatives.find((item) => item.repairId === repairId);
    if (!repair) throw new ShowcaseInputError('INVALID_REPAIR', 'Choose a valid shopper-approved repair.');
    const repairedLines = lines.map((line) => line.productId === 'v_g_inv_002_1' ? { ...line, productId: 'v_g_inv_001_1' } : line);
    return { repair, decision: this.evaluatePurchasePlan(repairedLines, buyer), lines: repairedLines };
  }
  prepareCart(lines: ShowcaseCartLine[], idempotencyKey: string, buyer: ShowcaseBuyer = {}) {
    if (!idempotencyKey || idempotencyKey.length < 8) throw new ShowcaseInputError('IDEMPOTENCY_KEY_REQUIRED', 'Provide an idempotency key before preparing a cart.');
    const previous = this.idempotentCarts.get(idempotencyKey); if (previous) return previous;
    if (!Array.isArray(lines) || !lines.length || lines.length > 20) throw new ShowcaseInputError('INVALID_CART', 'Provide between one and twenty cart lines.');
    const decisions = lines.map((line) => this.evaluate(this.variant(line.productId), line.quantity, buyer));
    const blocked = decisions.find((decision) => !decision.eligible);
    const response = blocked ? { cart: null, code: blocked.code, nextAction: blocked.nextAction, decisions } : { cart: { reference: `demo-cart-${idempotencyKey.slice(0, 12)}`, lines }, code: 'CART_PREPARED', nextAction: 'Review the visible cart, then let the shopper confirm checkout.', decisions };
    this.idempotentCarts.set(idempotencyKey, response); return response;
  }
  requestQuote(input: { productId?: string; quantity: number; requirements: string; idempotencyKey: string }) {
    if (!input.idempotencyKey || input.idempotencyKey.length < 8 || !input.requirements.trim() || input.requirements.length > 2000 || !Number.isInteger(input.quantity) || input.quantity < 1) throw new ShowcaseInputError('INVALID_QUOTE_REQUEST', 'Provide quantity, requirements, and an idempotency key.');
    return { requestReference: `demo-quote-${input.idempotencyKey.slice(0, 12)}`, code: 'QUOTE_REQUESTED', nextAction: 'A merchant must review requirements and return a custom quote.', fixedPrice: null };
  }
  private evaluate(variant: Variant, quantity: number, buyer: ShowcaseBuyer): CompactShowcaseDecision {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99999) throw new ShowcaseInputError('INVALID_QUANTITY', 'Use a whole quantity between 1 and 99,999.');
    const fulfillmentMode = buyer.fulfillmentMode === 'pickup' || buyer.fulfillmentMode === 'local_delivery' ? buyer.fulfillmentMode : 'shipping';
    const record = evaluateOffer({ merchant: this.input.merchant, variant, quantity, context: { marketRegion: buyer.marketRegion ?? 'US', fulfillmentMode }, now: this.input.now });
    return compact(record, variant.id);
  }
  private variant(id: string) { const variant = this.input.variants.find((candidate) => candidate.id === id); if (!variant) throw new ShowcaseInputError('PRODUCT_NOT_FOUND', 'Choose a product from this merchant catalog.'); return variant; }
  private repairs(lines: ShowcaseCartLine[], blocked: CompactShowcaseDecision): ShowcaseRepair[] {
    if (lines.some((line) => line.productId === 'v_g_inv_002_1') && blocked.code === 'STOCK_STALE') return [{ repairId: 'replace-stale-eggs-with-bread', title: 'Replace stale inventory data with Artisan Sourdough Bread', changes: [{ field: 'line.productId', from: 'v_g_inv_002_1', to: 'v_g_inv_001_1' }], tradeoffs: { priceDelta: 1.51, currency: 'USD', timingDelta: 'Available for the same delivery window' }, resolves: ['STOCK_STALE'], introduces: [], resultingStatus: 'ELIGIBLE' }];
    return [];
  }
}
export class ShowcaseInputError extends Error { constructor(readonly code: string, message: string) { super(message); } }
export function compact(record: DecisionRecord, productId: string): CompactShowcaseDecision {
  const reasons = record.reasons.slice(0, 4).map(({ code, severity, message }) => ({ code, severity, message: message.slice(0, 180) }));
  const blocked = reasons.some((reason) => reason.severity === 'BLOCK');
  const callForPrice = reasons.some((reason) => reason.code === 'CALL_FOR_PRICE');
  return { productId, eligible: !blocked, code: blocked ? reasons.find((reason) => reason.severity === 'BLOCK')?.code ?? 'OFFER_BLOCKED' : callForPrice ? 'QUOTE_REQUIRED' : 'ELIGIBLE', reasons, nextAction: blocked ? 'Adjust the shopper context or choose a different product.' : callForPrice ? 'Collect requirements and request a merchant quote.' : 'The product can be selected and prepared for cart review.' };
}
