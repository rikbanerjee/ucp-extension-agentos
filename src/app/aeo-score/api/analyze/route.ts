/**
 * GET /aeo-score/api/analyze?url=<url>&demo=true
 *
 * AEO/GEO scoring route handler. Translates the Express GET /api/analyze
 * handler from the source project into a Next.js 16 Route Handler.
 *
 * Query params:
 *   url   — the URL to analyze (required)
 *   demo  — "true" to return a canned demo result immediately
 *
 * Next.js 16 conventions (verified in node_modules/next/dist/docs/):
 *   - Named export `GET` receives a NextRequest (Web Request extension).
 *   - Query params via `request.nextUrl.searchParams`.
 *   - Response.json() for JSON responses.
 *   - `export const dynamic = 'force-dynamic'` prevents static caching
 *     since every request fetches a live URL. The existing ucp route uses
 *     the same pattern — follow it.
 *
 * Network I/O (axios + cheerio) is entirely encapsulated in src/lib/aeo/analyzer.ts.
 * This handler is intentionally thin: validate → delegate → respond.
 */

import type { NextRequest } from 'next/server';
import {
  generateDemoData,
  performAnalysis,
} from '@/lib/aeo/analyzer';

// This handler does outbound HTTP fetches — never statically cache.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<Response> {
  const searchParams = request.nextUrl.searchParams;
  const targetUrl = searchParams.get('url');
  const isDemo = searchParams.get('demo') === 'true';

  if (!targetUrl) {
    return Response.json({ error: 'Missing parameter: url' }, { status: 400 });
  }

  // Demo mode: return canned data (no outbound network fetch).
  if (isDemo || targetUrl.includes('example-') || targetUrl.includes('demo.')) {
    const demoResult = generateDemoData(targetUrl);
    return Response.json(demoResult);
  }

  try {
    const analysis = await performAnalysis(targetUrl);
    return Response.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
