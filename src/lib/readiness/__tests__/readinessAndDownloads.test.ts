import { describe, it, expect } from 'vitest';
import { analyzeReadiness, topGaps } from '../readinessAnalysis';
import { generateAllArtifacts, generateRaosCatalogJson, generateProductFeedCsv } from '../downloads';
import { validateOfficialUcpBusinessProfile } from '../ucpBusinessProfileSchema';
import { DEFAULT_RULE_DEFAULTS, DEFAULT_STORE_PROFILE } from '../types';
import type { StudioSession, ImportResult, CanonicalCatalogRow } from '../types';

const row: CanonicalCatalogRow = {
  productId: 'p1', variantId: 'v1', sku: 'SKU-1', title: 'Widget, Deluxe',
  price: 100, currency: 'USD', inventoryQuantity: 10, sourceRowNumber: 1,
};

function makeSession(overrides: Partial<StudioSession> = {}): StudioSession {
  const importResult: ImportResult = { source: 'sample', rows: [row], blocking: [], warnings: [], unparsedRowCount: 0 };
  return {
    importResult,
    storeProfile: { ...DEFAULT_STORE_PROFILE, storeName: 'Test Store', storeDomain: 'test.example' },
    ruleDefaults: DEFAULT_RULE_DEFAULTS,
    overrides: [],
    scenario: null,
    ...overrides,
  };
}

describe('readiness analysis', () => {
  it('catalog-ready does not imply live UCP compatibility', () => {
    const result = analyzeReadiness(makeSession(), 0);
    expect(result.ucp.status).not.toBe('ready');
    expect(['needs_platform_installation', 'needs_live_verification', 'needs_input']).toContain(result.ucp.status);
  });

  it('missing endpoints produce "Needs platform installation"', () => {
    const session = makeSession();
    const result = analyzeReadiness(session, 0);
    expect(result.ucp.status).toBe('needs_platform_installation');
  });

  it('draft endpoints produce "Needs live verification"', () => {
    const session = makeSession({
      storeProfile: { ...DEFAULT_STORE_PROFILE, storeName: 'Test', storeDomain: 'test.example', catalogEndpoint: 'https://test.example/ucp/catalog' },
    });
    const result = analyzeReadiness(session, 0);
    expect(result.ucp.status).toBe('needs_live_verification');
  });

  it('implemented RetailAgentOS capabilities are recognized as ready', () => {
    const result = analyzeReadiness(makeSession(), 0);
    expect(result.raos.findings.some((f) => f.id === 'raos-eligibility-implemented' && f.status === 'ready')).toBe(true);
  });

  it('planned capabilities never produce a pass', () => {
    const result = analyzeReadiness(makeSession(), 0);
    const promo = result.raos.findings.find((f) => f.id === 'raos-promotions-not-included');
    expect(promo?.status).toBe('not_applicable');
    expect(promo?.status).not.toBe('ready');
  });

  it('unknown information (no catalog) is not silently treated as ready', () => {
    const result = analyzeReadiness(makeSession({ importResult: null }), 0);
    expect(result.raos.status).toBe('needs_input');
    expect(result.ucp.status).toBe('needs_input');
  });

  it('blocking import issues keep RAOS status at needs_input', () => {
    const session = makeSession({
      importResult: {
        source: 'sample', rows: [row], unparsedRowCount: 0, warnings: [],
        blocking: [{ id: 'x', layer: 'catalog', status: 'needs_input', severity: 'blocking', title: 't', explanation: 'e', nextAction: 'n', owner: 'retail_sme' }],
      },
    });
    const result = analyzeReadiness(session, 0);
    expect(result.raos.status).toBe('needs_input');
  });

  it('only exposes actionable blocking or warning findings as gaps', () => {
    const result = analyzeReadiness(makeSession(), 0);
    const gaps = topGaps(result);
    expect(gaps.map((finding) => finding.id)).not.toContain('ucp-profile-draft-ready');
    expect(gaps.every((finding) => ['needs_input', 'needs_platform_installation', 'needs_live_verification'].includes(finding.status))).toBe(true);
    expect(gaps.map((finding) => finding.id)).toContain('ucp-endpoints-missing');
  });

  it('orders blocking findings ahead of warnings', () => {
    const result = analyzeReadiness(makeSession({ importResult: {
      source: 'sample', rows: [row], unparsedRowCount: 0, warnings: [],
      blocking: [{ id: 'catalog-block', layer: 'catalog', status: 'needs_input', severity: 'blocking', title: 'Missing price', explanation: 'Missing price.', nextAction: 'Fix it.', owner: 'retail_sme' }],
    } }), 0);
    expect(topGaps(result)[0].severity).toBe('blocking');
  });
});

describe('downloads', () => {
  it('produces all eight artifacts when prerequisites are met', () => {
    const session = makeSession();
    const result = analyzeReadiness(session, 1755000000000);
    const artifacts = generateAllArtifacts(session, result);
    expect(artifacts.map((a) => a.filename)).toEqual([
      'executive-summary.md', 'implementation-plan.md', 'ucp-profile.draft.json', 'ucp-readiness.json',
      'raos-merchant-profile.json', 'raos-catalog.json', 'schema-org-products.jsonl', 'product-feed.csv',
    ]);
    for (const a of artifacts) expect(a.content.length).toBeGreaterThan(0);
  });

  it('RAOS files use com.os.retailagent.shopping.* namespaces', () => {
    const session = makeSession();
    const result = analyzeReadiness(session, 0);
    const profileJson = generateAllArtifacts(session, result).find((a) => a.filename === 'raos-merchant-profile.json')!.content;
    expect(profileJson).toContain('com.os.retailagent.shopping.');
    expect(profileJson).not.toContain('com.ezyupload');
  });

  it('official UCP draft uses the pinned official shape (ucp.version / ucp.capabilities) and validates against the pinned schema', () => {
    const session = makeSession();
    const result = analyzeReadiness(session, 0);
    const draft = JSON.parse(generateAllArtifacts(session, result).find((a) => a.filename === 'ucp-profile.draft.json')!.content);
    expect(draft.ucp.version).toBe('2026-04-08');
    expect(draft.ucp.capabilities['dev.ucp.shopping.checkout']).toBeInstanceOf(Array);
    expect(draft.ucp.services['dev.ucp.shopping']).toBeInstanceOf(Array);
    expect(draft.ucp.services['dev.ucp.shopping'][0]).toMatchObject({ transport: 'rest' });
    expect(draft.ucp.services['dev.ucp.shopping'][0].endpoint).toBeDefined();
    expect(draft.ucp.services['dev.ucp.shopping'][0].base_url).toBeUndefined();
    expect(draft.ucp.payment_handlers).toBeDefined();

    const validation = validateOfficialUcpBusinessProfile(draft);
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
  });

  it('the "draft" concept never appears inside the UCP wire object itself', () => {
    const session = makeSession();
    const result = analyzeReadiness(session, 0);
    const draft = JSON.parse(generateAllArtifacts(session, result).find((a) => a.filename === 'ucp-profile.draft.json')!.content);
    expect(draft.ucp.status).toBeUndefined();
    expect(JSON.stringify(draft.ucp)).not.toContain('draft');
  });

  it('escapes CSV fields containing commas and quotes correctly', () => {
    const session = makeSession();
    const csv = generateProductFeedCsv(session);
    expect(csv).toContain('"Widget, Deluxe"');
  });

  it('contains no shopper personal data or private keys', () => {
    const session = makeSession();
    const result = analyzeReadiness(session, 0);
    const artifacts = generateAllArtifacts(session, result);
    for (const a of artifacts) {
      expect(a.content.toLowerCase()).not.toContain('private_key');
      expect(a.content.toLowerCase()).not.toContain('ssn');
    }
    const ucpDraft = JSON.parse(artifacts.find((a) => a.filename === 'ucp-profile.draft.json')!.content);
    expect(ucpDraft.keys).toEqual([]);
  });

  it('re-downloading without changing the analysis produces equivalent content', () => {
    const session = makeSession();
    const result1 = analyzeReadiness(session, 1755000000000);
    const result2 = analyzeReadiness(session, 1755000000000);
    expect(generateAllArtifacts(session, result1)).toEqual(generateAllArtifacts(session, result2));
  });

  it('produces stable, deterministic catalog ordering', () => {
    const session = makeSession();
    const json1 = generateRaosCatalogJson(session);
    const json2 = generateRaosCatalogJson(session);
    expect(json1).toEqual(json2);
  });

  it('schema.org and product-feed exports use the retailer\'s own selected regions, not the pilot default (item 8)', () => {
    const session = makeSession({
      storeProfile: { ...DEFAULT_STORE_PROFILE, storeName: 'Test Store', storeDomain: 'test.example', regions: ['US', 'MX'] },
    });
    const result = analyzeReadiness(session, 0);
    const artifacts = generateAllArtifacts(session, result);

    const schemaOrgLine = artifacts.find((a) => a.filename === 'schema-org-products.jsonl')!.content.trim().split('\n')[0];
    const product = JSON.parse(schemaOrgLine);
    const countries = product.offers.shippingDetails.map((d: { shippingDestination: { addressCountry: string } }) => d.shippingDestination.addressCountry);
    expect(countries).toEqual(['US', 'MX']);
    expect(countries).not.toContain('CA');

    const csv = artifacts.find((a) => a.filename === 'product-feed.csv')!.content;
    expect(csv).toContain('US,MX');
  });
});
