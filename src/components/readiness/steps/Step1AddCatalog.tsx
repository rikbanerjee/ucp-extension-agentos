'use client';

import { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, FileJson, Sparkles } from 'lucide-react';
import type { StepProps } from '../StudioWizard';
import {
  parseGenericCsv,
  parseShopifyCsv,
  parseGenericJson,
  parseCsvText,
  extractJsonRecords,
  detectColumnMapping,
  isMappingIncomplete,
  MAPPABLE_FIELDS,
  MAX_FILE_SIZE_BYTES,
  MAX_VARIANTS,
} from '@/lib/readiness';
import type { CatalogImportSource, ImportResult } from '@/lib/readiness';
import { SAMPLE_CATALOG_ROWS, SAMPLE_STORE_NAME, SAMPLE_STORE_DOMAIN } from '@/lib/readiness/sampleCatalog';

const SOURCES: { id: Exclude<CatalogImportSource, 'sample'>; label: string; hint: string; icon: typeof FileSpreadsheet }[] = [
  { id: 'shopify-csv', label: 'Shopify product CSV', hint: 'Exported from Shopify → Products → Export', icon: FileSpreadsheet },
  { id: 'generic-csv', label: 'Generic CSV', hint: 'Any spreadsheet export with a header row', icon: FileSpreadsheet },
  { id: 'generic-json', label: 'Generic JSON', hint: 'An array of products, or { "products": [...] }', icon: FileJson },
];

interface PendingMapping {
  source: 'generic-csv' | 'generic-json';
  text: string;
  headers: string[];
  mapping: Record<string, string | null>;
}

export default function Step1AddCatalog({ session, updateSession }: StepProps) {
  const [source, setSource] = useState<Exclude<CatalogImportSource, 'sample'>>('generic-csv');
  const [currency, setCurrency] = useState('USD');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMapping | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function finishImport(result: ImportResult, name: string) {
    if (result.rows.length > MAX_VARIANTS) {
      setError(`This file has ${result.rows.length} product variants, which is over the ${MAX_VARIANTS.toLocaleString()} limit for this preview tool.`);
      setPending(null);
      return;
    }
    setError(null);
    setPending(null);
    setFileName(name);
    updateSession({ importResult: result, storeProfile: session.storeProfile ? { ...session.storeProfile, currency } : session.storeProfile });
  }

  async function handleFile(file: File) {
    setError(null);
    setPending(null);
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB, which is over the 10 MB limit. Export a smaller catalog and try again.`);
      return;
    }
    const text = await file.text();

    if (source === 'shopify-csv') {
      finishImport(parseShopifyCsv(text, currency), file.name);
      return;
    }

    // Generic CSV / JSON: check whether automatic column detection resolved
    // the required fields before committing to an import. When it can't,
    // show the manual mapping UI instead of silently producing an
    // all-blocking result (product brief §5).
    const headers = source === 'generic-csv'
      ? parseCsvText(text).headers
      : extractJsonRecords(text).headers;

    if (headers.length === 0) {
      // Let the underlying parser produce its own "empty/malformed" finding.
      finishImport(source === 'generic-csv' ? parseGenericCsv(text) : parseGenericJson(text), file.name);
      return;
    }

    const mapping = detectColumnMapping(headers);
    if (isMappingIncomplete(mapping)) {
      setPending({ source, text, headers, mapping });
      setFileName(file.name);
      return;
    }

    finishImport(source === 'generic-csv' ? parseGenericCsv(text, mapping) : parseGenericJson(text, mapping), file.name);
  }

  function applyPendingMapping() {
    if (!pending) return;
    const result = pending.source === 'generic-csv'
      ? parseGenericCsv(pending.text, pending.mapping)
      : parseGenericJson(pending.text, pending.mapping);
    finishImport(result, fileName ?? 'Uploaded file');
  }

  function handleSample() {
    setError(null);
    setPending(null);
    setFileName('Sample catalog — Rosemary & Rye');
    const result: ImportResult = {
      source: 'sample',
      rows: SAMPLE_CATALOG_ROWS,
      blocking: [],
      warnings: [],
      unparsedRowCount: 0,
    };
    updateSession({
      importResult: result,
      storeProfile: session.storeProfile ?? {
        storeName: SAMPLE_STORE_NAME,
        storeDomain: SAMPLE_STORE_DOMAIN,
        currency: 'USD',
        timezone: 'America/New_York',
        regions: ['US'],
        fulfillmentModes: ['shipping', 'pickup', 'local_delivery'],
      },
    });
  }

  const mappingReady = pending ? !isMappingIncomplete(pending.mapping) : false;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Add your catalog</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        Choose how your catalog is exported, then upload the file. Everything is processed in this browser — nothing is
        uploaded or stored.
      </p>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-slate-800 mb-3">Catalog format</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {SOURCES.map(({ id, label, hint, icon: Icon }) => (
            <label
              key={id}
              className={`flex min-h-[44px] cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors ${
                source === id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <input
                type="radio"
                name="catalog-source"
                value={id}
                checked={source === id}
                onChange={() => { setSource(id); setPending(null); }}
                className="sr-only"
              />
              <Icon size={18} className="text-slate-500" aria-hidden="true" />
              <span className="font-semibold text-slate-900 text-sm">{label}</span>
              <span className="text-xs text-slate-500">{hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {source === 'shopify-csv' && (
        <div className="mt-4 max-w-xs">
          <label htmlFor="shopify-currency" className="block text-sm font-medium text-slate-700 mb-1">
            Store currency (Shopify exports don’t include one)
          </label>
          <select
            id="shopify-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {['USD', 'CAD', 'GBP', 'EUR', 'AUD'].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <label
          htmlFor="catalog-file-input"
          className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-500"
        >
          <Upload size={16} aria-hidden="true" />
          Choose file
        </label>
        <input
          id="catalog-file-input"
          ref={inputRef}
          type="file"
          accept={source === 'generic-json' ? '.json,application/json' : '.csv,text/csv'}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {fileName && <span className="text-sm text-slate-600">{fileName}</span>}

        <span className="text-slate-400 text-sm">or</span>

        <button
          type="button"
          onClick={handleSample}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          <Sparkles size={16} aria-hidden="true" />
          Try a sample catalog
        </button>
      </div>

      <div aria-live="polite" className="mt-4">
        {error && (
          <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </p>
        )}
        {!error && !pending && session.importResult && (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Imported {session.importResult.rows.length} product variant{session.importResult.rows.length === 1 ? '' : 's'}.
            {session.importResult.blocking.length > 0 && ` ${session.importResult.blocking.length} row(s) need attention before you continue.`}
          </p>
        )}
      </div>

      {pending && (
        <section aria-labelledby="mapping-heading" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 id="mapping-heading" className="font-semibold text-amber-900">Map your columns</h2>
          <p className="mt-1 text-sm text-amber-800">
            We couldn’t automatically find a column for every required field. Tell us which column in your file maps
            to each piece of information below — the source column on the left, the destination field on the right.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {MAPPABLE_FIELDS.map(({ field, label, required }) => (
              <div key={field}>
                <label htmlFor={`map-${field}`} className="block text-sm font-medium text-slate-700 mb-1">
                  {label}{required && <span className="text-rose-600"> *</span>}
                </label>
                <select
                  id={`map-${field}`}
                  value={pending.mapping[field] ?? ''}
                  onChange={(e) => {
                    const value = e.target.value || null;
                    setPending({ ...pending, mapping: { ...pending.mapping, [field]: value } });
                  }}
                  aria-required={required}
                  aria-invalid={required && !pending.mapping[field]}
                  className={`w-full min-h-[44px] rounded-md border px-3 py-2 text-sm ${
                    required && !pending.mapping[field] ? 'border-rose-400' : 'border-slate-300'
                  }`}
                >
                  <option value="">— not in this file —</option>
                  {pending.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={applyPendingMapping}
            disabled={!mappingReady}
            className="mt-5 min-h-[44px] rounded-md bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            Use this mapping
          </button>
          {!mappingReady && (
            <p className="mt-2 text-xs text-rose-700">Product title and price are required before you can continue.</p>
          )}
        </section>
      )}

      <p className="mt-6 text-xs text-slate-500 max-w-2xl">
        Your catalog is processed in this browser. RetailAgentOS does not upload or store your file. Limits: 10 MB per
        file, {MAX_VARIANTS.toLocaleString()} product variants, one store per session.
      </p>
    </div>
  );
}
