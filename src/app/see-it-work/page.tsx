import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Building2, Store, Truck, Code2 } from 'lucide-react';
import { COMMERCIAL_DEMO_TRACKS, DEVELOPER_DEMO_TRACK } from '@/lib/content/demoTracks';

export const metadata: Metadata = {
  title: 'See It Work | RetailAgentOS',
  description:
    'Choose the scenario closest to your role and watch RetailAgentOS work — no setup, signup or technical knowledge required.',
};

const icons: Record<string, typeof Building2> = {
  enterprise: Building2,
  independent: Store,
  platform: Truck,
};

export default function SeeItWorkPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">

      {/* Hero */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Choose your demo
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-tight">
          See how RetailAgentOS works for you.
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
          Choose the scenario closest to your role. No setup, signup or technical knowledge required.
        </p>
        <p className="mt-3 text-sm font-medium text-slate-500">
          Right product. Right price. A cart that works&mdash;for one store or thousands.
        </p>
      </div>

      {/* Three primary commercial demo cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-14">
        {COMMERCIAL_DEMO_TRACKS.map((track) => {
          const Icon = icons[track.id];
          return (
            <div
              key={track.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">{track.audience}</p>
              <h2 className="text-lg font-bold text-slate-900 mb-2 leading-snug">{track.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-5 flex-1">{track.description}</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-400">{track.duration}</span>
                <Link
                  href={track.href}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors min-h-[44px]"
                >
                  {track.ctaLabel} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Developer path — visually secondary */}
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
            <Code2 className="w-5 h-5 text-slate-500" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{DEVELOPER_DEMO_TRACK.audience}</p>
            <h2 className="text-base font-bold text-slate-900 mb-1">{DEVELOPER_DEMO_TRACK.title}</h2>
            <p className="text-sm text-slate-600 leading-relaxed">{DEVELOPER_DEMO_TRACK.description}</p>
          </div>
          <Link
            href={DEVELOPER_DEMO_TRACK.href}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors min-h-[44px]"
          >
            {DEVELOPER_DEMO_TRACK.ctaLabel} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

    </div>
  );
}
