'use client';

import type { CartResult, JsonObject, PlanDecision, QuoteResult, ReviseCartResult, RetailAgentGateway } from '../../../packages/webmcp/src';
import type { ShowcaseStoreId } from './gateway';

async function post<T>(url: string, body: unknown, storefrontId: ShowcaseStoreId, storefrontSessionId: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-raos-storefront': storefrontId, 'x-raos-storefront-session': storefrontSessionId }, body: JSON.stringify(body), signal });
  const result = await response.json() as T & { code?: string };
  if (!response.ok) throw new Error(result.code ?? 'REQUEST_FAILED');
  return result;
}

/** Same-origin adapter: the descriptor package owns every agent-caused request. */
export function createShowcaseBrowserGateway(storefrontId: ShowcaseStoreId, storefrontSessionId: string): RetailAgentGateway {
  return {
    getStorefrontCapabilities: ({ signal } = {}) => post<JsonObject>('/api/showcase/capabilities', {}, storefrontId, storefrontSessionId, signal),
    searchCatalog: (input, { signal } = {}) => post<JsonObject>('/api/showcase/products/search', input, storefrontId, storefrontSessionId, signal),
    evaluateShoppingPlan: (input, { signal } = {}) => post<PlanDecision>('/api/showcase/plans/evaluate', input, storefrontId, storefrontSessionId, signal),
    findValidAlternatives: (input, { signal } = {}) => post('/api/showcase/plans/alternatives', input, storefrontId, storefrontSessionId, signal),
    applyPlanRepair: (input, { signal } = {}) => post('/api/showcase/plans/repairs', input, storefrontId, storefrontSessionId, signal),
    prepareValidatedCart: (input, { signal } = {}) => post<CartResult>('/api/showcase/carts/prepare', input, storefrontId, storefrontSessionId, signal),
    requestQuote: (input, { signal } = {}) => post<QuoteResult>('/api/showcase/quotes/request', input, storefrontId, storefrontSessionId, signal),
    // The optional cart-revision extension only exists for the controlled Fresh Corner showcase —
    // TheCustomHub never receives this method, so it can never be registered as a WebMCP tool for it.
    ...(storefrontId === 'fresh-corner' ? { reviseValidatedCart: (input: Parameters<NonNullable<RetailAgentGateway['reviseValidatedCart']>>[0], { signal }: { signal?: AbortSignal } = {}) => post<ReviseCartResult>('/api/showcase/carts/revise', input, storefrontId, storefrontSessionId, signal) } : {}),
  };
}
