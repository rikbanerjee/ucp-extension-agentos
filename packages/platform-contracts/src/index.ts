export type StorefrontMode = 'owned' | 'marketplace_bridge';
export type AgentChannel = 'ucp' | 'mcp' | 'webmcp' | 'feed' | 'schema_org' | 'human_ui';
export interface MerchantTenant { id: string; name: string; mode: StorefrontMode; status: 'draft' | 'active'; }
export interface CommerceConnection { id: string; tenantId: string; connectorKind: string; status: 'disconnected' | 'connected' | 'needs_reauthorization'; }
export interface CatalogSnapshot<TProduct = unknown> { id: string; tenantId: string; connectionId: string; capturedAt: string; products: TProduct[]; }
export interface PolicyProfile { id: string; tenantId: string; merchantProfileId: string; version: string; }
export interface AgentDeployment { id: string; tenantId: string; mode: StorefrontMode; channels: AgentChannel[]; enabled: boolean; }
export interface AgentEvent { type: 'catalog_synced' | 'offer_evaluated' | 'cart_prepared' | 'quote_requested' | 'checkout_handoff'; tenantId: string; occurredAt: string; code: string; }
export interface CheckoutAttribution { tenantId: string; cartReference: string; channel: AgentChannel; handoffUrl?: string; confirmedByHuman: boolean; }
export interface ConnectorCapabilities { oauth: boolean; catalogSync: boolean; inventorySync: boolean; orderSync: boolean; webhooks: boolean; checkoutHandoff: boolean; }
export interface AuthorizationInput { redirectUri: string; authorizationCode?: string; }
export interface ConnectorPage<T> { items: T[]; nextCursor?: string; }
export interface SourceOrder { id: string; status: string; }
export interface IncomingWebhook { headers: Record<string, string>; body: string; }
export interface VerifiedConnectorEvent { eventId: string; type: string; occurredAt: string; }
export interface CommerceConnector<TConnection, TSourceProduct> {
  kind: string; capabilities: ConnectorCapabilities;
  connect(input: AuthorizationInput): Promise<TConnection>;
  refresh(connection: TConnection): Promise<TConnection>;
  listProducts(connection: TConnection, cursor?: string): Promise<ConnectorPage<TSourceProduct>>;
  listOrders?(connection: TConnection, cursor?: string): Promise<ConnectorPage<SourceOrder>>;
  verifyWebhook?(request: IncomingWebhook): Promise<VerifiedConnectorEvent>;
}
export interface MerchantCatalogAdapter<TSource, TCanonical> { toCanonical(source: TSource): TCanonical[]; }
export interface TenantRepository { getTenant(id: string): Promise<MerchantTenant | undefined>; saveSnapshot(snapshot: CatalogSnapshot): Promise<void>; }

export function validateTenant(value: unknown): value is MerchantTenant {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.name === 'string' && (record.mode === 'owned' || record.mode === 'marketplace_bridge') && (record.status === 'draft' || record.status === 'active');
}
export function supports(connection: Pick<CommerceConnector<unknown, unknown>, 'capabilities'>, capability: keyof ConnectorCapabilities): boolean { return connection.capabilities[capability]; }
