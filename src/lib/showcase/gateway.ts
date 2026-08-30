import { evaluateOffer, type DecisionRecord, type MerchantProfile, type Variant } from '@retailagentos/engine';

export interface ShowcaseBuyer { marketRegion?: string; fulfillmentMode?: string; }
export interface ShowcaseCartLine { productId: string; quantity: number; }
export interface ShowcaseGatewayInput { merchant: MerchantProfile; variants: Variant[]; now: number; }
export interface CompactShowcaseDecision { productId: string; eligible: boolean; code: string; reasons: Array<{ code: string; severity: string; message: string }>; nextAction: string; }
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
}
export class ShowcaseInputError extends Error { constructor(readonly code: string, message: string) { super(message); } }
export function compact(record: DecisionRecord, productId: string): CompactShowcaseDecision {
  const reasons = record.reasons.slice(0, 4).map(({ code, severity, message }) => ({ code, severity, message: message.slice(0, 180) }));
  const blocked = reasons.some((reason) => reason.severity === 'BLOCK');
  const callForPrice = reasons.some((reason) => reason.code === 'CALL_FOR_PRICE');
  return { productId, eligible: !blocked, code: blocked ? reasons.find((reason) => reason.severity === 'BLOCK')?.code ?? 'OFFER_BLOCKED' : callForPrice ? 'QUOTE_REQUIRED' : 'ELIGIBLE', reasons, nextAction: blocked ? 'Adjust the shopper context or choose a different product.' : callForPrice ? 'Collect requirements and request a merchant quote.' : 'The product can be selected and prepared for cart review.' };
}
