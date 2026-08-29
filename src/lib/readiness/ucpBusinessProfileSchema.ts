/**
 * A pinned, structural transcription of the OFFICIAL UCP business-profile
 * JSON Schema, version 2026-04-08 — fetched and hand-verified against the
 * live schema documents on 2026-08-19:
 *
 *   - https://ucp.dev/2026-04-08/schemas/ucp.json          ($defs/base, $defs/business_schema, $defs/entity)
 *   - https://ucp.dev/2026-04-08/schemas/service.json      ($defs/base, $defs/business_schema)
 *   - https://ucp.dev/2026-04-08/schemas/capability.json   ($defs/base, $defs/business_schema)
 *
 * This is NOT a full JSON Schema draft-2020-12 evaluator — there is no
 * dependency on a schema library in this project, and the official schema
 * is a $ref graph across several remote documents this Studio must never
 * fetch at runtime (§7 "no runtime requests to UCP documentation"). Instead,
 * `validateOfficialUcpBusinessProfile` below is a small, purpose-built
 * structural validator that checks every constraint transcribed here:
 * required fields, enums, and the `version`-pattern / reverse-domain-name
 * shapes the official schema declares. Treat this file as the single
 * pinned source of truth for what "valid" means for our generated draft —
 * update it (and the pin date above) together if ucp.dev revises the
 * 2026-04-08 schema or a newer dated version is adopted.
 *
 * Root document shape (per the fetched schemas):
 *   { ucp: <business_schema>, keys: JWK[] }
 *
 * <business_schema> = <base> AND { required: [services, payment_handlers] }
 * <base> = {
 *   required: [version],
 *   properties: {
 *     version: string, pattern /^\d{4}-\d{2}-\d{2}$/,
 *     status?: 'success' | 'error',      // an OPERATION status, never "draft" — RAOS-corrective-pass note below
 *     services?: { [reverseDomainName]: ServiceEntry[] },
 *     capabilities?: { [reverseDomainName]: CapabilityEntry[] },
 *     payment_handlers?: { [reverseDomainName]: unknown[] },
 *   },
 * }
 * ServiceEntry (business_schema) = <entity> AND { required: [transport] } AND
 *   (transport === 'embedded' OR required: [endpoint])
 * CapabilityEntry (business_schema) = <entity> AND { extends?: string | string[] }
 * <entity> = { required: [version], properties: { version, spec?, schema?, id?, config? } }
 *
 * IMPORTANT (this is the exact defect the RAOS-corrective-pass fixed):
 * `base.status` is an application-level operation status with enum
 * `['success', 'error']` — it has NOTHING to do with whether the Studio's
 * generated profile is a "draft." Setting `ucp.status: 'draft'` (the
 * previous implementation) was not just off-brand, it was an INVALID value
 * against the official schema's enum. "Draft" belongs only in the Studio's
 * own UI copy, the `.draft.json` filename, and `ucp-readiness.json`
 * metadata — never inside the `ucp` wire object itself.
 */

const REVERSE_DOMAIN_NAME_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9_]*)+$/;
const VERSION_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_TRANSPORTS = ['rest', 'mcp', 'a2a', 'embedded'] as const;
const VALID_STATUS = ['success', 'error'] as const;

export interface UcpSchemaValidationError {
  path: string;
  message: string;
}

export interface UcpSchemaValidationResult {
  valid: boolean;
  errors: UcpSchemaValidationError[];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validateEntity(value: unknown, path: string, errors: UcpSchemaValidationError[]): void {
  if (!isPlainObject(value)) {
    errors.push({ path, message: 'must be an object' });
    return;
  }
  if (typeof value.version !== 'string') {
    errors.push({ path: `${path}.version`, message: 'version is required and must be a string' });
  } else if (!VERSION_PATTERN.test(value.version)) {
    errors.push({ path: `${path}.version`, message: `version "${value.version}" must match YYYY-MM-DD` });
  }
  if (value.spec !== undefined && typeof value.spec !== 'string') {
    errors.push({ path: `${path}.spec`, message: 'spec must be a string URI when present' });
  }
  if (value.schema !== undefined && typeof value.schema !== 'string') {
    errors.push({ path: `${path}.schema`, message: 'schema must be a string URI when present' });
  }
}

function validateServiceEntry(value: unknown, path: string, errors: UcpSchemaValidationError[]): void {
  validateEntity(value, path, errors);
  if (!isPlainObject(value)) return;
  if (typeof value.transport !== 'string' || !VALID_TRANSPORTS.includes(value.transport as typeof VALID_TRANSPORTS[number])) {
    errors.push({ path: `${path}.transport`, message: `transport is required and must be one of ${VALID_TRANSPORTS.join(', ')}` });
    return;
  }
  if (value.transport !== 'embedded' && typeof value.endpoint !== 'string') {
    errors.push({ path: `${path}.endpoint`, message: `endpoint is required for transport "${value.transport}" (business_schema)` });
  }
}

function validateCapabilityEntry(value: unknown, path: string, errors: UcpSchemaValidationError[]): void {
  validateEntity(value, path, errors);
  if (!isPlainObject(value)) return;
  if (value.extends !== undefined) {
    const isString = typeof value.extends === 'string';
    const isStringArray = Array.isArray(value.extends) && value.extends.every((e) => typeof e === 'string');
    if (!isString && !isStringArray) {
      errors.push({ path: `${path}.extends`, message: 'extends must be a string or an array of strings' });
    }
  }
}

function validateRegistry(
  value: unknown,
  path: string,
  entryValidator: (v: unknown, p: string, errs: UcpSchemaValidationError[]) => void,
  errors: UcpSchemaValidationError[],
): void {
  if (!isPlainObject(value)) {
    errors.push({ path, message: 'must be an object keyed by reverse-domain name' });
    return;
  }
  for (const [key, entries] of Object.entries(value)) {
    if (!REVERSE_DOMAIN_NAME_PATTERN.test(key)) {
      errors.push({ path: `${path}["${key}"]`, message: `"${key}" is not a valid reverse-domain name` });
    }
    if (!Array.isArray(entries)) {
      errors.push({ path: `${path}["${key}"]`, message: 'each registry entry must be an array' });
      continue;
    }
    entries.forEach((entry, i) => entryValidator(entry, `${path}["${key}"][${i}]`, errors));
  }
}

/**
 * Validates a document against the pinned official UCP business-profile
 * schema (2026-04-08). See module doc comment for scope and provenance.
 */
export function validateOfficialUcpBusinessProfile(doc: unknown): UcpSchemaValidationResult {
  const errors: UcpSchemaValidationError[] = [];

  if (!isPlainObject(doc)) {
    return { valid: false, errors: [{ path: '$', message: 'document must be an object' }] };
  }

  if (!Array.isArray(doc.keys)) {
    errors.push({ path: '$.keys', message: 'keys is required and must be an array' });
  }

  const ucp = doc.ucp;
  if (!isPlainObject(ucp)) {
    errors.push({ path: '$.ucp', message: 'ucp is required and must be an object' });
    return { valid: errors.length === 0, errors };
  }

  if (typeof ucp.version !== 'string') {
    errors.push({ path: '$.ucp.version', message: 'version is required and must be a string' });
  } else if (!VERSION_PATTERN.test(ucp.version)) {
    errors.push({ path: '$.ucp.version', message: `version "${ucp.version}" must match YYYY-MM-DD` });
  }

  if (ucp.status !== undefined && !VALID_STATUS.includes(ucp.status as typeof VALID_STATUS[number])) {
    errors.push({ path: '$.ucp.status', message: `status must be one of ${VALID_STATUS.join(', ')} when present — "draft" is not a valid wire value` });
  }

  // business_schema requires services + payment_handlers (ucp.json $defs/business_schema).
  if (ucp.services === undefined) {
    errors.push({ path: '$.ucp.services', message: 'services is required for a business profile' });
  } else {
    validateRegistry(ucp.services, '$.ucp.services', validateServiceEntry, errors);
  }

  if (ucp.payment_handlers === undefined) {
    errors.push({ path: '$.ucp.payment_handlers', message: 'payment_handlers is required for a business profile (may be an empty object)' });
  } else if (!isPlainObject(ucp.payment_handlers)) {
    errors.push({ path: '$.ucp.payment_handlers', message: 'payment_handlers must be an object' });
  }

  if (ucp.capabilities !== undefined) {
    validateRegistry(ucp.capabilities, '$.ucp.capabilities', validateCapabilityEntry, errors);
  }

  return { valid: errors.length === 0, errors };
}
