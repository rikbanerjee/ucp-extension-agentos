export type WebMcpToolName = 'get_storefront_capabilities' | 'search_catalog' | 'evaluate_shopping_plan' | 'find_valid_alternatives' | 'apply_plan_repair' | 'prepare_validated_cart' | 'request_quote';
export type JsonObject = Record<string, unknown>;
export type ShowcaseState = 'initial' | 'repairable' | 'awaiting_shopper' | 'eligible' | 'quote_required' | 'quote_requested' | 'cart_prepared';
export type RegistrationSource = 'native' | 'replay';

export interface BuyerContext { marketRegion?: string; fulfillmentMode?: string; contextSource?: 'controlled_fixture' | 'verified_session' | 'unavailable' | 'not_required'; }
export interface PlanLine { productId: string; quantity: number; }
export interface DecisionProvenance { storefrontId: string; storefrontSessionId: string; catalogVersion: string; policyVersion: string; inventoryAsOf: string; evaluatedAt: string; expiresAt: string; }
export interface RepairProposal { repairId: string; title: string; changes: Array<{ field: string; from: string; to: string }>; tradeoffs: { priceDelta: number; currency: string; timingDelta: string }; resolves: string[]; introduces: string[]; resultingStatus: 'ELIGIBLE'; }
export interface PlanDecision { status: 'ELIGIBLE' | 'REPAIRABLE' | 'BLOCKED' | 'QUOTE_REQUIRED'; code: string; decisionId: string; lines: PlanLine[]; reasons: Array<{ code: string; severity: string; message: string }>; allowedNextActions: WebMcpToolName[]; nextAction: string; provenance: DecisionProvenance; alternatives: RepairProposal[]; }
export interface CartResult { storefrontId?: string; storefrontSessionId?: string; cart: { reference: string; lines: Array<PlanLine & { title?: string; price?: number }>; total?: number; currency?: string } | null; code: string; nextAction: string; decision?: PlanDecision; cartCreated?: boolean; orderPlaced?: false; checkoutAvailable: false; checkoutStarted: false; }
export interface QuoteResult { storefrontId?: string; storefrontSessionId?: string; requestReference: string; status: 'QUOTE_REQUESTED'; code: string; nextAction: string; fixedPrice: null; cartCreated: false; checkoutStarted: false; orderPlaced: false; merchantReviewRequired: true; }

export interface RetailAgentGateway {
  getStorefrontCapabilities(options?: { signal?: AbortSignal }): Promise<JsonObject>;
  searchCatalog(input: { query: string; limit?: number }, options?: { signal?: AbortSignal }): Promise<JsonObject>;
  evaluateShoppingPlan(input: { lines: PlanLine[]; budget?: { amount: number; currency: string }; requestedDeliveryWindow?: string; substitutionsAllowed?: boolean }, options?: { signal?: AbortSignal }): Promise<PlanDecision>;
  findValidAlternatives(input: { decisionId: string; lines: PlanLine[] }, options?: { signal?: AbortSignal }): Promise<{ alternatives: RepairProposal[]; decisionId: string; provenance?: DecisionProvenance }>;
  applyPlanRepair(input: { decisionId: string; repairId: string; lines: PlanLine[]; idempotencyKey: string }, options?: { signal?: AbortSignal }): Promise<{ status: 'APPLIED'; repair: RepairProposal; decision: PlanDecision; lines: PlanLine[] }>;
  prepareValidatedCart(input: { decisionId: string; lines: PlanLine[]; idempotencyKey: string }, options?: { signal?: AbortSignal }): Promise<CartResult>;
  requestQuote(input: { productId?: string; quantity: number; requirements: string; idempotencyKey: string }, options?: { signal?: AbortSignal }): Promise<QuoteResult>;
}

export interface StorefrontBridge { getBuyerContext(): BuyerContext; onDecision?(decision: PlanDecision): void; onCart?(result: CartResult): void; onQuote?(result: QuoteResult): void; requestRepairApproval?(proposal: RepairProposal, context: { decisionId: string; repairId: string; signal: AbortSignal }): Promise<'approved' | 'declined'>; onLifecycle?(event: WebMcpTelemetryEvent): void; }
export interface WebMcpToolAnnotations { readOnlyHint: boolean; untrustedContentHint: boolean; }
export interface WebMcpToolDescriptor { name: WebMcpToolName; title: string; description: string; inputSchema: JsonObject; annotations: WebMcpToolAnnotations; execute(input: JsonObject, options?: { signal?: AbortSignal; source?: RegistrationSource }): Promise<JsonObject>; }
export interface WebMcpModelContext { registerTool(tool: WebMcpToolDescriptor, options?: { signal?: AbortSignal }): Promise<void> | void; getTools?(): Promise<Array<{ name: string }> | string[]> | Array<{ name: string }> | string[]; }
export interface WebMcpBrowserAdapter { getModelContext(): WebMcpModelContext | undefined; }
export interface WebMcpTelemetryEvent { id: string; step: number; timestamp: number; tool: WebMcpToolName; source: RegistrationSource; lifecycle: 'registered' | 'invoked' | 'waiting_for_shopper' | 'completed' | 'failed' | 'cancelled' | 'unregistered' | 'registration_cleanup'; decisionCode?: string; previousState?: ShowcaseState; nextState?: ShowcaseState; registryAdded?: WebMcpToolName[]; registryRemoved?: WebMcpToolName[]; error?: string; durationMs?: number; }
export interface WebMcpRegistration { supported: boolean; readonly registeredTools: WebMcpToolName[]; getReplayTools(): WebMcpToolName[]; invoke(name: WebMcpToolName, input: JsonObject, signal?: AbortSignal): Promise<JsonObject>; setState(state: ShowcaseState): Promise<WebMcpToolName[]>; settleRegistry(): Promise<WebMcpToolName[]>; getNativeToolNames?(): Promise<string[]>; dispose(): void; }
