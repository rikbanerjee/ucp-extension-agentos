'use client';

import { useMemo, useState } from 'react';
import type { StepProps } from '../StudioWizard';
import type { CanonicalCatalogRow, ProductRuleOverride, FulfillmentModeId } from '@/lib/readiness';
import { resolveEffectiveRule } from '@/lib/readiness';

export default function Step5ProductExceptions({ session, updateSession }: StepProps) {
  const importResult = session.importResult;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CanonicalCatalogRow | null>(null);

  const rows = useMemo(() => importResult?.rows ?? [], [importResult]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows.slice(0, 30);
    return rows.filter((r) => r.title.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)).slice(0, 30);
  }, [rows, query]);

  const override = selected
    ? session.overrides.find((o) => o.productId === selected.productId && o.variantId === selected.variantId)
    : undefined;

  function updateOverride(patch: Partial<ProductRuleOverride>) {
    if (!selected) return;
    const existing = session.overrides.filter((o) => !(o.productId === selected.productId && o.variantId === selected.variantId));
    updateSession({ overrides: [...existing, { productId: selected.productId, variantId: selected.variantId, ...override, ...patch }] });
  }

  function resetOverride() {
    if (!selected) return;
    updateSession({ overrides: session.overrides.filter((o) => !(o.productId === selected.productId && o.variantId === selected.variantId)) });
  }

  const effective = selected ? resolveEffectiveRule(selected, session.ruleDefaults, session.overrides) : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Add product exceptions</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        Only add an exception for products that need different rules than your store default — most products don’t need one.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div>
          <label htmlFor="exception-search" className="block text-sm font-medium text-slate-700 mb-1">Search by title or SKU</label>
          <input
            id="exception-search" type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <ul className="mt-3 max-h-96 overflow-y-auto divide-y divide-slate-100 rounded-md border border-slate-200">
            {filtered.map((row) => {
              const hasOverride = session.overrides.some((o) => o.productId === row.productId && o.variantId === row.variantId);
              return (
                <li key={row.variantId}>
                  <button
                    type="button"
                    onClick={() => setSelected(row)}
                    className={`flex w-full min-h-[44px] items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${selected?.variantId === row.variantId ? 'bg-emerald-50' : ''}`}
                  >
                    <span className="truncate">{row.title}</span>
                    {hasOverride && <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">override</span>}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="px-3 py-4 text-sm text-slate-500">No products match your search.</li>}
          </ul>
        </div>

        <div>
          {!selected && (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Select a product to review or edit its exception.
            </p>
          )}
          {selected && effective && (
            <div className="rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold text-slate-900">{selected.title}</h2>
                <button type="button" onClick={resetOverride} disabled={!override}
                  className="min-h-[36px] rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
                  Reset to store default
                </button>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {override ? 'Product override' : 'Store default'}
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ex-eligibility" className="block text-sm font-medium text-slate-700 mb-1">Buyer eligibility</label>
                  <select id="ex-eligibility" value={effective.eligibilityMode}
                    onChange={(e) => updateOverride({ eligibilityMode: e.target.value as ProductRuleOverride['eligibilityMode'] })}
                    className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="everyone">Everyone</option>
                    <option value="members">Members</option>
                    <option value="wholesale">Wholesale</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ex-availability" className="block text-sm font-medium text-slate-700 mb-1">Availability</label>
                  <select id="ex-availability" value={effective.availability}
                    onChange={(e) => updateOverride({ availability: e.target.value as 'in_stock' | 'out_of_stock' })}
                    className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm">
                    <option value="in_stock">In stock</option>
                    <option value="out_of_stock">Out of stock</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ex-min-qty" className="block text-sm font-medium text-slate-700 mb-1">Minimum quantity</label>
                  <input id="ex-min-qty" type="number" min={0} value={effective.minimumQuantity ?? ''}
                    onChange={(e) => updateOverride({ minimumQuantity: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <div>
                  <label htmlFor="ex-lead-time" className="block text-sm font-medium text-slate-700 mb-1">Lead time (days)</label>
                  <input id="ex-lead-time" type="number" min={0} value={effective.leadTimeDays ?? ''}
                    onChange={(e) => updateOverride({ leadTimeDays: e.target.value === '' ? undefined : Number(e.target.value) })}
                    className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </div>
                <fieldset className="sm:col-span-2">
                  <legend className="text-sm font-medium text-slate-700 mb-1">Fulfilment modes</legend>
                  <div className="flex flex-wrap gap-3">
                    {(['shipping', 'pickup', 'local_delivery'] as FulfillmentModeId[]).map((mode) => (
                      <label key={mode} className="flex min-h-[36px] items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={effective.fulfillmentModes.includes(mode)}
                          onChange={(e) => {
                            const modes = e.target.checked
                              ? [...effective.fulfillmentModes, mode]
                              : effective.fulfillmentModes.filter((m) => m !== mode);
                            updateOverride({ fulfillmentModes: modes });
                          }} className="h-4 w-4" />
                        {mode.replace('_', ' ')}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="sm:col-span-2 flex min-h-[36px] items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={effective.callForPrice}
                    onChange={(e) => updateOverride({ callForPrice: e.target.checked })} className="h-4 w-4" />
                  Requires a quote (“call for price”)
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
