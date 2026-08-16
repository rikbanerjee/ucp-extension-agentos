import Link from 'next/link';
import { Building2, Store, Truck, Check } from 'lucide-react';
import { AUDIENCES } from '@/lib/content/audiences';

const icons = {
  'enterprise-retail': Building2,
  'independent-retail': Store,
  'commerce-platforms': Truck,
} as const;

// Small, clearly secondary demo links — the solution-page link above remains
// the card's primary action.
const demoLinks = {
  'enterprise-retail': { href: '/guided/enterprise', label: 'See the 2-minute scenario' },
  'independent-retail': { href: '/guided/independent', label: 'See the 90-second boutique demo' },
  'commerce-platforms': { href: '/guided/platform', label: 'See the 2-minute multi-merchant scenario' },
} as const;

export function AudienceCards() {
  return (
    <section id="audiences" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">No jargon</p>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 max-w-2xl mx-auto">
          Different businesses. One shared problem: AI does not understand their commerce rules.
        </h2>
        <p className="mt-4 text-slate-500 max-w-xl mx-auto leading-relaxed">
          Choose the perspective closest to yours. We&rsquo;ll explain the value without
          protocols, specifications or architecture diagrams.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {AUDIENCES.map((audience) => {
          const Icon = icons[audience.id];
          return (
            <div
              key={audience.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-7 shadow-sm text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5">
                <Icon className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {audience.label}
              </p>
              <h3 className="text-lg font-bold text-slate-900 mb-3 leading-snug">
                {audience.headline}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {audience.body}
              </p>
              <ul className="space-y-2 mb-6 flex-1">
                {audience.valuePoints.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={audience.href}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
              >
                {audience.cta} &rarr;
              </Link>
              <Link
                href={demoLinks[audience.id].href}
                className="mt-2 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                {demoLinks[audience.id].label} &rarr;
              </Link>
            </div>
          );
        })}
      </div>

      <div className="mt-10 text-center">
        <p className="text-sm text-slate-500 mb-2">
          Building the infrastructure? Explore the open specifications, reference engine and live playground.
        </p>
        <Link
          href="/developers"
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          For developers &rarr;
        </Link>
      </div>
    </section>
  );
}
