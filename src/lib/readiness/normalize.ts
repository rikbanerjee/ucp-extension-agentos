/**
 * Shared normalization + validation for the Readiness Studio catalog import.
 *
 * Every import source (Shopify CSV, generic CSV, generic JSON, sample)
 * converges on `CanonicalCatalogRow[]` via the helpers in this module, so
 * validation and downstream engine conversion only ever have to reason
 * about one shape.
 *
 * Pure, deterministic: no I/O, no Date.now(), no Math.random().
 */

import type { CanonicalCatalogRow, ImportResult, ReadinessFinding, CatalogImportSource } from './types';
import { generateProductId, generateVariantId, generateSku } from './ids';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_VARIANTS = 10_000;

// ---------------------------------------------------------------------------
// Column auto-detection for generic CSV / JSON
// ---------------------------------------------------------------------------

const COLUMN_ALIASES: Record<string, string[]> = {
  productId: ['product_id', 'productid', 'product id', 'parent id', 'group id'],
  variantId: ['variant_id', 'variantid', 'variant id', 'id'],
  sku: ['sku', 'variant sku', 'item sku', 'code'],
  title: ['title', 'name', 'product title', 'product name'],
  description: ['description', 'body', 'body (html)', 'details'],
  category: ['category', 'product category', 'product type', 'type', 'collection'],
  price: ['price', 'variant price', 'unit price', 'amount'],
  currency: ['currency', 'currency code', 'price currency'],
  inventoryQuantity: ['inventory', 'inventory quantity', 'variant inventory qty', 'stock', 'quantity', 'qty'],
  availability: ['availability', 'status', 'in stock'],
  tags: ['tags', 'labels'],
  imageUrl: ['image', 'image url', 'image src', 'photo'],
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

/** Maps each canonical field to the source column key it was auto-detected from, or null if unmapped. */
export function detectColumnMapping(headers: string[]): Record<string, string | null> {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const mapping: Record<string, string | null> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const match = normalized.find((h) => aliases.includes(h.norm));
    mapping[field] = match ? match.raw : null;
  }
  return mapping;
}

/** Canonical fields the manual mapping UI offers, with plain-language labels — source column shown alongside destination field (product brief §5). */
export const MAPPABLE_FIELDS: { field: string; label: string; required: boolean }[] = [
  { field: 'title', label: 'Product title', required: true },
  { field: 'price', label: 'Price', required: true },
  { field: 'productId', label: 'Product ID', required: false },
  { field: 'variantId', label: 'Variant ID', required: false },
  { field: 'sku', label: 'SKU', required: false },
  { field: 'currency', label: 'Currency', required: false },
  { field: 'category', label: 'Category', required: false },
  { field: 'description', label: 'Description', required: false },
  { field: 'inventoryQuantity', label: 'Inventory quantity', required: false },
  { field: 'availability', label: 'Availability', required: false },
  { field: 'tags', label: 'Tags', required: false },
  { field: 'imageUrl', label: 'Image URL', required: false },
];

/**
 * True when automatic column detection could not confidently resolve a
 * required field (title/price) — the Studio must show the manual mapping
 * UI in this case rather than silently producing an all-blocking import
 * (product brief §5, "Provide a simple mapping interface only when fields
 * are ambiguous").
 */
export function isMappingIncomplete(mapping: Record<string, string | null>): boolean {
  return mapping.title === null || mapping.price === null;
}

/** Applies a confirmed field→column mapping to one raw record, producing the canonical-field-keyed shape `normalizeGenericRow` expects. */
export function applyColumnMapping(
  record: Record<string, unknown>,
  mapping: Record<string, string | null>,
): Record<string, unknown> {
  const canonicalRecord: Record<string, unknown> = {};
  for (const [field, sourceCol] of Object.entries(mapping)) {
    if (sourceCol) canonicalRecord[field] = record[sourceCol];
  }
  return canonicalRecord;
}

function toNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/[$,]/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

function toTags(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value).split(/[,;]/).map((t) => t.trim()).filter(Boolean);
}

/**
 * Normalizes one generic record (already keyed by canonical field names —
 * callers apply the column mapping before calling this) into a
 * CanonicalCatalogRow, or returns a finding explaining why it could not be.
 */
export function normalizeGenericRow(
  record: Record<string, unknown>,
  rowNumber: number,
): { row: CanonicalCatalogRow | null; issues: ReadinessFinding[] } {
  const issues: ReadinessFinding[] = [];
  const titleRaw = record.title;
  const title = titleRaw === undefined || titleRaw === null ? '' : String(titleRaw).trim();

  const priceValue = toNumber(record.price);

  if (!title) {
    issues.push(mkFinding(`row-${rowNumber}-missing-title`, 'blocking', 'Missing product title', rowNumber,
      `Row ${rowNumber} has no product title, so an AI shopper would have nothing to show a buyer.`,
      'Add a title for this row and re-upload the file.'));
  }
  if (priceValue === undefined) {
    issues.push(mkFinding(`row-${rowNumber}-missing-price`, 'blocking', 'Missing price', rowNumber,
      `Row ${rowNumber} (${title || 'untitled row'}) has no price, so an AI shopper cannot quote a customer.`,
      'Add a price for this row and re-upload the file.'));
  } else if (Number.isNaN(priceValue)) {
    issues.push(mkFinding(`row-${rowNumber}-invalid-price`, 'blocking', 'Price could not be read', rowNumber,
      `Row ${rowNumber} (${title || 'untitled row'}) has a price value that isn't a number.`,
      'Fix the price so it is a plain number (e.g. 24.00) and re-upload the file.'));
  } else if (priceValue < 0) {
    issues.push(mkFinding(`row-${rowNumber}-negative-price`, 'blocking', 'Negative price', rowNumber,
      `Row ${rowNumber} (${title || 'untitled row'}) has a negative price.`,
      'Prices must be zero or positive. Fix this row and re-upload the file.'));
  }

  if (!title || priceValue === undefined || Number.isNaN(priceValue) || priceValue < 0) {
    return { row: null, issues };
  }

  let generatedIds = false;
  let productId = record.productId !== undefined && record.productId !== null && String(record.productId).trim()
    ? String(record.productId).trim() : '';
  let variantId = record.variantId !== undefined && record.variantId !== null && String(record.variantId).trim()
    ? String(record.variantId).trim() : '';
  let sku = record.sku !== undefined && record.sku !== null && String(record.sku).trim()
    ? String(record.sku).trim() : '';

  if (!productId) { productId = generateProductId(title, rowNumber); generatedIds = true; }
  if (!variantId) { variantId = generateVariantId(title, rowNumber); generatedIds = true; }
  if (!sku) { sku = generateSku(title, rowNumber); generatedIds = true; }

  const currency = (record.currency ? String(record.currency).trim().toUpperCase() : '') || '';

  const row: CanonicalCatalogRow = {
    productId,
    variantId,
    sku,
    title,
    description: record.description ? String(record.description) : undefined,
    category: record.category ? String(record.category) : undefined,
    price: priceValue,
    currency,
    inventoryQuantity: toNumber(record.inventoryQuantity) ?? undefined,
    availability: record.availability ? String(record.availability) : undefined,
    tags: toTags(record.tags),
    imageUrl: record.imageUrl ? String(record.imageUrl) : undefined,
    sourceRowNumber: rowNumber,
    generatedIds,
  };

  if (generatedIds) {
    issues.push(mkFinding(`row-${rowNumber}-generated-ids`, 'warning', 'Identifier generated', rowNumber,
      `Row ${rowNumber} (${title}) was missing a stable product, variant, or SKU identifier, so one was generated for you.`,
      'This is fine for a preview. Before going live, use your platform’s real product/variant/SKU IDs so they stay stable across re-imports.',
      { affectedVariantIds: [variantId] }));
  }

  return { row, issues };
}

function mkFinding(
  id: string,
  severity: ReadinessFinding['severity'],
  title: string,
  rowNumber: number,
  explanation: string,
  nextAction: string,
  extra?: Partial<ReadinessFinding>,
): ReadinessFinding {
  return {
    id,
    layer: 'catalog',
    status: severity === 'blocking' ? 'needs_input' : 'ready',
    severity,
    title,
    explanation,
    nextAction,
    owner: 'retail_sme',
    affectedRows: [rowNumber],
    ...extra,
  };
}

/**
 * Cross-row validation: duplicate IDs/SKUs, applied once the whole set of
 * rows is known. Returns additional findings (blocking + warning), stable-
 * ordered by row number then id.
 */
export function validateCrossRow(rows: CanonicalCatalogRow[]): ReadinessFinding[] {
  const findings: ReadinessFinding[] = [];

  const byVariantId = new Map<string, number[]>();
  const bySku = new Map<string, number[]>();
  const byProductVariant = new Map<string, number[]>();

  for (const row of rows) {
    pushInto(byVariantId, row.variantId, row.sourceRowNumber);
    pushInto(bySku, row.sku, row.sourceRowNumber);
    pushInto(byProductVariant, `${row.productId}::${row.variantId}`, row.sourceRowNumber);
  }

  for (const [variantId, rowsAffected] of byVariantId) {
    if (rowsAffected.length > 1) {
      findings.push(mkFinding(
        `dup-variant-${variantId}`, 'blocking', 'Duplicate variant identifier',
        rowsAffected[0],
        `Variant ID "${variantId}" appears in ${rowsAffected.length} rows (${rowsAffected.join(', ')}). An AI shopper cannot tell these apart.`,
        'Give each variant a unique ID and re-upload the file.',
        { affectedRows: rowsAffected, affectedVariantIds: [variantId] },
      ));
    }
  }
  for (const [sku, rowsAffected] of bySku) {
    if (rowsAffected.length > 1) {
      findings.push(mkFinding(
        `dup-sku-${sku}`, 'blocking', 'Duplicate SKU',
        rowsAffected[0],
        `SKU "${sku}" appears in ${rowsAffected.length} rows (${rowsAffected.join(', ')}).`,
        'Give each row a unique SKU and re-upload the file.',
        { affectedRows: rowsAffected },
      ));
    }
  }

  // Invalid currency: must be a 3-letter code when present.
  for (const row of rows) {
    if (row.currency && !/^[A-Z]{3}$/.test(row.currency)) {
      findings.push(mkFinding(
        `bad-currency-${row.sourceRowNumber}`, 'blocking', 'Unrecognized currency code',
        row.sourceRowNumber,
        `Row ${row.sourceRowNumber} (${row.title}) has currency "${row.currency}", which isn't a 3-letter code (e.g. USD).`,
        'Fix the currency code, or leave it blank to use your store’s default currency.',
        { affectedRows: [row.sourceRowNumber] },
      ));
    }
  }

  return findings.sort((a, b) => (a.affectedRows?.[0] ?? 0) - (b.affectedRows?.[0] ?? 0) || a.id.localeCompare(b.id));
}

function pushInto(map: Map<string, number[]>, key: string, row: number) {
  const arr = map.get(key) ?? [];
  arr.push(row);
  map.set(key, arr);
}

/** Applies the store default currency to any row lacking one. Pure — returns a new array. */
export function applyDefaultCurrency(rows: CanonicalCatalogRow[], defaultCurrency: string): CanonicalCatalogRow[] {
  return rows.map((r) => (r.currency ? r : { ...r, currency: defaultCurrency }));
}

/** Builds the final ImportResult from normalized rows + all findings, stably ordered. */
export function buildImportResult(
  source: CatalogImportSource,
  rows: CanonicalCatalogRow[],
  rowFindings: ReadinessFinding[],
  unparsedRowCount: number,
): ImportResult {
  const crossRow = validateCrossRow(rows);
  const all = [...rowFindings, ...crossRow];
  const blocking = all.filter((f) => f.severity === 'blocking')
    .sort((a, b) => (a.affectedRows?.[0] ?? 0) - (b.affectedRows?.[0] ?? 0) || a.id.localeCompare(b.id));
  const warnings = all.filter((f) => f.severity !== 'blocking')
    .sort((a, b) => (a.affectedRows?.[0] ?? 0) - (b.affectedRows?.[0] ?? 0) || a.id.localeCompare(b.id));

  return {
    source,
    rows: [...rows].sort((a, b) => a.sourceRowNumber - b.sourceRowNumber),
    blocking,
    warnings,
    unparsedRowCount,
  };
}
