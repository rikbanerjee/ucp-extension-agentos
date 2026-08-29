/**
 * Turns a Studio session into the two-layer readiness result (UCP + RAOS)
 * that both the Executive Summary and Build Plan views render from — one
 * analysis, two presentations (per the product brief §7).
 *
 * Pure, deterministic. `now` is only used to stamp `generatedAt`.
 */

import type {
  StudioSession,
  ReadinessFinding,
  LayeredReadinessResult,
  UcpReadinessResult,
  RaosReadinessResult,
  ReadinessStatus,
} from './types';
import { hasCandidateEndpoints, catalogSufficientForProfile } from './ucpProfileDraft';

export function analyzeReadiness(session: StudioSession, now: number): LayeredReadinessResult {
  const rows = session.importResult?.rows ?? [];
  const catalogFindings: ReadinessFinding[] = [
    ...(session.importResult?.blocking ?? []),
    ...(session.importResult?.warnings ?? []),
  ];

  const ucp = analyzeUcp(session, rows.length);
  const raos = analyzeRaos(session, rows.length);

  return {
    catalog: catalogFindings,
    ucp,
    raos,
    generatedAt: new Date(now).toISOString(),
  };
}

function analyzeUcp(session: StudioSession, rowCount: number): UcpReadinessResult {
  const findings: ReadinessFinding[] = [];

  if (rowCount === 0 || !session.storeProfile) {
    findings.push(mk('ucp-catalog-incomplete', 'needs_input', 'blocking',
      'Not enough catalog and store information yet to prepare a UCP profile.',
      'Finish importing your catalog and describing your store.', 'retail_sme'));
    return { status: 'needs_input', findings };
  }

  const rows = session.importResult?.rows ?? [];
  const sufficientCatalog = catalogSufficientForProfile(rows);

  if (!sufficientCatalog) {
    findings.push(mk('ucp-catalog-insufficient', 'needs_input', 'blocking',
      'Some catalog rows are still missing a title, price, or currency, so a complete UCP profile can’t be prepared yet.',
      'Resolve the blocking issues on the Review Catalog step.', 'retail_sme'));
  } else {
    findings.push(mk('ucp-profile-draft-ready', 'ready_to_implement', 'information',
      'Your catalog has enough information to prepare a draft UCP capability profile.',
      'Download ucp-profile.draft.json and hand it to whoever manages your site or commerce platform.', 'retail_sme'));
  }

  if (hasCandidateEndpoints(session.storeProfile)) {
    findings.push(mk('ucp-endpoints-candidate', 'needs_live_verification', 'warning',
      'You provided candidate catalog/cart/checkout endpoint URLs, but they have not been called or verified.',
      'Have your site administrator or commerce platform confirm these endpoints are live and UCP-conformant.', 'site_admin'));
  } else {
    findings.push(mk('ucp-endpoints-missing', 'needs_platform_installation', 'warning',
      'No live catalog/cart/checkout endpoints were provided. Draft URLs were generated from your domain for preview only.',
      'A site administrator, commerce platform, or developer needs to expose real UCP endpoints and update this profile.', 'platform'));
  }

  const status: ReadinessStatus = !sufficientCatalog
    ? 'needs_input'
    : hasCandidateEndpoints(session.storeProfile)
      ? 'needs_live_verification'
      : 'needs_platform_installation';

  return { status, findings };
}

function analyzeRaos(session: StudioSession, rowCount: number): RaosReadinessResult {
  const findings: ReadinessFinding[] = [];
  const blockingImportIssues = session.importResult?.blocking.length ?? 0;

  if (rowCount === 0) {
    findings.push(mk('raos-no-catalog', 'needs_input', 'blocking',
      'No catalog imported yet, so there is nothing for the decision layer to reason about.',
      'Import a catalog to continue.', 'retail_sme'));
    return { status: 'needs_input', findings };
  }

  if (blockingImportIssues > 0) {
    findings.push(mk('raos-blocking-import-issues', 'needs_input', 'blocking',
      `${blockingImportIssues} catalog row${blockingImportIssues === 1 ? '' : 's'} still ${blockingImportIssues === 1 ? 'has' : 'have'} a blocking issue.`,
      'Resolve the blocking issues on the Review Catalog step before this layer can be marked ready.', 'retail_sme'));
  }

  findings.push(mk('raos-eligibility-implemented', 'ready', 'information',
    'Buyer eligibility (who can buy) is fully implemented and was evaluated in your preview.',
    'No action needed — this is ready today.', 'retail_sme'));
  findings.push(mk('raos-pricing-implemented', 'ready', 'information',
    'Contextual pricing (member/wholesale pricing, minimums) is fully implemented and was evaluated in your preview.',
    'No action needed — this is ready today.', 'retail_sme'));
  findings.push(mk('raos-inventory-implemented', 'ready', 'information',
    'Availability is reflected using your imported inventory or your store default.',
    'No action needed — this is ready today.', 'retail_sme'));
  findings.push(mk('raos-fulfillment-implemented', 'ready', 'information',
    'Fulfillment feasibility (modes, regions, lead time) is fully implemented and was evaluated in your preview.',
    'No action needed — this is ready today.', 'retail_sme'));

  findings.push(mk('raos-promotions-not-included', 'not_applicable', 'information',
    'Promotions and loyalty pricing are not included in this version of RetailAgentOS.',
    'No action needed — these do not affect your readiness status.', 'product_operations'));
  findings.push(mk('raos-restricted-goods-not-included', 'not_applicable', 'information',
    'Restricted-goods workflows are not included in this version.',
    'No action needed — these do not affect your readiness status.', 'product_operations'));

  const status: ReadinessStatus = blockingImportIssues > 0 ? 'needs_input' : 'ready_to_implement';

  return { status, findings };
}

function mk(
  id: string,
  status: ReadinessStatus,
  severity: ReadinessFinding['severity'],
  explanation: string,
  nextAction: string,
  owner: ReadinessFinding['owner'],
): ReadinessFinding {
  const layer = id.startsWith('ucp') ? 'ucp' : id.startsWith('raos') ? 'raos' : 'catalog';
  return {
    id,
    layer,
    status,
    severity,
    title: explanation.split('.')[0],
    explanation,
    nextAction,
    owner,
  };
}

// ---------------------------------------------------------------------------
// Executive Summary derivation — same analysis, different presentation
// ---------------------------------------------------------------------------

export interface ExecutiveAnswer {
  question: string;
  answer: string;
  status: ReadinessStatus;
}

export function buildExecutiveAnswers(session: StudioSession, result: LayeredReadinessResult): ExecutiveAnswer[] {
  const rows = session.importResult?.rows ?? [];
  const hasCatalog = rows.length > 0 && (session.importResult?.blocking.length ?? 0) === 0;

  return [
    {
      question: 'Can AI shoppers understand this catalog?',
      answer: hasCatalog
        ? `Yes. ${rows.length} product variant${rows.length === 1 ? '' : 's'} were imported and normalized with no blocking issues.`
        : 'Not yet. Your catalog still has blocking issues to resolve on the Review Catalog step.',
      status: hasCatalog ? 'ready' : 'needs_input',
    },
    {
      question: 'Can they determine the correct customer price?',
      answer: hasCatalog
        ? 'Yes. Store-wide pricing rules and any product exceptions were evaluated by the real RetailAgentOS pricing engine.'
        : 'Not until the catalog is complete.',
      status: hasCatalog ? 'ready' : 'needs_input',
    },
    {
      question: 'Can they avoid products the shopper cannot buy?',
      answer: hasCatalog
        ? 'Yes. Buyer eligibility rules (guest, member, wholesale, region) are enforced by the same engine that would run in production.'
        : 'Not until the catalog is complete.',
      status: hasCatalog ? 'ready' : 'needs_input',
    },
    {
      question: 'Can they understand availability and fulfilment before checkout?',
      answer: hasCatalog
        ? 'Yes, for the rules you have described. Fulfilment modes, regions and lead time were evaluated in your preview.'
        : 'Not until the catalog is complete.',
      status: hasCatalog ? 'ready' : 'needs_input',
    },
    {
      question: 'What must happen next?',
      answer: result.ucp.status === 'needs_platform_installation'
        ? 'A site administrator, commerce platform, or developer needs to expose live UCP endpoints so agents can act on this profile.'
        : result.ucp.status === 'needs_live_verification'
          ? 'Have your site administrator or commerce platform verify the candidate endpoints you provided are live.'
          : 'Finish your catalog and store details, then download your implementation kit.',
      status: result.ucp.status,
    },
  ];
}

/** The three highest-impact gaps across both layers, stably ordered (blocking first, then by layer). */
export function topGaps(result: LayeredReadinessResult, max = 3): ReadinessFinding[] {
  const all = [...result.catalog, ...result.ucp.findings, ...result.raos.findings];
  const severityRank: Record<ReadinessFinding['severity'], number> = { blocking: 0, warning: 1, information: 2 };
  return [...all]
    .filter((f) => (
      f.status === 'needs_input'
      || f.status === 'needs_platform_installation'
      || f.status === 'needs_live_verification'
      || f.severity === 'blocking'
      || f.severity === 'warning'
    ))
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.id.localeCompare(b.id))
    .slice(0, max);
}
