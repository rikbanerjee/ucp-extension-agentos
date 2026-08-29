/**
 * Official UCP business-profile draft — DISTINCT from this repo's own
 * `UcpManifest` (RetailAgentOS's own discovery/conformance model, see
 * `src/lib/types/core.ts`). Do not conflate the two: `UcpManifest` is what
 * RetailAgentOS itself serves at `/.well-known/ucp` for THIS site;
 * `OfficialUcpProfileDraft` is a best-effort DRAFT of the shape a real
 * merchant would publish per the official UCP business-profile schema,
 * generated client-side from the retailer's own Studio inputs. It has
 * never been validated against a live UCP-conformant endpoint and MUST NOT
 * be presented as proof of compatibility.
 *
 * Source of truth, fetched and hand-verified 2026-08-19 (pinned version
 * 2026-04-08 — the schemas below resolve live at these exact URLs):
 *   - https://ucp.dev/documentation/core-concepts/
 *   - https://ucp.dev/specification/checkout/
 *   - https://ucp.dev/2026-04-08/schemas/ucp.json          ($defs/business_schema, $defs/entity)
 *   - https://ucp.dev/2026-04-08/schemas/service.json      ($defs/business_schema)
 *   - https://ucp.dev/2026-04-08/schemas/capability.json   ($defs/business_schema)
 *   - https://ucp.dev/2026-04-08/schemas/shopping/checkout.json
 *
 * See `ucpBusinessProfileSchema.ts` for the pinned structural schema this
 * module's output is validated against (`ucpProfileDraft.test.ts`).
 *
 * RAOS-corrective-pass (2026-08-19) fixed five schema-fidelity defects in
 * the prior draft, each cited at the point it's fixed below:
 *   1. Removed `ucp.status: 'draft'` — `status` is a real schema field with
 *      enum `['success', 'error']`; "draft" was never a valid wire value.
 *   2. Services are now registered under the real service namespace
 *      `dev.ucp.shopping` (checkout.json's `"name"` is
 *      `dev.ucp.shopping.checkout`, but SERVICES are keyed by the shopping
 *      domain's service namespace per the fetched discovery example).
 *   3. Service entries now carry the schema's actual fields — `version`,
 *      `transport`, `endpoint` (+ optional `spec`/`schema`) — and no
 *      longer invent a `base_url` field the schema doesn't define.
 *   4. Capability declarations are arrays (`Record<namespace, Entry[]>`),
 *      matching `ucp.json`'s `additionalProperties: { items: ... }` shape
 *      for both `services` and `capabilities`.
 *   5. `spec`/`schema` URLs are version-pinned paths
 *      (`https://ucp.dev/2026-04-08/...`), not the unversioned docs pages.
 *
 * This module NEVER makes a network request — the shape below is a static,
 * version-pinned fixture, not a live schema fetch.
 */

import type { CanonicalCatalogRow, StoreProfile } from './types';

/** The date-based UCP protocol version this draft targets. */
export const OFFICIAL_UCP_PINNED_VERSION = '2026-04-08';

/** The registry key services are declared under (per the fetched discovery example — `ucp.services["dev.ucp.shopping"]`). */
export const OFFICIAL_UCP_SERVICE_NAMESPACE = 'dev.ucp.shopping';

/** The checkout capability's namespace (verbatim `"name"` in the fetched checkout.json). */
export const OFFICIAL_UCP_CHECKOUT_NAMESPACE = 'dev.ucp.shopping.checkout';

function pinnedUrl(path: string): string {
  return `https://ucp.dev/${OFFICIAL_UCP_PINNED_VERSION}/${path}`;
}

const CHECKOUT_SPEC_URL = pinnedUrl('specification/checkout');
const CHECKOUT_SCHEMA_URL = pinnedUrl('schemas/shopping/checkout.json');

// ---------------------------------------------------------------------------
// Wire shape — transcribed from ucp.json / service.json / capability.json
// (see module doc comment). Every field here is a REAL schema field; there
// is no Studio-invented field in this interface.
// ---------------------------------------------------------------------------

/** Shared entity fields (`ucp.json#/$defs/entity`). */
export interface OfficialUcpEntity {
  version: string;
  spec?: string;
  schema?: string;
  id?: string;
  config?: Record<string, unknown>;
}

/** `service.json#/$defs/business_schema` — a business-level service binding. */
export interface OfficialUcpServiceEntry extends OfficialUcpEntity {
  transport: 'rest' | 'mcp' | 'a2a' | 'embedded';
  /** Required by the schema for every transport except `embedded`. */
  endpoint?: string;
}

/** `capability.json#/$defs/business_schema` — a business-level capability declaration. */
export interface OfficialUcpCapabilityEntry extends OfficialUcpEntity {
  extends?: string | string[];
}

/** `ucp.json#/$defs/business_schema` — the merchant/business-level UCP metadata object. */
export interface OfficialUcpBusinessProfile {
  version: string;
  services: Record<string, OfficialUcpServiceEntry[]>;
  capabilities?: Record<string, OfficialUcpCapabilityEntry[]>;
  /** Required by the schema even when empty — the Studio never generates payment handlers. */
  payment_handlers: Record<string, unknown[]>;
}

/**
 * DRAFT ONLY — derived client-side from Studio inputs, never verified
 * against a live endpoint. Every consumer-facing surface must label this
 * "draft" (filename, UI copy, `ucp-readiness.json` metadata) and never
 * "compatible" or "conformant". The wire object itself (`ucp`, below)
 * carries no such label — see module doc comment fix #1.
 */
export interface OfficialUcpProfileDraft {
  ucp: OfficialUcpBusinessProfile;
  /** JWK signing keys. Always empty in a draft — the Studio never generates or handles key material. */
  keys: [];
}

/**
 * Builds a draft official-UCP business profile from Studio inputs. This is
 * NOT the RetailAgentOS `UcpManifest` — see module doc comment.
 */
export function buildOfficialUcpProfileDraft(store: StoreProfile): OfficialUcpProfileDraft {
  const host = store.storeDomain ? `https://${store.storeDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : '';
  const checkoutEndpoint = store.checkoutEndpoint || (host ? `${host}/ucp/checkout` : '');

  const services: Record<string, OfficialUcpServiceEntry[]> = {};
  if (checkoutEndpoint) {
    services[OFFICIAL_UCP_SERVICE_NAMESPACE] = [
      {
        version: OFFICIAL_UCP_PINNED_VERSION,
        transport: 'rest',
        endpoint: checkoutEndpoint,
        spec: CHECKOUT_SPEC_URL,
        schema: CHECKOUT_SCHEMA_URL,
      },
    ];
  }

  return {
    ucp: {
      version: OFFICIAL_UCP_PINNED_VERSION,
      services,
      capabilities: {
        [OFFICIAL_UCP_CHECKOUT_NAMESPACE]: [
          {
            version: OFFICIAL_UCP_PINNED_VERSION,
            spec: CHECKOUT_SPEC_URL,
            schema: CHECKOUT_SCHEMA_URL,
          },
        ],
      },
      payment_handlers: {},
    },
    keys: [],
  };
}

/** Whether the store has supplied (rather than inferred) real candidate endpoints. */
export function hasCandidateEndpoints(store: StoreProfile): boolean {
  return Boolean(store.catalogEndpoint || store.cartEndpoint || store.checkoutEndpoint);
}

/** Whether the imported catalog has enough information to prepare a UCP profile at all. */
export function catalogSufficientForProfile(rows: CanonicalCatalogRow[]): boolean {
  return rows.length > 0 && rows.every((r) => r.title && r.currency && r.price >= 0);
}
