/**
 * Client-side generation of the eight implementation-kit artifacts. Every
 * function here is pure (input → string) so it can be unit tested without a
 * browser, and so re-downloading without changing the analysis produces
 * equivalent content (product brief §6). Blob URL creation happens in the
 * UI layer, not here.
 *
 * No secrets, no shopper personal data, no private keys are ever included.
 */

import { toSchemaOrgProduct, toProductFeed } from '@retailagentos/engine';
import type { StudioSession, LayeredReadinessResult, CanonicalCatalogRow } from './types';
import { toMerchantProfile, toVariant } from './engineConversion';
import { buildOfficialUcpProfileDraft, OFFICIAL_UCP_PINNED_VERSION } from './ucpProfileDraft';
import { buildExecutiveAnswers, topGaps } from './readinessAnalysis';
import { buildBuildPlan } from './buildPlan';

const J = (value: unknown) => JSON.stringify(value, null, 2);

function sortedRows(session: StudioSession): CanonicalCatalogRow[] {
  return [...(session.importResult?.rows ?? [])].sort((a, b) =>
    a.productId.localeCompare(b.productId) || a.variantId.localeCompare(b.variantId));
}

// ---------------------------------------------------------------------------
// 1. executive-summary.md
// ---------------------------------------------------------------------------

export function generateExecutiveSummaryMd(session: StudioSession, result: LayeredReadinessResult): string {
  const answers = buildExecutiveAnswers(session, result);
  const gaps = topGaps(result);
  const store = session.storeProfile;

  const lines: string[] = [
    `# Executive Summary — ${store?.storeName || 'Your store'}`,
    '',
    `Generated: ${result.generatedAt}`,
    '',
    '## Right product. Right price. A cart that works.',
    '',
    'UCP gives an AI agent a standard way to discover and transact with your store. RetailAgentOS adds the merchant-specific decisions — product, price, eligibility, inventory and fulfilment — an agent needs before it creates a cart. They are complementary layers, not competing protocols.',
    '',
    '## The five questions',
    '',
    ...answers.flatMap((a) => [`### ${a.question}`, '', a.answer, '']),
    '## Highest-impact gaps',
    '',
    ...(gaps.length
      ? gaps.map((g) => `- **${g.title}** — ${g.explanation} _Next: ${g.nextAction}_`)
      : ['- No blocking gaps found in this analysis.']),
    '',
    '## What your retail team can do now',
    '',
    '- Finish cleaning up your catalog and store rules in the Readiness Studio.',
    '- Review product exceptions and confirm they match how you actually sell.',
    '- Share this kit with whoever manages your site or commerce platform.',
    '',
    '## What your platform or site team does once',
    '',
    '- Expose live catalog, cart and checkout endpoints.',
    '- Verify those endpoints against UCP conformance tests.',
    '- Connect checkout to your commerce platform.',
    '',
    '## Next best action',
    '',
    result.ucp.status === 'needs_platform_installation'
      ? 'Hand `ucp-profile.draft.json` and `implementation-plan.md` to your site administrator, commerce platform, or developer to expose live endpoints.'
      : 'Have your site administrator or commerce platform verify your candidate endpoints, then re-run conformance checks.',
    '',
    '_No developer was required to produce this analysis. A site administrator, commerce platform, or engineering team may still be needed to expose live endpoints and connect checkout._',
    '',
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// 2. implementation-plan.md
// ---------------------------------------------------------------------------

const STATUS_LABEL: Record<string, string> = {
  ready: 'Ready',
  needs_input: 'Needs input',
  ready_to_implement: 'Ready to implement',
  needs_platform_installation: 'Needs platform installation',
  needs_live_verification: 'Needs live verification',
  not_applicable: 'Not applicable',
};

const OWNER_LABEL: Record<string, string> = {
  retail_sme: 'Retail SME',
  product_operations: 'Product/Operations',
  site_admin: 'Site Administrator',
  platform: 'Commerce Platform',
  developer: 'Developer',
};

export function generateImplementationPlanMd(session: StudioSession, result: LayeredReadinessResult): string {
  const plan = buildBuildPlan(session);
  const rows = plan.map((item, i) =>
    `| ${i + 1} | ${item.task} | ${item.why} | ${OWNER_LABEL[item.owner]} | ${STATUS_LABEL[item.status]} | ${item.artifact ?? '—'} |`);

  return [
    `# Implementation Plan — ${session.storeProfile?.storeName || 'Your store'}`,
    '',
    `Generated: ${result.generatedAt}`,
    '',
    'Work a Retail SME can complete without a developer: importing and reviewing the catalog, describing the store, setting rules and exceptions, and previewing decisions.',
    '',
    'Work requiring installation by a platform, administrator, or developer: exposing live catalog/cart/checkout endpoints and connecting checkout.',
    '',
    'Work requiring live verification: confirming any candidate endpoints actually pass UCP conformance checks. Draft endpoints inferred from your domain are marked as drafts below and must be installed and verified before use.',
    '',
    '| # | Task | Why it matters | Owner | Status | Artifact |',
    '|---|------|-----------------|-------|--------|----------|',
    ...rows,
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// 3. ucp-profile.draft.json
// ---------------------------------------------------------------------------

export function generateUcpProfileDraftJson(session: StudioSession): string {
  if (!session.storeProfile) return J({ error: 'Store profile not yet provided.' });
  return J(buildOfficialUcpProfileDraft(session.storeProfile));
}

// ---------------------------------------------------------------------------
// 4. ucp-readiness.json
// ---------------------------------------------------------------------------

export function generateUcpReadinessJson(session: StudioSession, result: LayeredReadinessResult): string {
  return J({
    generatedAt: result.generatedAt,
    officialUcpSpecPinned: {
      version: OFFICIAL_UCP_PINNED_VERSION,
      sources: [
        'https://ucp.dev/documentation/core-concepts/',
        'https://ucp.dev/specification/checkout/',
      ],
    },
    status: result.ucp.status,
    findings: result.ucp.findings,
    note: 'This status reflects catalog + draft-profile readiness only. It is never a claim of live UCP compatibility — that requires live endpoint verification.',
  });
}

// ---------------------------------------------------------------------------
// 5. raos-merchant-profile.json
// ---------------------------------------------------------------------------

export function generateRaosMerchantProfileJson(session: StudioSession): string {
  if (!session.storeProfile) return J({ error: 'Store profile not yet provided.' });
  return J(toMerchantProfile(session.storeProfile, session.ruleDefaults));
}

// ---------------------------------------------------------------------------
// 6. raos-catalog.json
// ---------------------------------------------------------------------------

export function generateRaosCatalogJson(session: StudioSession): string {
  if (!session.storeProfile) return J({ variants: [] });
  const store = session.storeProfile;
  const rows = sortedRows(session);
  const variants = rows.map((r) => toVariant(r, store, session.ruleDefaults, session.overrides));
  return J({ variants });
}

// ---------------------------------------------------------------------------
// 7. schema-org-products.jsonl
// ---------------------------------------------------------------------------

export function generateSchemaOrgJsonl(session: StudioSession): string {
  if (!session.storeProfile) return '';
  const store = session.storeProfile;
  const rows = sortedRows(session);
  return rows
    .map((r) => toVariant(r, store, session.ruleDefaults, session.overrides))
    // Closes the projection gap: previously this always shipped the pilot's
    // hard-coded ['US', 'CA'] shipping regions regardless of what the
    // retailer actually serves. Now it uses the store's own selected regions.
    .map((v) => JSON.stringify(toSchemaOrgProduct(v, { shippingRegions: store.regions })))
    .join('\n') + (rows.length ? '\n' : '');
}

// ---------------------------------------------------------------------------
// 8. product-feed.csv
// ---------------------------------------------------------------------------

function csvEscape(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function generateProductFeedCsv(session: StudioSession): string {
  if (!session.storeProfile) return '';
  const store = session.storeProfile;
  const rows = sortedRows(session);
  const variants = rows.map((r) => toVariant(r, store, session.ruleDefaults, session.overrides));
  const feed = toProductFeed(variants, { shipsToRegions: store.regions });
  const headers = ['id', 'title', 'price', 'availability', 'sku', 'currency', 'call_for_price', 'ships_to'];
  const lines = [headers.join(',')];
  for (const row of feed) {
    lines.push(headers.map((h) => csvEscape((row as unknown as Record<string, unknown>)[h])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------------------
// All artifacts, in stable order
// ---------------------------------------------------------------------------

export interface GeneratedArtifact {
  filename: string;
  content: string;
  mimeType: string;
}

export function generateAllArtifacts(session: StudioSession, result: LayeredReadinessResult): GeneratedArtifact[] {
  return [
    { filename: 'executive-summary.md', content: generateExecutiveSummaryMd(session, result), mimeType: 'text/markdown' },
    { filename: 'implementation-plan.md', content: generateImplementationPlanMd(session, result), mimeType: 'text/markdown' },
    { filename: 'ucp-profile.draft.json', content: generateUcpProfileDraftJson(session), mimeType: 'application/json' },
    { filename: 'ucp-readiness.json', content: generateUcpReadinessJson(session, result), mimeType: 'application/json' },
    { filename: 'raos-merchant-profile.json', content: generateRaosMerchantProfileJson(session), mimeType: 'application/json' },
    { filename: 'raos-catalog.json', content: generateRaosCatalogJson(session), mimeType: 'application/json' },
    { filename: 'schema-org-products.jsonl', content: generateSchemaOrgJsonl(session), mimeType: 'application/jsonl' },
    { filename: 'product-feed.csv', content: generateProductFeedCsv(session), mimeType: 'text/csv' },
  ];
}
