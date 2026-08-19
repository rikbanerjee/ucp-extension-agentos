'use client';

import { useMemo, useState } from 'react';
import type { StepProps } from '../StudioWizard';
import type { FulfillmentModeId, StoreProfile } from '@/lib/readiness';
import { DEFAULT_STORE_PROFILE, applyDefaultCurrency, validateStoreProfile } from '@/lib/readiness';

const FULFILLMENT_OPTIONS: { id: FulfillmentModeId; label: string }[] = [
  { id: 'shipping', label: 'Shipping' },
  { id: 'pickup', label: 'Pickup' },
  { id: 'local_delivery', label: 'Local delivery' },
];

const CURRENCIES = ['USD', 'CAD', 'GBP', 'EUR', 'AUD'];
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'Europe/London', 'Europe/Berlin', 'Australia/Sydney',
];

export default function Step3StoreDetails({ session, updateSession }: StepProps) {
  const [profile, setProfile] = useState<StoreProfile>(session.storeProfile ?? DEFAULT_STORE_PROFILE);
  const [touched, setTouched] = useState(false);

  // Single validator shared with `StudioWizard.canContinue` — Step 3's
  // inline errors and the wizard's progression gate can never disagree.
  const fieldErrors = useMemo(() => validateStoreProfile(profile), [profile]);
  const errorFor = (field: string) => (touched ? fieldErrors.find((e) => e.field === field)?.message : undefined);
  const nameError = errorFor('storeName');
  const domainError = errorFor('storeDomain');
  const regionsError = errorFor('regions');
  const fulfillmentModesError = errorFor('fulfillmentModes');
  const urlErrors = {
    catalogEndpoint: errorFor('catalogEndpoint'),
    cartEndpoint: errorFor('cartEndpoint'),
    checkoutEndpoint: errorFor('checkoutEndpoint'),
  };

  function commit(next: StoreProfile) {
    setProfile(next);
    setTouched(true);
    const currencyChanged = next.currency !== session.storeProfile?.currency;
    const importResult = session.importResult && currencyChanged
      ? { ...session.importResult, rows: applyDefaultCurrency(session.importResult.rows, next.currency) }
      : session.importResult;

    // Keep the store-wide fulfilment "regions this default applies to"
    // (Step 4) in sync with the regions you actually serve here, as long as
    // you haven't already customized it away from that default in Step 4.
    // Without this, a fresh regions edit here (e.g. adding CA) would leave
    // every product's effective fulfilment allowlist stuck on the stale
    // ['US'] default, and REGION_NOT_SERVED would fire for every product in
    // every newly-added region — a silent over-restriction, not a real rule.
    const prevRegions = session.storeProfile?.regions ?? [];
    const regionsChanged = next.regions.join('|') !== prevRegions.join('|');
    const fulfillmentRegionsWasDefault = session.ruleDefaults.fulfillment.regions.join('|') === prevRegions.join('|');
    const ruleDefaults = regionsChanged && fulfillmentRegionsWasDefault
      ? { ...session.ruleDefaults, fulfillment: { ...session.ruleDefaults.fulfillment, regions: next.regions } }
      : session.ruleDefaults;

    updateSession({ storeProfile: next, importResult, ruleDefaults });
  }

  function toggleMode(mode: FulfillmentModeId) {
    const has = profile.fulfillmentModes.includes(mode);
    const modes = has ? profile.fulfillmentModes.filter((m) => m !== mode) : [...profile.fulfillmentModes, mode];
    commit({ ...profile, fulfillmentModes: modes });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tell us about your store</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        These basic facts let RetailAgentOS evaluate pricing, region and fulfilment rules correctly.
      </p>

      {touched && fieldErrors.length > 0 && (
        <div role="alert" aria-live="polite" className="mt-4 max-w-3xl rounded-md border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-900">Fix {fieldErrors.length === 1 ? 'this' : 'these'} before continuing:</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-rose-800">
            {fieldErrors.map((e) => <li key={e.field}>{e.message}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-6 grid gap-6 sm:grid-cols-2 max-w-3xl">
        <div>
          <label htmlFor="store-name" className="block text-sm font-medium text-slate-700 mb-1">Store name</label>
          <input
            id="store-name" type="text" value={profile.storeName}
            onChange={(e) => commit({ ...profile, storeName: e.target.value })}
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm"
            aria-invalid={Boolean(nameError)} aria-describedby={nameError ? 'store-name-error' : undefined}
          />
          {nameError && <p id="store-name-error" className="mt-1 text-xs text-rose-700">{nameError}</p>}
        </div>

        <div>
          <label htmlFor="store-domain" className="block text-sm font-medium text-slate-700 mb-1">Store domain</label>
          <input
            id="store-domain" type="text" placeholder="rosemaryandrye.com" value={profile.storeDomain}
            onChange={(e) => commit({ ...profile, storeDomain: e.target.value })}
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm"
            aria-invalid={Boolean(domainError)} aria-describedby={domainError ? 'store-domain-error' : undefined}
          />
          {domainError && <p id="store-domain-error" className="mt-1 text-xs text-rose-700">{domainError}</p>}
        </div>

        <div>
          <label htmlFor="store-currency" className="block text-sm font-medium text-slate-700 mb-1">Default currency</label>
          <select
            id="store-currency" value={profile.currency}
            onChange={(e) => commit({ ...profile, currency: e.target.value })}
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="store-timezone" className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
          <select
            id="store-timezone" value={profile.timezone}
            onChange={(e) => commit({ ...profile, timezone: e.target.value })}
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="store-regions" className="block text-sm font-medium text-slate-700 mb-1">
            Regions you serve (comma-separated country or state codes)
          </label>
          <input
            id="store-regions" type="text" value={profile.regions.join(', ')}
            onChange={(e) => commit({ ...profile, regions: e.target.value.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean) })}
            className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm"
            aria-invalid={Boolean(regionsError)} aria-describedby={regionsError ? 'store-regions-error' : undefined}
          />
          {regionsError && <p id="store-regions-error" className="mt-1 text-xs text-rose-700">{regionsError}</p>}
        </div>

        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium text-slate-700 mb-2">Fulfilment modes you support</legend>
          <div className="flex flex-wrap gap-4">
            {FULFILLMENT_OPTIONS.map(({ id, label }) => (
              <label key={id} className="flex min-h-[44px] items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={profile.fulfillmentModes.includes(id)} onChange={() => toggleMode(id)} className="h-4 w-4" />
                {label}
              </label>
            ))}
          </div>
          {fulfillmentModesError && <p className="mt-2 text-xs text-rose-700">{fulfillmentModesError}</p>}
        </fieldset>
      </div>

      <details className="mt-8 max-w-3xl rounded-xl border border-slate-200 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-800">Advanced: candidate endpoint URLs (optional)</summary>
        <p className="mt-2 text-xs text-slate-500">
          If your team already has candidate UCP endpoints, add them here. They will be marked as drafts requiring live
          verification — the Studio never calls them.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {(['catalogEndpoint', 'cartEndpoint', 'checkoutEndpoint'] as const).map((field) => (
            <div key={field}>
              <label htmlFor={field} className="block text-xs font-medium text-slate-600 mb-1 capitalize">
                {field.replace('Endpoint', '')} URL
              </label>
              <input
                id={field} type="text" value={profile[field] ?? ''}
                onChange={(e) => commit({ ...profile, [field]: e.target.value || undefined })}
                className="w-full min-h-[44px] rounded-md border border-slate-300 px-3 py-2 text-sm"
                aria-invalid={Boolean(urlErrors[field])}
              />
              {urlErrors[field] && <p className="mt-1 text-xs text-rose-700">{urlErrors[field]}</p>}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
