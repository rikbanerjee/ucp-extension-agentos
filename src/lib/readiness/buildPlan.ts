/**
 * The ordered Build Plan checklist — same analysis as the Executive Summary,
 * different presentation (product brief §7 "Do not run separate analyses").
 */

import type { StudioSession, ReadinessStatus, FindingOwner } from './types';
import { hasCandidateEndpoints } from './ucpProfileDraft';

export interface BuildPlanItem {
  id: string;
  task: string;
  why: string;
  owner: FindingOwner;
  status: ReadinessStatus;
  artifact?: string;
}

export function buildBuildPlan(session: StudioSession): BuildPlanItem[] {
  const hasCatalog = (session.importResult?.rows.length ?? 0) > 0;
  const catalogClean = (session.importResult?.blocking.length ?? 0) === 0 && hasCatalog;
  const hasStore = Boolean(session.storeProfile?.storeName && session.storeProfile?.storeDomain);
  const endpointsProvided = session.storeProfile ? hasCandidateEndpoints(session.storeProfile) : false;

  const items: BuildPlanItem[] = [
    {
      id: 'import-catalog',
      task: 'Import and clean your product catalog',
      why: 'An AI shopper can only reason about products it can read. Blocking issues (missing prices, duplicate IDs) must be fixed first.',
      owner: 'retail_sme',
      status: catalogClean ? 'ready' : 'needs_input',
      artifact: 'raos-catalog.json',
    },
    {
      id: 'describe-store',
      task: 'Describe your store (domain, currency, timezone, regions, fulfilment modes)',
      why: 'Pricing, fulfilment and region rules cannot be evaluated without these basic facts.',
      owner: 'retail_sme',
      status: hasStore ? 'ready' : 'needs_input',
    },
    {
      id: 'set-rules',
      task: 'Set store-wide eligibility, pricing, inventory and fulfilment rules',
      why: 'These defaults let the decision engine answer "who can buy this, at what price, and can it be fulfilled" without configuring every product one by one.',
      owner: 'product_operations',
      status: hasStore ? 'ready' : 'needs_input',
    },
    {
      id: 'product-exceptions',
      task: 'Add exceptions for products that differ from your store defaults',
      why: 'A handful of products usually need different rules (wholesale-only, local-delivery-only, minimum order quantities).',
      owner: 'product_operations',
      status: 'ready',
    },
    {
      id: 'preview-decisions',
      task: 'Preview AI shopping decisions for representative buyer scenarios',
      why: 'Confirms the rules you set actually produce the outcome you intend, before anything goes live.',
      owner: 'retail_sme',
      status: catalogClean && hasStore ? 'ready' : 'needs_input',
    },
    {
      id: 'ucp-profile',
      task: 'Prepare a draft UCP capability profile',
      why: 'This is the shape a UCP-conformant endpoint would publish. It is a starting point for your developer or platform, not a live endpoint.',
      owner: 'retail_sme',
      status: catalogClean ? 'ready_to_implement' : 'needs_input',
      artifact: 'ucp-profile.draft.json',
    },
    {
      id: 'expose-endpoints',
      task: 'Expose live catalog, cart and checkout endpoints',
      why: 'Without live endpoints, no agent can actually transact with your store — this is the step that turns a plan into a working integration.',
      owner: endpointsProvided ? 'site_admin' : 'platform',
      status: endpointsProvided ? 'needs_live_verification' : 'needs_platform_installation',
    },
    {
      id: 'verify-endpoints',
      task: 'Verify endpoints against UCP conformance tests',
      why: 'A live endpoint that has not been checked against the specification cannot be called "UCP compatible."',
      owner: 'developer',
      status: 'needs_live_verification',
    },
    {
      id: 'connect-checkout',
      task: 'Connect checkout to your commerce platform',
      why: 'The Studio never executes a real checkout — this remains an installation step for your platform or engineering team.',
      owner: 'platform',
      status: 'needs_platform_installation',
    },
    {
      id: 'download-kit',
      task: 'Download the implementation kit and hand it to your team',
      why: 'Gives your developer, site administrator or platform everything generated in this session in one place.',
      owner: 'retail_sme',
      status: catalogClean ? 'ready' : 'needs_input',
      artifact: 'executive-summary.md, implementation-plan.md, ucp-profile.draft.json, ucp-readiness.json, raos-merchant-profile.json, raos-catalog.json, schema-org-products.jsonl, product-feed.csv',
    },
  ];

  return items;
}
