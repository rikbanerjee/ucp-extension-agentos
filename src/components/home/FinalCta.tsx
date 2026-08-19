import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const paths = [
  {
    audience: 'Boutique & Specialty Retailer',
    headline: 'Check my catalog',
    href: '/retailer-readiness',
  },
  {
    audience: 'Enterprise or Platform',
    headline: 'Explore adoption',
    href: '/adopt',
  },
  {
    audience: 'Developer',
    headline: 'Open the playground',
    href: '/demo',
  },
];

export function FinalCta() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8 text-center">
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">
        You&rsquo;ve seen the problem. Pick your path.
      </h2>
      <p className="text-slate-500 mb-10 max-w-lg mx-auto leading-relaxed">
        Wherever you sit — retailer, enterprise, platform or developer — there&rsquo;s a next step
        that matches how you evaluate this.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-left">
        {paths.map(({ audience, headline, href }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-6 hover:border-slate-900 hover:shadow-sm transition-all"
          >
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mb-2">{audience}</p>
              <p className="text-base font-bold text-slate-900 leading-snug">{headline}</p>
            </div>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 group-hover:text-emerald-700">
              Go <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
