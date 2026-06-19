/**
 * GET /.well-known/ucp
 *
 * Returns the UcpManifest for a demo merchant archetype.
 * Query param: ?merchant=<merchantId>
 *   - 'm_boutique_001'  → Boutique archetype (default when unrecognized)
 *   - 'm_wholesale_002' → Wholesale archetype
 *   - 'm_grocery_003'   → Grocery archetype
 *
 * RAOS-0000 §6: the manifest carries a headline `tier` (advisory) backed by
 * an authoritative `capabilities[]` list. Agents negotiate on capabilities[],
 * never on the tier number alone.
 *
 * Next.js 16 route handler conventions (verified against node_modules/next/dist/docs/):
 *   - Export named HTTP method functions (GET, POST, etc.)
 *   - Use `NextRequest` for query-param access via `request.nextUrl.searchParams`
 *   - Use `Response.json()` for JSON responses
 *   - Default caching for GET handlers is dynamic (no static cache opt-in needed
 *     here since data is mock and always request-evaluated)
 *
 * No caching opt-in: this handler is request-evaluated because the mock data
 * can change between dev runs and we don't want stale manifests in the demo.
 */

import type { NextRequest } from 'next/server';
import { mockMerchants } from '@/lib/mock/merchants';

// Force dynamic evaluation — no static caching (mock data, always fresh).
export const dynamic = 'force-dynamic';

/**
 * Map from query-param merchant ID to the corresponding mock merchant.
 * Fallback: boutique archetype (index 0).
 */
function getMerchantManifest(merchantId: string | null) {
  if (merchantId) {
    const found = mockMerchants.find(m => m.merchantId === merchantId);
    if (found) return found.manifest;
  }
  // Default: boutique archetype
  return mockMerchants[0].manifest;
}

export function GET(request: NextRequest) {
  const merchantId = request.nextUrl.searchParams.get('merchant');
  const manifest = getMerchantManifest(merchantId);

  return Response.json(manifest, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
    },
  });
}
