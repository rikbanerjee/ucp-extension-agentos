import Link from 'next/link';
import { buildLog } from '@/lib/content/buildlog';
import { ArrowRight, Link2 } from 'lucide-react';

export const metadata = {
  title: 'Build Log — RetailAgentOS',
  description:
    'Building the reasoning layer that fills the gap between UCP and what agents need to act on a merchant\'s store — logged week by week.',
  openGraph: {
    title: 'Build Log — RetailAgentOS',
    description:
      'Week-by-week record of building RetailAgentOS in public. UCP = the rails. RetailAgentOS = the reasoning layer that fills the gap.',
  },
};

export default function BuildLogPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            Building in public
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-4">Build Log</h1>
          <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
            Building the reasoning layer that fills the gap between UCP and what agents need
            to act on a merchant&apos;s store — logged week by week.
          </p>
          <p className="mt-3 text-sm text-slate-500 max-w-xl">
            UCP = the rails. RetailAgentOS = the layer that makes a merchant&apos;s rules
            machine-readable. Each entry is what shipped, what it proves, and what&apos;s next.
          </p>

          {/* Up next */}
          <div className="mt-6 inline-flex items-start gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 max-w-2xl">
            <span className="text-xs font-semibold bg-slate-200 text-slate-600 rounded-full px-2.5 py-0.5 shrink-0 mt-0.5">Up next</span>
            <p className="text-sm text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Making the last simulated seams real.</span>{' '}
              The engine is deterministic and the specs are live. What remains: a real MCP server
              that agents can actually query, and cryptographic signatures a third party can
              independently verify. No timeline overclaim — these ship when they ship correctly.
            </p>
          </div>
        </div>

        {/* Entries */}
        <div className="space-y-8">
          {buildLog.map((entry) => (
            <div
              key={entry.id}
              id={entry.id}
              className={`rounded-2xl border p-7 shadow-sm scroll-mt-8 ${
                entry.current
                  ? 'border-emerald-200 bg-emerald-50/30'
                  : 'border-slate-200 bg-white'
              }`}
            >
              {/* Entry header */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {entry.week} · {entry.date}
                    </span>
                    {entry.current && (
                      <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5">
                        Latest
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{entry.title}</h2>
                </div>
                <a
                  href={`#${entry.id}`}
                  className="text-slate-300 hover:text-slate-500 transition-colors shrink-0 mt-1"
                  title="Copy link to this entry"
                >
                  <Link2 className="w-4 h-4" />
                </a>
              </div>

              {/* Narrative — builder's voice */}
              <p className="text-[15px] leading-7 text-slate-600 mb-5">{entry.narrative}</p>

              {/* Bullets */}
              <ul className="space-y-2 mb-5">
                {entry.bullets.map((bullet) => (
                  <li key={bullet} className="text-sm text-slate-700 flex items-start gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${entry.current ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    {bullet}
                  </li>
                ))}
              </ul>

              {/* Proves */}
              <div className={`rounded-lg border px-4 py-3 mb-4 ${entry.current ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">What this proves · </span>
                <span className="text-sm text-slate-700">{entry.proves}</span>
              </div>

              {/* Next */}
              {entry.next && (
                <p className="text-sm text-slate-500">
                  <span className="font-semibold text-slate-600">What&apos;s next: </span>
                  {entry.next}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Footer nav */}
        <div className="mt-14 pt-8 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4">
          <p className="text-sm text-slate-500">
            Following the build?{' '}
            <a href="#" className="text-slate-700 font-medium hover:text-slate-900 underline underline-offset-2 transition-colors">
              {/* TODO: real LinkedIn URL */}
              Follow on LinkedIn
            </a>
            {' '}·{' '}
            <a href="#" className="text-slate-700 font-medium hover:text-slate-900 underline underline-offset-2 transition-colors">
              {/* TODO: real Substack URL */}
              Read the thinking on Substack
            </a>
          </p>
          <Link
            href="/vision"
            className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1.5"
          >
            See what&apos;s being built next <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}
