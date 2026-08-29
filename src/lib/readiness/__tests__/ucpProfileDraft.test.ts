import { describe, it, expect } from 'vitest';
import { buildOfficialUcpProfileDraft, OFFICIAL_UCP_SERVICE_NAMESPACE, OFFICIAL_UCP_CHECKOUT_NAMESPACE, OFFICIAL_UCP_PINNED_VERSION } from '../ucpProfileDraft';
import { validateOfficialUcpBusinessProfile } from '../ucpBusinessProfileSchema';
import { DEFAULT_STORE_PROFILE } from '../types';
import type { StoreProfile } from '../types';

describe('buildOfficialUcpProfileDraft — schema fidelity (RAOS-corrective-pass)', () => {
  const store: StoreProfile = { ...DEFAULT_STORE_PROFILE, storeName: 'Rosemary & Rye', storeDomain: 'rosemaryandrye.example' };

  it('validates against the pinned official business-profile schema', () => {
    const draft = buildOfficialUcpProfileDraft(store);
    const result = validateOfficialUcpBusinessProfile(draft);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('does not carry a "status" field on the ucp wire object', () => {
    const draft = buildOfficialUcpProfileDraft(store);
    expect('status' in draft.ucp).toBe(false);
  });

  it('registers the checkout service under the dev.ucp.shopping service namespace', () => {
    const draft = buildOfficialUcpProfileDraft(store);
    expect(Object.keys(draft.ucp.services)).toContain(OFFICIAL_UCP_SERVICE_NAMESPACE);
  });

  it('registers the checkout capability under dev.ucp.shopping.checkout', () => {
    const draft = buildOfficialUcpProfileDraft(store);
    expect(Object.keys(draft.ucp.capabilities ?? {})).toContain(OFFICIAL_UCP_CHECKOUT_NAMESPACE);
  });

  it('service entries carry version/transport/endpoint and never a base_url field', () => {
    const draft = buildOfficialUcpProfileDraft(store);
    const [service] = draft.ucp.services[OFFICIAL_UCP_SERVICE_NAMESPACE];
    expect(service.version).toBe(OFFICIAL_UCP_PINNED_VERSION);
    expect(service.transport).toBe('rest');
    expect(service.endpoint).toMatch(/^https:\/\//);
    expect((service as unknown as Record<string, unknown>).base_url).toBeUndefined();
  });

  it('capability declarations are arrays, per the official schema', () => {
    const draft = buildOfficialUcpProfileDraft(store);
    expect(Array.isArray(draft.ucp.capabilities?.[OFFICIAL_UCP_CHECKOUT_NAMESPACE])).toBe(true);
  });

  it('spec/schema URLs are version-pinned paths', () => {
    const draft = buildOfficialUcpProfileDraft(store);
    const [capability] = draft.ucp.capabilities![OFFICIAL_UCP_CHECKOUT_NAMESPACE];
    expect(capability.spec).toBe(`https://ucp.dev/${OFFICIAL_UCP_PINNED_VERSION}/specification/checkout`);
    expect(capability.schema).toBe(`https://ucp.dev/${OFFICIAL_UCP_PINNED_VERSION}/schemas/shopping/checkout.json`);
  });

  it('an explicit checkout endpoint from Step 3 is used verbatim', () => {
    const draft = buildOfficialUcpProfileDraft({ ...store, checkoutEndpoint: 'https://custom.example/checkout' });
    expect(draft.ucp.services[OFFICIAL_UCP_SERVICE_NAMESPACE][0].endpoint).toBe('https://custom.example/checkout');
  });

  it('with no domain and no explicit endpoint, services is an empty (still schema-valid) object', () => {
    const draft = buildOfficialUcpProfileDraft({ ...store, storeDomain: '' });
    expect(draft.ucp.services).toEqual({});
    expect(validateOfficialUcpBusinessProfile(draft).valid).toBe(true);
  });

  it('payment_handlers key is always present (schema requires it for a business profile)', () => {
    const draft = buildOfficialUcpProfileDraft(store);
    expect(draft.ucp.payment_handlers).toEqual({});
  });

  it('keys is always an empty array', () => {
    const draft = buildOfficialUcpProfileDraft(store);
    expect(draft.keys).toEqual([]);
  });
});

describe('validateOfficialUcpBusinessProfile — negative cases', () => {
  it('rejects a document missing services', () => {
    const result = validateOfficialUcpBusinessProfile({ ucp: { version: '2026-04-08', payment_handlers: {} }, keys: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === '$.ucp.services')).toBe(true);
  });

  it('rejects a document missing payment_handlers', () => {
    const result = validateOfficialUcpBusinessProfile({ ucp: { version: '2026-04-08', services: {} }, keys: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === '$.ucp.payment_handlers')).toBe(true);
  });

  it('rejects an invalid version string', () => {
    const result = validateOfficialUcpBusinessProfile({ ucp: { version: 'v1', services: {}, payment_handlers: {} }, keys: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === '$.ucp.version')).toBe(true);
  });

  it('rejects status: "draft" as an invalid wire value (the exact defect this pass fixed)', () => {
    const result = validateOfficialUcpBusinessProfile({
      ucp: { version: '2026-04-08', status: 'draft', services: {}, payment_handlers: {} }, keys: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === '$.ucp.status')).toBe(true);
  });

  it('accepts status: "success" (a real schema value)', () => {
    const result = validateOfficialUcpBusinessProfile({
      ucp: { version: '2026-04-08', status: 'success', services: {}, payment_handlers: {} }, keys: [],
    });
    expect(result.valid).toBe(true);
  });

  it('rejects a rest service entry with no endpoint', () => {
    const result = validateOfficialUcpBusinessProfile({
      ucp: {
        version: '2026-04-08',
        services: { 'dev.ucp.shopping': [{ version: '2026-04-08', transport: 'rest' }] },
        payment_handlers: {},
      },
      keys: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path.includes('endpoint'))).toBe(true);
  });

  it('rejects a service registry key that is not a reverse-domain name', () => {
    const result = validateOfficialUcpBusinessProfile({
      ucp: {
        version: '2026-04-08',
        services: { notareversedomain: [{ version: '2026-04-08', transport: 'rest', endpoint: 'https://x.example' }] },
        payment_handlers: {},
      },
      keys: [],
    });
    expect(result.valid).toBe(false);
  });

  it('rejects a document missing keys', () => {
    const result = validateOfficialUcpBusinessProfile({ ucp: { version: '2026-04-08', services: {}, payment_handlers: {} } });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === '$.keys')).toBe(true);
  });
});
