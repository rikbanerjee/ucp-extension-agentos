'use client';

import { useMemo, useState } from 'react';
import type { StepProps } from '../StudioWizard';
import type { BuyerEligibilityMode, RetailerRuleDefaults } from '@/lib/readiness';
import { validateRuleDefaults } from '@/lib/readiness';

type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

const ALL_DAYS: { id: DayOfWeek; label: string }[] = [
  { id: 'mon', label: 'Monday' },
  { id: 'tue', label: 'Tuesday' },
  { id: 'wed', label: 'Wednesday' },
  { id: 'thu', label: 'Thursday' },
  { id: 'fri', label: 'Friday' },
  { id: 'sat', label: 'Saturday' },
  { id: 'sun', label: 'Sunday' },
];

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function NumberField({ id, label, value, onChange, hint, error }: { id: string; label: string; value: number | undefined; onChange: (v: number | undefined) => void; hint?: string; error?: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        id={id} type="number" min={0} value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={`w-full min-h-[44px] rounded-md border px-3 py-2 text-sm ${error ? 'border-rose-400' : 'border-slate-300'}`}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
      />
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}

export default function Step4StoreRules({ session, updateSession }: StepProps) {
  const defaults = session.ruleDefaults;
  const [touched, setTouched] = useState(false);

  const fieldErrors = useMemo(() => validateRuleDefaults(defaults), [defaults]);
  const errorFor = (field: string) => (touched ? fieldErrors.find((e) => e.field === field)?.message : undefined);

  function set(patch: Partial<RetailerRuleDefaults>) {
    setTouched(true);
    updateSession({ ruleDefaults: { ...defaults, ...patch } });
  }

  const scheduleByDay = new Map((defaults.fulfillment.weeklySchedule ?? []).map((d) => [d.day, d]));

  function setDaySchedule(day: DayOfWeek, open: boolean, opensAt?: string, closesAt?: string) {
    const current = defaults.fulfillment.weeklySchedule ?? [];
    const without = current.filter((d) => d.day !== day);
    const next = open ? [...without, { day, opensAt: opensAt ?? '09:00', closesAt: closesAt ?? '17:00' }] : without;
    set({ fulfillment: { ...defaults.fulfillment, weeklySchedule: next.length ? next : undefined } });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Add store-wide rules</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        These defaults apply to every product. You can set exceptions for individual products in the next step.
      </p>

      {touched && fieldErrors.length > 0 && (
        <div role="alert" aria-live="polite" className="mt-4 max-w-3xl rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-900">Fix {fieldErrors.length === 1 ? 'this' : 'these'} before continuing:</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-rose-800">
            {fieldErrors.map((e) => <li key={e.field}>{e.message}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-6 space-y-6 max-w-3xl">
        <Section title="Who can buy?" description="Choose the default audience for your catalog.">
          <fieldset className="sm:col-span-2">
            <div className="flex flex-wrap gap-3">
              {(['everyone', 'members', 'wholesale'] as BuyerEligibilityMode[]).map((mode) => (
                <label key={mode} className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm capitalize ${defaults.eligibility.mode === mode ? 'border-emerald-500 bg-emerald-50 font-semibold' : 'border-slate-300'}`}>
                  <input type="radio" name="eligibility-mode" className="sr-only" checked={defaults.eligibility.mode === mode}
                    onChange={() => set({ eligibility: { ...defaults.eligibility, mode } })} />
                  {mode}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="sm:col-span-2 flex min-h-[44px] items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={defaults.eligibility.restrictToServedRegions}
              onChange={(e) => set({ eligibility: { ...defaults.eligibility, restrictToServedRegions: e.target.checked } })} className="h-4 w-4" />
            Only sell to the regions I serve
          </label>
        </Section>

        <Section title="What should they pay?" description="Optional discounts and order minimums applied to the imported price.">
          <NumberField id="member-discount" label="Member discount (%)" value={defaults.pricing.memberDiscountPercent}
            error={errorFor('memberDiscountPercent')}
            onChange={(v) => set({ pricing: { ...defaults.pricing, memberDiscountPercent: v } })} />
          <NumberField id="wholesale-discount" label="Wholesale discount (%)" value={defaults.pricing.wholesaleDiscountPercent}
            error={errorFor('wholesaleDiscountPercent')}
            onChange={(v) => set({ pricing: { ...defaults.pricing, wholesaleDiscountPercent: v } })} />
          <NumberField id="min-qty" label="Minimum order quantity" value={defaults.pricing.minimumQuantity}
            error={errorFor('minimumQuantity')}
            onChange={(v) => set({ pricing: { ...defaults.pricing, minimumQuantity: v } })} />
          <NumberField id="qty-increment" label="Quantity increment" value={defaults.pricing.quantityIncrement}
            error={errorFor('quantityIncrement')}
            onChange={(v) => set({ pricing: { ...defaults.pricing, quantityIncrement: v } })} />
          <label className="sm:col-span-2 flex min-h-[44px] items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={defaults.pricing.callForPrice}
              onChange={(e) => set({ pricing: { ...defaults.pricing, callForPrice: e.target.checked } })} className="h-4 w-4" />
            Prices require a quote (“call for price”) by default
          </label>
        </Section>

        <Section title="Is it available?" description="How availability is determined when we don’t have live inventory.">
          <label className="sm:col-span-2 flex min-h-[44px] items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={defaults.inventory.useImportedInventory}
              onChange={(e) => set({ inventory: { ...defaults.inventory, useImportedInventory: e.target.checked } })} className="h-4 w-4" />
            Use inventory quantities from my catalog file when present
          </label>
          <div>
            <label htmlFor="default-availability" className="block text-sm font-medium text-slate-700 mb-1">Default availability otherwise</label>
            <select id="default-availability" value={defaults.inventory.defaultAvailability}
              onChange={(e) => set({ inventory: { ...defaults.inventory, defaultAvailability: e.target.value as 'in_stock' | 'out_of_stock' } })}
              className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm">
              <option value="in_stock">In stock</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </div>
          <NumberField id="freshness-seconds" label="Inventory data freshness (seconds)" value={defaults.inventory.freshnessSeconds}
            hint="How long imported stock counts may be treated as current before an agent should re-check."
            error={errorFor('freshnessSeconds')}
            onChange={(v) => set({ inventory: { ...defaults.inventory, freshnessSeconds: v ?? 3600 } })} />
        </Section>

        <Section title="Can it be fulfilled?" description="Regions, lead time and cutoff used to check whether an order can actually be fulfilled.">
          <div className="sm:col-span-2">
            <label htmlFor="fulfillment-regions" className="block text-sm font-medium text-slate-700 mb-1">
              Regions this default applies to (comma-separated)
            </label>
            <input id="fulfillment-regions" type="text" value={defaults.fulfillment.regions.join(', ')}
              onChange={(e) => set({ fulfillment: { ...defaults.fulfillment, regions: e.target.value.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean) } })}
              className={`w-full min-h-[44px] rounded-md border px-3 py-2 text-sm ${errorFor('fulfillmentRegions') ? 'border-rose-400' : 'border-slate-300'}`}
              aria-invalid={Boolean(errorFor('fulfillmentRegions'))} />
            <p className="mt-1 text-xs text-slate-500">
              Any region you serve (Step 3) but don’t list here is treated as not reachable by default — set a product
              exception for items that ship more narrowly, or edit this to match the regions you serve.
            </p>
            {errorFor('fulfillmentRegions') && <p className="mt-1 text-xs text-rose-700">{errorFor('fulfillmentRegions')}</p>}
          </div>
          <NumberField id="lead-time" label="Lead time (days)" value={defaults.fulfillment.leadTimeDays}
            error={errorFor('leadTimeDays')}
            onChange={(v) => set({ fulfillment: { ...defaults.fulfillment, leadTimeDays: v } })} />
          <NumberField id="cutoff-hour" label="Same-day order cutoff (local hour, 0–23)" value={defaults.fulfillment.cutoffHourLocal}
            error={errorFor('cutoffHourLocal')}
            onChange={(v) => set({ fulfillment: { ...defaults.fulfillment, cutoffHourLocal: v } })} />
          <NumberField id="acceptance-buffer" label="Order-acceptance buffer before close (minutes)" value={defaults.fulfillment.orderAcceptanceBufferMinutes}
            hint="Minutes before closing that the store stops accepting same-day orders."
            error={errorFor('orderAcceptanceBufferMinutes')}
            onChange={(v) => set({ fulfillment: { ...defaults.fulfillment, orderAcceptanceBufferMinutes: v } })} />

          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-slate-700 mb-2">Weekly operating hours (optional)</legend>
            <p className="text-xs text-slate-500 mb-3">
              Only needed for pickup or local delivery. Leave a day unchecked if you’re closed that day.
            </p>
            <div className="space-y-2">
              {ALL_DAYS.map(({ id, label }) => {
                const entry = scheduleByDay.get(id);
                const open = Boolean(entry);
                return (
                  <div key={id} className="flex flex-wrap items-center gap-3">
                    <label className="flex min-h-[44px] w-36 items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={open} className="h-4 w-4"
                        onChange={(e) => setDaySchedule(id, e.target.checked, entry?.opensAt, entry?.closesAt)} />
                      {label}
                    </label>
                    {open && (
                      <>
                        <label className="flex items-center gap-1 text-xs text-slate-600">
                          Opens
                          <input type="time" value={entry?.opensAt ?? '09:00'} aria-label={`${label} opens at`}
                            onChange={(e) => setDaySchedule(id, true, e.target.value, entry?.closesAt)}
                            className="min-h-[36px] rounded-md border border-slate-300 px-2 py-1" />
                        </label>
                        <label className="flex items-center gap-1 text-xs text-slate-600">
                          Closes
                          <input type="time" value={entry?.closesAt ?? '17:00'} aria-label={`${label} closes at`}
                            onChange={(e) => setDaySchedule(id, true, entry?.opensAt, e.target.value)}
                            className="min-h-[36px] rounded-md border border-slate-300 px-2 py-1" />
                        </label>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>
        </Section>

        <Section title="How long is the answer valid?" description="How long a quoted price should be honored.">
          <NumberField id="quote-validity" label="Quote validity (seconds)" value={defaults.quote.validitySeconds}
            error={errorFor('validitySeconds')}
            onChange={(v) => set({ quote: { validitySeconds: v ?? 900 } })} />
        </Section>

        <p className="text-xs text-slate-500">
          Promotions, loyalty pricing and restricted-goods workflows are not included in this version of RetailAgentOS.
          They do not appear here and will not affect your readiness result.
        </p>
      </div>
    </div>
  );
}
