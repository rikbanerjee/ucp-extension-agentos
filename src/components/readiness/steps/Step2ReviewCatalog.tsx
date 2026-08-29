'use client';

import type { StepProps } from '../StudioWizard';
import { SeverityBadge } from '../StatusBadge';

export default function Step2ReviewCatalog({ session }: StepProps) {
  const result = session.importResult;

  if (!result) {
    return <p className="text-slate-600">Go back and add a catalog first.</p>;
  }

  const previewRows = result.rows.slice(0, 50);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Review your catalog</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        {result.rows.length} product variant{result.rows.length === 1 ? '' : 's'} were normalized from your file.
        {result.rows.length > previewRows.length && ` Showing the first ${previewRows.length}.`}
      </p>

      {result.blocking.length > 0 && (
        <section aria-labelledby="blocking-heading" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <h2 id="blocking-heading" className="font-semibold text-rose-900">
            Must fix before continuing ({result.blocking.length})
          </h2>
          <ul className="mt-3 space-y-3">
            {result.blocking.map((f) => (
              <li key={f.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity="blocking" />
                  <span className="font-semibold text-slate-900">{f.title}</span>
                </div>
                <p className="mt-1 text-slate-700">{f.explanation}</p>
                <p className="mt-1 text-slate-500">{f.nextAction}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.warnings.length > 0 && (
        <section aria-labelledby="warnings-heading" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 id="warnings-heading" className="font-semibold text-amber-900">
            Can continue, but review ({result.warnings.length})
          </h2>
          <ul className="mt-3 space-y-3">
            {result.warnings.map((f) => (
              <li key={f.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity="warning" />
                  <span className="font-semibold text-slate-900">{f.title}</span>
                </div>
                <p className="mt-1 text-slate-700">{f.explanation}</p>
                <p className="mt-1 text-slate-500">{f.nextAction}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.blocking.length === 0 && result.warnings.length === 0 && (
        <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          No issues found. Your catalog is ready for the next step.
        </p>
      )}

      <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {['Title', 'SKU', 'Category', 'Price', 'Currency', 'Inventory'].map((h) => (
                <th key={h} scope="col" className="px-4 py-2 text-left font-semibold text-slate-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {previewRows.map((row) => (
              <tr key={row.variantId}>
                <td className="px-4 py-2 text-slate-900">{row.title}</td>
                <td className="px-4 py-2 text-slate-600 font-mono text-xs">{row.sku}</td>
                <td className="px-4 py-2 text-slate-600">{row.category ?? '—'}</td>
                <td className="px-4 py-2 text-slate-600">{row.price.toFixed(2)}</td>
                <td className="px-4 py-2 text-slate-600">{row.currency || '—'}</td>
                <td className="px-4 py-2 text-slate-600">{row.inventoryQuantity ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
