import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const merchants = [
  {
    humanName: "Sara's Boutique",
    archetype: 'Discovery-Led Retail',
    before: 'AI shopping assistants never recommend her handcrafted products — she has no machine-readable way to declare what she sells or who it’s for.',
    after: 'She declares her catalog once. Any agent helping a shopper find personalised gifts now finds her.',
    href: '/solutions/independent-retail#agent-demo',
    cta: 'See the boutique discovery demo',
  },
  {
    humanName: 'B&T Wholesale',
    archetype: 'Qualification-First Commerce',
    before: 'Tiered pricing and buyer-qualification rules are invisible to agents. Buyers get quoted the wrong price, or see listings they can’t purchase.',
    after: 'RetailAgentOS enforces qualification gates and volume pricing automatically. Agents always quote the right tier to the right buyer.',
    href: '/demo?scenario=wholesale_gating',
    cta: 'See qualification and pricing',
  },
  {
    humanName: 'Fresh Corner Market',
    archetype: 'Contextual Offers & Fulfilment',
    before: 'Agents route buyers toward fulfilment modes the store can’t support, and weekly promos aren’t visible at browse time.',
    after: 'RetailAgentOS surfaces active promo pricing and flags unsupported fulfilment modes before the buyer wastes a trip.',
    href: '/demo?scenario=grocery_offers',
    cta: 'See availability and fulfilment',
  },
];

export function RetailBreadth() {
  return (
    <section id="retail-breadth" className="scroll-mt-20 mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          One decision layer. Very different kinds of retail.
        </h2>
        <p className="mt-3 text-slate-500 max-w-xl mx-auto leading-relaxed">
          The rules change by retailer. The need for a reliable answer does not.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {merchants.map(({ humanName, archetype, before, after, href, cta }) => (
          <div key={humanName} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-left">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{archetype}</span>
            <h3 className="text-lg font-bold text-slate-900 mb-4">{humanName}</h3>
            <div className="space-y-3 mb-5 flex-1">
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-3">
                <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1">What AI gets wrong today</div>
                <p className="text-sm text-slate-700 leading-relaxed">{before}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">What RetailAgentOS answers correctly</div>
                <p className="text-sm text-slate-700 leading-relaxed">{after}</p>
              </div>
            </div>
            <div className="flex flex-col items-start gap-2">
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
              >
                {cta} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
