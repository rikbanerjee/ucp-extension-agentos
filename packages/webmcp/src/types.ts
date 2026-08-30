export type WebMcpToolName = 'search_products' | 'evaluate_offer' | 'prepare_cart' | 'request_quote';
export type JsonObject = Record<string, unknown>;

export interface ProductSearchInput { query: string; limit?: number; buyerContext?: PartialBuyerContext; }
export interface ProductSearchResult { candidates: EvaluatedProduct[]; nextAction: string; code: string; }
export interface EvaluateOfferRequest { productId: string; quantity: number; buyerContext?: PartialBuyerContext; }
export interface EvaluateOfferResult { productId: string; eligible: boolean; code: string; nextAction: string; decision: CompactDecision; }
export interface PrepareCartRequest { lines: Array<{ productId: string; quantity: number }>; idempotencyKey: string; buyerContext?: PartialBuyerContext; }
export interface PrepareCartResult { cart: CartState | null; code: string; nextAction: string; decisions: CompactDecision[]; }
export interface QuoteRequestInput { productId?: string; quantity: number; requirements: string; idempotencyKey: string; buyerContext?: PartialBuyerContext; }
export interface QuoteRequestResult { requestReference: string; code: string; nextAction: string; fixedPrice: null; }
export interface PartialBuyerContext { marketRegion?: string; fulfillmentMode?: string; customerType?: string; }
export interface EvaluatedProduct { productId: string; title: string; price?: number; currency?: string; eligible: boolean; code: string; nextAction: string; }
export interface CompactDecision { productId: string; eligible: boolean; code: string; reasons: Array<{ code: string; severity: string; message: string }>; nextAction: string; }
export interface PreparedCartLine { productId: string; quantity: number; }
export interface CartState { reference: string; lines: PreparedCartLine[]; }
export interface StorefrontNotification { code: string; message: string; level: 'info' | 'success' | 'warning' | 'error'; }

export interface RetailAgentGateway {
  searchProducts(input: ProductSearchInput, options?: { signal?: AbortSignal }): Promise<ProductSearchResult>;
  evaluateOffer(input: EvaluateOfferRequest, options?: { signal?: AbortSignal }): Promise<EvaluateOfferResult>;
  prepareCart(input: PrepareCartRequest, options?: { signal?: AbortSignal }): Promise<PrepareCartResult>;
  requestQuote?(input: QuoteRequestInput, options?: { signal?: AbortSignal }): Promise<QuoteRequestResult>;
}

export interface StorefrontBridge {
  getBuyerContext(): PartialBuyerContext;
  showProduct?(productId: string): Promise<void>;
  prepareCart?(lines: PreparedCartLine[]): Promise<CartState>;
  openCheckout?(cartReference: string): Promise<void>;
  notify?(event: StorefrontNotification): void;
}

export interface WebMcpDeploymentConfig {
  tenantId: string;
  enabledTools: WebMcpToolName[];
  originAllowlist?: string[];
  maximumResults?: number;
  requireCheckoutConfirmation: true;
}

export interface WebMcpTelemetryEvent { name: 'tool_registered' | 'tool_called' | 'tool_failed'; tool: WebMcpToolName; code?: string; }
export interface WebMcpToolAnnotations { readOnlyHint: boolean; destructiveHint: boolean; openWorldHint: boolean; untrustedContentHint: boolean; }
export interface WebMcpToolDescriptor { name: WebMcpToolName; description: string; inputSchema: JsonObject; annotations: WebMcpToolAnnotations; execute(input: JsonObject): Promise<JsonObject>; }
export interface WebMcpModelContext { registerTool(tool: WebMcpToolDescriptor, options?: { signal?: AbortSignal }): Promise<void> | void; }
export interface WebMcpBrowserAdapter { getModelContext(): WebMcpModelContext | undefined; }
export interface WebMcpRegistration { supported: boolean; registeredTools: WebMcpToolName[]; dispose(): void; }
