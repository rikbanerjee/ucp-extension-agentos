/**
 * WP-02: Tests for GET /.well-known/ucp route handler
 *
 * Tests the handler function directly (no HTTP server), verifying:
 *   - Each merchant archetype returns its manifest with correct tier + capabilities[]
 *   - Unknown merchant ID falls back to boutique archetype
 *   - Missing ?merchant= param falls back to boutique archetype
 *   - Response headers: Cache-Control: no-store
 *
 * Strategy: import and call GET() directly with a constructed NextRequest.
 * NextRequest is a subclass of the web-standard Request and accepts a URL string.
 */

import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import { mockMerchants } from '@/lib/mock/merchants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(url: string): NextRequest {
  return new NextRequest(url);
}

async function callGet(url: string): Promise<{ body: unknown; headers: Headers; status: number }> {
  const req = makeRequest(url);
  const res = await GET(req);
  const body = await res.json();
  return { body, headers: res.headers, status: res.status };
}

// ---------------------------------------------------------------------------
// Archetype expectations
// ---------------------------------------------------------------------------

const boutique = mockMerchants.find(m => m.merchantId === 'm_boutique_001')!;
const wholesale = mockMerchants.find(m => m.merchantId === 'm_wholesale_002')!;
const grocery = mockMerchants.find(m => m.merchantId === 'm_grocery_003')!;

const boutiqueNamespaces = boutique.manifest.capabilities.map(c => c.namespace);
const wholesaleNamespaces = wholesale.manifest.capabilities.map(c => c.namespace);
const groceryNamespaces = grocery.manifest.capabilities.map(c => c.namespace);

describe('GET /.well-known/ucp', () => {
  // ---------------------------------------------------------------------------
  // Boutique archetype (default)
  // ---------------------------------------------------------------------------

  it('returns boutique manifest when ?merchant=m_boutique_001', async () => {
    const { body, status } = await callGet('https://demo.test/.well-known/ucp?merchant=m_boutique_001');
    expect(status).toBe(200);
    const manifest = body as typeof boutique.manifest;
    // WP-04 (RAOS-0002): boutique declares member_pricing → headline tier upgraded to 2.
    expect(manifest.tier).toBe(2);
    expect(manifest.protocol).toBe('1.0');
  });

  it('boutique manifest includes eligibility + visibility namespaces', async () => {
    const { body } = await callGet('https://demo.test/.well-known/ucp?merchant=m_boutique_001');
    const manifest = body as typeof boutique.manifest;
    const ns = manifest.capabilities.map((c: { namespace?: string }) => c.namespace);
    expect(ns).toContain('com.os.retailagent.shopping.eligibility');
    expect(ns).toContain('com.os.retailagent.shopping.visibility');
  });

  it('boutique manifest does NOT include bulk_pricing or promo_pricing', async () => {
    const { body } = await callGet('https://demo.test/.well-known/ucp?merchant=m_boutique_001');
    const manifest = body as typeof boutique.manifest;
    const ns = manifest.capabilities.map((c: { namespace?: string }) => c.namespace);
    expect(ns).not.toContain('com.os.retailagent.shopping.bulk_pricing');
    expect(ns).not.toContain('com.os.retailagent.shopping.promo_pricing');
  });

  it('boutique capabilities match mock data exactly', async () => {
    const { body } = await callGet('https://demo.test/.well-known/ucp?merchant=m_boutique_001');
    const manifest = body as typeof boutique.manifest;
    const ns = manifest.capabilities.map((c: { namespace?: string }) => c.namespace).filter(Boolean);
    // Order-insensitive comparison
    expect(ns.sort()).toEqual(boutiqueNamespaces.filter(Boolean).sort());
  });

  // ---------------------------------------------------------------------------
  // Wholesale archetype
  // ---------------------------------------------------------------------------

  it('returns wholesale manifest when ?merchant=m_wholesale_002', async () => {
    const { body, status } = await callGet('https://demo.test/.well-known/ucp?merchant=m_wholesale_002');
    expect(status).toBe(200);
    const manifest = body as typeof wholesale.manifest;
    expect(manifest.tier).toBe(2);
  });

  it('wholesale manifest includes bulk_pricing and member_pricing', async () => {
    const { body } = await callGet('https://demo.test/.well-known/ucp?merchant=m_wholesale_002');
    const manifest = body as typeof wholesale.manifest;
    const ns = manifest.capabilities.map((c: { namespace?: string }) => c.namespace);
    expect(ns).toContain('com.os.retailagent.shopping.bulk_pricing');
    expect(ns).toContain('com.os.retailagent.shopping.member_pricing');
  });

  it('wholesale capabilities match mock data exactly', async () => {
    const { body } = await callGet('https://demo.test/.well-known/ucp?merchant=m_wholesale_002');
    const manifest = body as typeof wholesale.manifest;
    const ns = manifest.capabilities.map((c: { namespace?: string }) => c.namespace).filter(Boolean);
    expect(ns.sort()).toEqual(wholesaleNamespaces.filter(Boolean).sort());
  });

  // ---------------------------------------------------------------------------
  // Grocery archetype
  // ---------------------------------------------------------------------------

  it('returns grocery manifest when ?merchant=m_grocery_003', async () => {
    const { body, status } = await callGet('https://demo.test/.well-known/ucp?merchant=m_grocery_003');
    expect(status).toBe(200);
    const manifest = body as typeof grocery.manifest;
    // WP-04 (RAOS-0002): grocery adds member_pricing + bulk_pricing → headline tier 3 (Member-aware).
    expect(manifest.tier).toBe(3);
  });

  it('grocery manifest includes promo_pricing and fulfillment_constraints', async () => {
    const { body } = await callGet('https://demo.test/.well-known/ucp?merchant=m_grocery_003');
    const manifest = body as typeof grocery.manifest;
    const ns = manifest.capabilities.map((c: { namespace?: string }) => c.namespace);
    expect(ns).toContain('com.os.retailagent.shopping.promo_pricing');
    expect(ns).toContain('com.os.retailagent.shopping.fulfillment_constraints');
  });

  it('grocery capabilities match mock data exactly', async () => {
    const { body } = await callGet('https://demo.test/.well-known/ucp?merchant=m_grocery_003');
    const manifest = body as typeof grocery.manifest;
    const ns = manifest.capabilities.map((c: { namespace?: string }) => c.namespace).filter(Boolean);
    expect(ns.sort()).toEqual(groceryNamespaces.filter(Boolean).sort());
  });

  // ---------------------------------------------------------------------------
  // Fallback behavior
  // ---------------------------------------------------------------------------

  it('unknown ?merchant= value falls back to boutique (default)', async () => {
    const { body, status } = await callGet('https://demo.test/.well-known/ucp?merchant=m_unknown_999');
    expect(status).toBe(200);
    const manifest = body as typeof boutique.manifest;
    expect(manifest.tier).toBe(boutique.manifest.tier);
    const ns = manifest.capabilities.map((c: { namespace?: string }) => c.namespace).filter(Boolean);
    expect(ns.sort()).toEqual(boutiqueNamespaces.filter(Boolean).sort());
  });

  it('missing ?merchant= param falls back to boutique (default)', async () => {
    const { body, status } = await callGet('https://demo.test/.well-known/ucp');
    expect(status).toBe(200);
    const manifest = body as typeof boutique.manifest;
    expect(manifest.tier).toBe(boutique.manifest.tier);
  });

  // ---------------------------------------------------------------------------
  // Response headers
  // ---------------------------------------------------------------------------

  it('response has Cache-Control: no-store', async () => {
    const { headers } = await callGet('https://demo.test/.well-known/ucp?merchant=m_boutique_001');
    expect(headers.get('cache-control')).toBe('no-store');
  });

  it('response has Content-Type: application/json', async () => {
    const { headers } = await callGet('https://demo.test/.well-known/ucp?merchant=m_boutique_001');
    const ct = headers.get('content-type') ?? '';
    expect(ct).toContain('application/json');
  });

  // ---------------------------------------------------------------------------
  // Manifest shape invariants
  // ---------------------------------------------------------------------------

  it('every capability in every archetype has a namespace field', async () => {
    const merchants = ['m_boutique_001', 'm_wholesale_002', 'm_grocery_003'];
    for (const id of merchants) {
      const { body } = await callGet(`https://demo.test/.well-known/ucp?merchant=${id}`);
      const manifest = body as { capabilities: Array<Record<string, unknown>> };
      for (const cap of manifest.capabilities) {
        expect(typeof cap.namespace).toBe('string');
        expect((cap.namespace as string).length).toBeGreaterThan(0);
      }
    }
  });

  it('every manifest has protocol and tier fields', async () => {
    const merchants = ['m_boutique_001', 'm_wholesale_002', 'm_grocery_003'];
    for (const id of merchants) {
      const { body } = await callGet(`https://demo.test/.well-known/ucp?merchant=${id}`);
      const manifest = body as { protocol: unknown; tier: unknown };
      expect(typeof manifest.protocol).toBe('string');
      expect(typeof manifest.tier).toBe('number');
    }
  });
});
