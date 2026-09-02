import { Check, X } from 'lucide-react';
import { SHOWCASE_ANCHORS } from '@/lib/content/showcaseChrome';

const ORDINARY_AUTOMATION = [
  'Guesses from buttons and product text',
  'May act on stale inventory',
  'May invent substitutes, prices, or delivery promises',
  'May proceed beyond merchant policy',
];

const WITH_RETAILAGENTOS = [
  'Uses typed storefront capabilities',
  'Receives deterministic merchant decisions',
  'Gets merchant-valid repairs',
  'Exposes only the next safe action',
  'Never receives a checkout capability in this showcase',
];

/**
 * The "How It Works" destination in the focused challenge header: a compact, business-readable
 * contrast a retail executive can absorb in well under a minute. Schema and tool detail belongs
 * in Developer Evidence below, not here.
 */
export function WhyWebMcp() {
  return (
    <section
      id={SHOWCASE_ANCHORS.whyWebMcp}
      tabIndex={-1}
      aria-labelledby="why-webmcp-heading"
      className="showcase-anchor mt-6 rounded-xl border border-slate-200 bg-white p-4 outline-none sm:p-5"
    >
      <h2 id="why-webmcp-heading" className="text-lg font-bold text-slate-900">
        Why the storefront becomes meaningfully better with WebMCP
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-900">Ordinary browser automation</h3>
          <ul className="mt-2 space-y-1.5">
            {ORDINARY_AUTOMATION.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-slate-700">
                <X size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <h3 className="text-sm font-bold text-emerald-900">RetailAgentOS with WebMCP</h3>
          <ul className="mt-2 space-y-1.5">
            {WITH_RETAILAGENTOS.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-emerald-900">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
