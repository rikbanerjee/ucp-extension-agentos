/**
 * Browser-side CSV parsing for the Readiness Studio: Shopify product export
 * CSV and generic CSV. Uses papaparse for robust quoting/embedded-comma/
 * embedded-newline handling. No network access, no file-system access
 * beyond the File object the browser handed us.
 */

import Papa from 'papaparse';
import type { CanonicalCatalogRow, ImportResult, ReadinessFinding } from './types';
import { detectColumnMapping, normalizeGenericRow, buildImportResult, applyColumnMapping } from './normalize';
import { generateProductId, generateVariantId, generateSku } from './ids';

export interface CsvParseOutcome {
  headers: string[];
  records: Record<string, string>[];
  parseErrors: string[];
}

/** Parses raw CSV text into header-keyed records. Never throws — malformed rows surface as parseErrors. */
export function parseCsvText(text: string): CsvParseOutcome {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });
  const headers = result.meta.fields ?? [];
  const parseErrors = (result.errors ?? []).map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`);
  return { headers, records: result.data, parseErrors };
}

// ---------------------------------------------------------------------------
// Generic CSV
// ---------------------------------------------------------------------------

/**
 * @param mappingOverride A user-confirmed field→column mapping (from the
 *   Step 1 manual mapping UI). When omitted, columns are auto-detected —
 *   callers should check `detectColumnMapping` + `isMappingIncomplete`
 *   first and only proceed straight to parsing when detection is complete.
 */
export function parseGenericCsv(text: string, mappingOverride?: Record<string, string | null>): ImportResult {
  const { headers, records, parseErrors } = parseCsvText(text);

  if (headers.length === 0) {
    return buildImportResult('generic-csv', [], [{
      id: 'empty-file', layer: 'catalog', status: 'needs_input', severity: 'blocking',
      title: 'Empty or unreadable file', explanation: 'This CSV file has no header row or no data.',
      nextAction: 'Upload a CSV file with a header row and at least one product row.',
      owner: 'retail_sme',
    }], 0);
  }

  const mapping = mappingOverride ?? detectColumnMapping(headers);
  const rows: CanonicalCatalogRow[] = [];
  const findings: ReadinessFinding[] = [];
  let unparsed = 0;

  records.forEach((record, i) => {
    const rowNumber = i + 2; // header is row 1
    const canonicalRecord = applyColumnMapping(record, mapping);
    const { row, issues } = normalizeGenericRow(canonicalRecord, rowNumber);
    findings.push(...issues);
    if (row) rows.push(row);
    else unparsed++;
  });

  for (const err of parseErrors) {
    findings.push({
      id: `parse-error-${findings.length}`, layer: 'catalog', status: 'needs_input', severity: 'warning',
      title: 'Row could not be parsed', explanation: err,
      nextAction: 'Check this row for malformed quoting and re-upload if it looks wrong.',
      owner: 'retail_sme',
    });
  }

  return buildImportResult('generic-csv', rows, findings, unparsed);
}

// ---------------------------------------------------------------------------
// Shopify product export CSV
// ---------------------------------------------------------------------------

/**
 * Shopify's product export groups variant rows under one product: only the
 * first row of a product has Title/Body/Type populated; subsequent variant
 * rows repeat the Handle but leave those columns blank. We forward-fill
 * product-level fields within a Handle group.
 */
export function parseShopifyCsv(text: string, fallbackCurrency: string): ImportResult {
  const { headers, records, parseErrors } = parseCsvText(text);

  if (headers.length === 0 || !headers.some((h) => normalizeShopifyHeader(h) === 'handle')) {
    return buildImportResult('shopify-csv', [], [{
      id: 'not-shopify-csv', layer: 'catalog', status: 'needs_input', severity: 'blocking',
      title: 'This doesn’t look like a Shopify product export',
      explanation: 'A Shopify product CSV export always includes a "Handle" column. This file does not.',
      nextAction: 'Re-export your products from Shopify (Products → Export), or choose "Generic CSV" instead.',
      owner: 'retail_sme',
    }], 0);
  }

  const col = (row: Record<string, string>, name: string): string | undefined => {
    const key = Object.keys(row).find((k) => normalizeShopifyHeader(k) === name);
    const v = key ? row[key] : undefined;
    return v && v.trim() ? v.trim() : undefined;
  };

  const rows: CanonicalCatalogRow[] = [];
  const findings: ReadinessFinding[] = [];
  let unparsed = 0;

  let lastHandle = '';
  let lastTitle = '';
  let lastBody = '';
  let lastType = '';
  let lastTags: string | undefined;
  let lastImage: string | undefined;

  records.forEach((record, i) => {
    const rowNumber = i + 2;
    const handle = col(record, 'handle') ?? lastHandle;
    const title = col(record, 'title') ?? (handle === lastHandle ? lastTitle : '');
    const body = col(record, 'body (html)') ?? (handle === lastHandle ? lastBody : '');
    const type = col(record, 'type') ?? (handle === lastHandle ? lastType : '');
    const tags = col(record, 'tags') ?? (handle === lastHandle ? lastTags : undefined);
    const image = col(record, 'image src') ?? (handle === lastHandle ? lastImage : undefined);

    lastHandle = handle; lastTitle = title; lastBody = body; lastType = type; lastTags = tags; lastImage = image;

    const variantSku = col(record, 'variant sku');
    const variantPrice = col(record, 'variant price');
    const option1 = col(record, 'option1 value');
    const option2 = col(record, 'option2 value');
    const inventoryQty = col(record, 'variant inventory qty');

    // A pure image/metadata continuation row (no price, no sku) contributes
    // nothing to the catalog itself — skip without counting as unparsed.
    if (!variantPrice && !variantSku && !title) return;

    if (!title) {
      findings.push({
        id: `shopify-missing-title-${rowNumber}`, layer: 'catalog', status: 'needs_input', severity: 'blocking',
        title: 'Missing product title', explanation: `Row ${rowNumber} (handle "${handle}") has no product title.`,
        nextAction: 'Add a title in Shopify and re-export.', owner: 'retail_sme', affectedRows: [rowNumber],
      });
      unparsed++;
      return;
    }

    const priceNum = variantPrice !== undefined ? Number(variantPrice) : NaN;
    if (variantPrice === undefined || Number.isNaN(priceNum)) {
      findings.push({
        id: `shopify-missing-price-${rowNumber}`, layer: 'catalog', status: 'needs_input', severity: 'blocking',
        title: 'Missing or invalid variant price',
        explanation: `Row ${rowNumber} (${title}) has no readable variant price.`,
        nextAction: 'Add a Variant Price in Shopify and re-export.', owner: 'retail_sme', affectedRows: [rowNumber],
      });
      unparsed++;
      return;
    }
    if (priceNum < 0) {
      findings.push({
        id: `shopify-negative-price-${rowNumber}`, layer: 'catalog', status: 'needs_input', severity: 'blocking',
        title: 'Negative price', explanation: `Row ${rowNumber} (${title}) has a negative variant price.`,
        nextAction: 'Fix the price in Shopify and re-export.', owner: 'retail_sme', affectedRows: [rowNumber],
      });
      unparsed++;
      return;
    }

    let generatedIds = false;
    const productId = handle || generateProductId(title, rowNumber);
    if (!handle) generatedIds = true;

    let sku = variantSku;
    if (!sku) { sku = generateSku(title, rowNumber); generatedIds = true; }

    const variantTitleParts = [option1, option2].filter(Boolean);
    const variantTitle = variantTitleParts.length ? variantTitleParts.join(' / ') : 'Default';
    let variantId = `${productId}-${sku}`;
    if (!variantSku) { variantId = generateVariantId(`${title}-${variantTitle}`, rowNumber); generatedIds = true; }

    const row: CanonicalCatalogRow = {
      productId,
      variantId,
      sku,
      title: variantTitleParts.length ? `${title} — ${variantTitle}` : title,
      description: body || undefined,
      category: type || undefined,
      price: priceNum,
      currency: fallbackCurrency,
      inventoryQuantity: inventoryQty !== undefined ? Number(inventoryQty) : undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
      imageUrl: image,
      sourceRowNumber: rowNumber,
      generatedIds,
    };
    rows.push(row);

    if (generatedIds) {
      findings.push({
        id: `shopify-generated-ids-${rowNumber}`, layer: 'catalog', status: 'ready', severity: 'warning',
        title: 'Identifier generated', owner: 'retail_sme',
        explanation: `Row ${rowNumber} (${row.title}) was missing a Handle or Variant SKU, so an identifier was generated for you.`,
        nextAction: 'Fine for a preview — before going live, make sure every product has a stable Handle and SKU in Shopify.',
        affectedRows: [rowNumber], affectedVariantIds: [variantId],
      });
    }
  });

  for (const err of parseErrors) {
    findings.push({
      id: `shopify-parse-error-${findings.length}`, layer: 'catalog', status: 'needs_input', severity: 'warning',
      title: 'Row could not be parsed', explanation: err,
      nextAction: 'Check this row for malformed quoting and re-upload if it looks wrong.', owner: 'retail_sme',
    });
  }

  return buildImportResult('shopify-csv', rows, findings, unparsed);
}

function normalizeShopifyHeader(h: string): string {
  return h.trim().toLowerCase();
}
