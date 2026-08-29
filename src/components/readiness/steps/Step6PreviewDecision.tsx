'use client';

import { useMemo, useState } from 'react';
import type { StepProps } from '../StudioWizard';
import type { ShopperScenario, FulfillmentModeId } from '@/lib/readiness';
import { runPreview, summarizeDecision, deriveOrderNow } from '@/lib/readiness';

const INVENTORY_LABEL: Record<string, string> = {
  in_stock: 'In stock', low_stock: 'Low stock', out_of_stock: 'Out of stock',
  backorder: 'Backorder', preorder: 'Preorder',
};

function defaultScenario(session: StepProps['session']): ShopperScenario {
  // Lazy default computed once at mount, not re-evaluated every render —
  // same pattern as the "generatedAt" timestamp in Step 7 (a `new Date()`
  // read inside a `useState` lazy initializer is a one-time mount value,
  // not a per-render impure read).
  const now = new Date();
  const rows = session.importResult?.rows ?? [];
  return {
    productVariantKey: rows[0] ? `${rows[0].productId}::${rows[0].variantId}` : '',
    customerType: 'guest',
    marketRegion: session.storeProfile?.regions[0] ?? 'US',
    quantity: 1,
    fulfillmentMode: session.storeProfile?.fulfillmentModes[0] ?? 'shipping',
    orderDate: now.toISOString().slice(0, 10),
    orderTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
  };
}

export default function Step6PreviewDecision({ session, updateSession }: StepProps) {
  const rows = session.importResult?.rows ?? [];
  const [scenario, setScenario] = useState<ShopperScenario>(() => session.scenario ?? defaultScenario(session));

  function set(patch: Partial<ShopperScenario>) {
    const next = { ...scenario, ...patch };
    setScenario(next);
    updateSession({ scenario: next });
  }

  const selectedRow = rows.find((r) => `${r.productId}::${r.variantId}` === scenario.productVariantKey) ?? rows[0];
  const timezone = session.storeProfile?.timezone ?? 'America/New_York';

  const decision = useMemo(() => {
    if (!selectedRow || !session.storeProfile) return null;
    const now = deriveOrderNow(scenario, timezone);
    const record = runPreview({
      store: session.storeProfile,
      defaults: session.ruleDefaults,
      overrides: session.overrides,
      row: selectedRow,
      scenario,
      now,
    });
    return { record, summary: summarizeDecision(record, scenario.quantity), now };
  }, [selectedRow, session.storeProfile, session.ruleDefaults, session.overrides, scenario, timezone]);

  if (!session.storeProfile || rows.length === 0) {
    return <p className="text-slate-600">Complete the previous steps first.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Preview an AI shopping decision</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        Choose a product and a shopper scenario. This runs the real RetailAgentOS decision engine, live, evaluated at
        the order date and time you set below (in {session.storeProfile.timezone}).
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Scenario</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="preview-product" className="block text-sm font-medium text-slate-700 mb-1">Product</label>
              <select id="preview-product" value={scenario.productVariantKey}
                onChange={(e) => set({ productVariantKey: e.target.value })}
                className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm">
                {rows.map((r) => (
                  <option key={r.variantId} value={`${r.productId}::${r.variantId}`}>{r.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="preview-customer" className="block text-sm font-medium text-slate-700 mb-1">Buyer type</label>
              <select id="preview-customer" value={scenario.customerType}
                onChange={(e) => set({ customerType: e.target.value as ShopperScenario['customerType'] })}
                className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="guest">Guest</option>
                <option value="member">Member</option>
                <option value="wholesale">Wholesale</option>
              </select>
            </div>

            <div>
              <label htmlFor="preview-region" className="block text-sm font-medium text-slate-700 mb-1">Market region</label>
              <input id="preview-region" type="text" value={scenario.marketRegion}
                onChange={(e) => set({ marketRegion: e.target.value.toUpperCase() })}
                className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>

            <div>
              <label htmlFor="preview-quantity" className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
              <input id="preview-quantity" type="number" min={1} value={scenario.quantity}
                onChange={(e) => set({ quantity: Math.max(1, Number(e.target.value) || 1) })}
                className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </div>

            <div>
              <label htmlFor="preview-mode" className="block text-sm font-medium text-slate-700 mb-1">Fulfilment mode</label>
              <select id="preview-mode" value={scenario.fulfillmentMode}
                onChange={(e) => set({ fulfillmentMode: e.target.value as FulfillmentModeId })}
                className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm">
                <option value="shipping">Shipping</option>
                <option value="pickup">Pickup</option>
                <option value="local_delivery">Local delivery</option>
              </select>
            </div>

            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="col-span-2 block text-sm font-medium text-slate-700 mb-1">
                Order date &amp; time (store-local)
              </legend>
              <div>
                <label htmlFor="preview-order-date" className="sr-only">Order date</label>
                <input id="preview-order-date" type="date" value={scenario.orderDate}
                  onChange={(e) => set({ orderDate: e.target.value })}
                  className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="preview-order-time" className="sr-only">Order time</label>
                <input id="preview-order-time" type="time" value={scenario.orderTime}
                  onChange={(e) => set({ orderTime: e.target.value })}
                  className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
            </fieldset>

            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="col-span-2 block text-sm font-medium text-slate-700 mb-1">Need by (optional)</legend>
              <div>
                <label htmlFor="preview-needby-date" className="sr-only">Need-by date</label>
                <input id="preview-needby-date" type="date" value={scenario.needByDate ?? ''}
                  onChange={(e) => set({ needByDate: e.target.value || undefined })}
                  className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="preview-needby-time" className="sr-only">Need-by time</label>
                <input id="preview-needby-time" type="time" value={scenario.needByTime ?? ''}
                  disabled={!scenario.needByDate}
                  onChange={(e) => set({ needByTime: e.target.value || undefined })}
                  className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400" />
              </div>
            </fieldset>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">UCP foundation</h2>
            <p className="mt-2 text-sm text-slate-700">
              If the generated UCP profile and endpoints were installed, an agent could discover this store’s commerce
              capability and prepare a cart for this product through the UCP checkout capability. No live checkout
              request is made here.
            </p>
          </div>

          <div aria-live="polite" className={`rounded-xl border p-5 ${decision?.summary.allowed ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">With RetailAgentOS</h2>
            <p className={`mt-2 text-lg font-semibold ${decision?.summary.allowed ? 'text-emerald-900' : 'text-rose-900'}`}>
              {decision?.summary.plainLanguage}
            </p>

            {decision && (
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-slate-500">Allowed / blocked</dt>
                <dd className="font-semibold text-slate-900">{decision.summary.allowed ? 'Allowed' : 'Blocked'}</dd>
                <dt className="text-slate-500">Resolved price</dt>
                <dd className="text-slate-900">
                  {decision.summary.unitPrice !== undefined
                    ? `${decision.summary.currency} ${decision.summary.unitPrice.toFixed(2)} / unit`
                    : '—'}
                </dd>
                <dt className="text-slate-500">Inventory</dt>
                <dd className="text-slate-900">
                  {decision.summary.inventoryState ? INVENTORY_LABEL[decision.summary.inventoryState] ?? decision.summary.inventoryState : '—'}
                </dd>
                <dt className="text-slate-500">Fulfilment</dt>
                <dd className="text-slate-900">
                  {decision.summary.fulfillmentStatus === 'FEASIBLE' ? 'Feasible'
                    : decision.summary.fulfillmentStatus === 'BLOCKED' ? 'Not feasible' : '—'}
                </dd>
              </dl>
            )}

            {decision && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs font-semibold text-slate-600">Technical reason codes</summary>
                <ul className="mt-2 space-y-1 text-xs font-mono text-slate-600">
                  {decision.record.reasons.map((r, i) => (
                    <li key={i}>[{r.severity}] {r.code} — {r.source}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <p className="text-xs text-slate-500">
            UCP provides the transaction path. RetailAgentOS provides the decision the shopping experience can act on
            before creating the cart.
          </p>
        </div>
      </div>
    </div>
  );
}
