/**
 * GET /evidence/conformance.json
 *
 * Machine-readable twin of /evidence/conformance (SWP-5, EVIDENCE-PLAN E4).
 * Same generated payload the page renders — an agent (or CI check) can fetch
 * this directly instead of scraping HTML.
 *
 * Next.js 16 route-handler conventions (verified against
 * node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md
 * and 01-app/01-getting-started/15-route-handlers.md, following the same
 * pattern already used by src/app/agents.md/route.ts):
 *   - A folder literally named `conformance.json` with a `route.ts` inside
 *     serves `GET /evidence/conformance.json`. This is a distinct route
 *     segment from `evidence/conformance/page.tsx` — a route.ts cannot share
 *     a segment with a page.tsx, so the two live side by side under
 *     `evidence/`, not nested inside each other.
 *   - The payload is derived entirely from committed source (registry +
 *     golden fixtures + mock merchant manifests) with no per-request data,
 *     so `dynamic = 'force-static'` is safe — it's prerendered once at build
 *     time and served as a static asset.
 */

import { getConformancePayload } from '../conformance/data';

export const dynamic = 'force-static';

export async function GET() {
  return Response.json(getConformancePayload());
}
