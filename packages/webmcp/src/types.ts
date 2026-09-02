/** The seven canonical Phase 1 tools. Historical: this is the shipped Phase 1 descriptor catalog. */
export type CanonicalWebMcpToolName = 'get_storefront_capabilities' | 'search_catalog' | 'evaluate_shopping_plan' | 'find_valid_alternatives' | 'apply_plan_repair' | 'prepare_validated_cart' | 'request_quote';
/** Optional post-cart revision extension, added after Phase 1 shipped. Never part of the historical seven. */
export type OptionalWebMcpToolName = 'revise_validated_cart';
export type WebMcpToolName = CanonicalWebMcpToolName | OptionalWebMcpToolName;
export type JsonObject = Record<string, unknown>;
export type ShowcaseState = 'initial' | 'repairable' | 'awaiting_shopper' | 'eligible' | 'quote_required' | 'quote_requested' | 'cart_prepared';
export type RegistrationSource = 'native' | 'replay';

export interface BuyerContext { marketRegion?: string; fulfillmentMode?: string; contextSource?: 'controlled_fixture' | 'verified_session' | 'unavailable' | 'not_required'; }
export interface PlanLine { productId: string; quantity: number; }
export interface DecisionProvenance { storefrontId: string; storefrontSessionId: string; catalogVersion: string; policyVersion: string; inventoryAsOf: string; evaluatedAt: string; expiresAt: string; }
export interface RepairProposal { repairId: string; title: string; changes: Array<{ field: string; from: string; to: string }>; tradeoffs: { priceDelta: number; currency: string; timingDelta: string }; resolves: string[]; introduces: string[]; resultingStatus: 'ELIGIBLE'; }
export interface PlanDecision { status: 'ELIGIBLE' | 'REPAIRABLE' | 'BLOCKED' | 'QUOTE_REQUIRED'; code: string; decisionId: string; lines: PlanLine[]; reasons: Array<{ code: string; severity: string; message: string }>; allowedNextActions: WebMcpToolName[]; nextAction: string; provenance: DecisionProvenance; alternatives: RepairProposal[]; }
export interface ReviseCartLine extends PlanLine { title?: string; unitPrice?: number; lineTotal?: number; }
export interface ReviseCartCart { reference: string; revision: number; lines: ReviseCartLine[]; total: number; currency: string; budget?: { amount: number; currency: string }; remainingBudget?: number; fulfillment?: string; }
export interface CartResult { storefrontId?: string; storefrontSessionId?: string; cart: { reference: string; revision?: number; lines: Array<PlanLine & { title?: string; price?: number }>; total?: number; currency?: string } | null; code: string; nextAction: string; decision?: PlanDecision; cartCreated?: boolean; orderPlaced?: false; checkoutAvailable: false; checkoutStarted: false; }
export interface QuoteSizeLine { size: string; quantity: number; }
export interface QuotePersonalization { placement: string; method: string; }
export interface QuoteConfiguration { color: string; sizeBreakdown: QuoteSizeLine[]; personalization: QuotePersonalization; artworkStatus: string; }
export interface QuoteRequestedDelivery { destination: string; requestedWithinDays: number; }
export interface QuoteBudget { amount: number; currency: string; isMaximum: boolean; }
export interface QuoteRequest { productId?: string; quantity: number; configuration?: QuoteConfiguration; requestedDelivery?: QuoteRequestedDelivery; budget?: QuoteBudget; requirements: string; idempotencyKey: string; }
export interface QuoteResult { storefrontId?: string; storefrontSessionId?: string; requestReference: string; status: 'QUOTE_REQUESTED'; code: string; nextAction: string; fixedPrice: null; deliveryPromise: null; configuration?: QuoteConfiguration; requestedDelivery?: QuoteRequestedDelivery; budget?: QuoteBudget; configuredQuantity?: number; cartCreated: false; checkoutStarted: false; orderPlaced: false; paymentInitiated: false; merchantReviewRequired: true; }
/** Result of the optional `revise_validated_cart` extension tool. Never a checkout/order/payment result. */
export interface ReviseCartResult { status: 'REVISED' | 'WITHHELD' | 'REPAIR_REQUIRED' | 'QUOTE_REQUIRED'; code: string; previousCartReference?: string; cart: ReviseCartCart | null; cartCreated: boolean; cartRevised: boolean; checkoutAvailable: false; checkoutStarted: false; orderPlaced: false; paymentInitiated: false; nextAction: string; decision?: PlanDecision; }

export interface RetailAgentGateway {
  getStorefrontCapabilities(options?: { signal?: AbortSignal }): Promise<JsonObject>;
  searchCatalog(input: { query: string; limit?: number }, options?: { signal?: AbortSignal }): Promise<JsonObject>;
  evaluateShoppingPlan(input: { lines: PlanLine[]; budget?: { amount: number; currency: string }; fulfillmentMode?: string; requestedDeliveryWindow?: string; substitutionsAllowed?: boolean }, options?: { signal?: AbortSignal }): Promise<PlanDecision>;
  findValidAlternatives(input: { decisionId: string; lines: PlanLine[] }, options?: { signal?: AbortSignal }): Promise<{ alternatives: RepairProposal[]; decisionId: string; provenance?: DecisionProvenance }>;
  applyPlanRepair(input: { decisionId: string; repairId: string; lines: PlanLine[]; idempotencyKey: string }, options?: { signal?: AbortSignal }): Promise<{ status: 'APPLIED'; repair: RepairProposal; decision: PlanDecision; lines: PlanLine[] }>;
  prepareValidatedCart(input: { decisionId: string; lines: PlanLine[]; idempotencyKey: string }, options?: { signal?: AbortSignal }): Promise<CartResult>;
  requestQuote(input: QuoteRequest, options?: { signal?: AbortSignal }): Promise<QuoteResult>;
  /** Optional post-cart revision extension. Absent/unimplemented for storefronts that never expose it (e.g. TheCustomHub). */
  reviseValidatedCart?(input: { cartReference: string; expectedRevision: number; lines: PlanLine[]; idempotencyKey: string }, options?: { signal?: AbortSignal }): Promise<ReviseCartResult>;
}

export interface StorefrontBridge { getBuyerContext(): BuyerContext; onDecision?(decision: PlanDecision): void; onCart?(result: CartResult): void; onQuote?(result: QuoteResult): void; onCartRevision?(result: ReviseCartResult): void; requestRepairApproval?(proposal: RepairProposal, context: { decisionId: string; repairId: string; signal: AbortSignal }): Promise<'approved' | 'declined'>; onLifecycle?(event: WebMcpTelemetryEvent): void; }
export interface WebMcpToolAnnotations { readOnlyHint: boolean; untrustedContentHint: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean; }
export interface WebMcpToolDescriptor { name: WebMcpToolName; title: string; description: string; inputSchema: JsonObject; annotations: WebMcpToolAnnotations; execute(input: JsonObject, options?: { signal?: AbortSignal; source?: RegistrationSource }): Promise<JsonObject>; }
export interface WebMcpModelContext { registerTool(tool: WebMcpToolDescriptor, options?: { signal?: AbortSignal }): Promise<void> | void; getTools?(): Promise<Array<{ name: string }> | string[]> | Array<{ name: string }> | string[]; }
export interface WebMcpBrowserAdapter { getModelContext(): WebMcpModelContext | undefined; }
export interface WebMcpTelemetryEvent { id: string; step: number; timestamp: number; tool: WebMcpToolName; source: RegistrationSource; lifecycle: 'registered' | 'invoked' | 'waiting_for_shopper' | 'completed' | 'failed' | 'cancelled' | 'unregistered' | 'registration_cleanup'; decisionCode?: string; previousState?: ShowcaseState; nextState?: ShowcaseState; registryAdded?: WebMcpToolName[]; registryRemoved?: WebMcpToolName[]; error?: string; durationMs?: number; }
export interface WebMcpRegistration { supported: boolean; readonly registeredTools: WebMcpToolName[]; getReplayTools(): WebMcpToolName[]; invoke(name: WebMcpToolName, input: JsonObject, signal?: AbortSignal): Promise<JsonObject>; setState(state: ShowcaseState): Promise<WebMcpToolName[]>; settleRegistry(): Promise<WebMcpToolName[]>; getNativeToolNames?(): Promise<string[]>; dispose(): void; }
