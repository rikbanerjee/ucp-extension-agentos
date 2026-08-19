/**
 * Browser-side JSON parsing for the Readiness Studio: a generic product
 * JSON export (array of objects, or `{ products: [...] }`). No network
 * access — the file is read from a File object already in memory.
 */

import type { CanonicalCatalogRow, ImportResult, ReadinessFinding } from './types';
import { detectColumnMapping, normalizeGenericRow, buildImportResult, applyColumnMapping } from './normalize';

export interface JsonRecordsOutcome {
  records: unknown[];
  headers: string[];
  error?: ReadinessFinding;
}

/**
 * Parses raw JSON text into a flat records array + the union of every key
 * seen across records ("headers", for the manual-mapping UI's purposes),
 * without normalizing rows yet. Never throws.
 */
export function extractJsonRecords(text: string): JsonRecordsOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return {
      records: [], headers: [],
      error: {
        id: 'malformed-json', layer: 'catalog', status: 'needs_input', severity: 'blocking',
        title: 'File is not valid JSON',
        explanation: `The file could not be parsed as JSON: ${e instanceof Error ? e.message : 'unknown error'}.`,
        nextAction: 'Fix the JSON syntax (a JSON validator can help) and re-upload.',
        owner: 'retail_sme',
      },
    };
  }

  const records: unknown[] = Array.isArray(parsed)
    ? parsed
    : (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).products))
      ? (parsed as Record<string, unknown>).products as unknown[]
      : [];

  if (records.length === 0) {
    return {
      records: [], headers: [],
      error: {
        id: 'empty-json', layer: 'catalog', status: 'needs_input', severity: 'blocking',
        title: 'No products found',
        explanation: 'The JSON file must be an array of products, or an object with a "products" array.',
        nextAction: 'Check the file structure and re-upload.',
        owner: 'retail_sme',
      },
    };
  }

  const headers = Array.from(
    new Set(records.flatMap((r) => (r && typeof r === 'object' ? Object.keys(r as object) : []))),
  );

  return { records, headers };
}

/**
 * @param mappingOverride A user-confirmed field→column mapping (from the
 *   Step 1 manual mapping UI). When omitted, columns are auto-detected —
 *   callers should check `detectColumnMapping` + `isMappingIncomplete`
 *   first (via `extractJsonRecords`) and only proceed straight to parsing
 *   when detection is complete.
 */
export function parseGenericJson(text: string, mappingOverride?: Record<string, string | null>): ImportResult {
  const { records, headers, error } = extractJsonRecords(text);

  if (error) {
    return buildImportResult('generic-json', [], [error], 0);
  }

  const mapping = mappingOverride ?? detectColumnMapping(headers);

  const rows: CanonicalCatalogRow[] = [];
  const findings: ReadinessFinding[] = [];
  let unparsed = 0;

  records.forEach((record, i) => {
    const rowNumber = i + 1;
    if (!record || typeof record !== 'object') {
      unparsed++;
      findings.push({
        id: `json-not-object-${rowNumber}`, layer: 'catalog', status: 'needs_input', severity: 'blocking',
        title: 'Row is not an object', explanation: `Entry ${rowNumber} in the JSON array is not an object.`,
        nextAction: 'Each entry must be a product object with at least title and price.',
        owner: 'retail_sme', affectedRows: [rowNumber],
      });
      return;
    }
    const canonicalRecord = applyColumnMapping(record as Record<string, unknown>, mapping);
    const { row, issues } = normalizeGenericRow(canonicalRecord, rowNumber);
    findings.push(...issues);
    if (row) rows.push(row);
    else unparsed++;
  });

  return buildImportResult('generic-json', rows, findings, unparsed);
}
