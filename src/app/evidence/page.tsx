import Link from 'next/link';
import type { Metadata } from 'next';
import {
  SCORECARD_SECTIONS,
  STATUS_META,
  SUMMARY_STATS,
  CLAIMS_WE_DONT_MAKE,
  VERIFIED_DATE,
  type ScorecardRow,
} from './scorecard-data';

export const metadata: Metadata = {
  title: 'Evidence — the public scorecard | RetailAgentOS',
  description:
    'Every reference-architecture requirement, graded against what is verifiably in the repo today — built, designed, planned, or an explicit non-goal. No adjectives, only file paths and test suites.',
};

function StatusBadge({ status, statusNote }: { status: ScorecardRow['status']; statusNote?: string }) {
  const meta = STATUS_META[status];
  const styles: Record<string, string> = {
    built: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    partial: 'bg-amber-50 text-amber-700 border-amber-200',
    designed: 'bg-sky-50 text-sky-700 border-sky-200',
    planned: 'bg-slate-50 text-slate-500 border-slate-200',
    'non-goal': 'bg-slate-100 text-slate-500 border-slate-200',
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[status]}`}
      >
        <span aria-hidden="true">{meta.glyph}</span>
        {meta.label}
      </span>
      {statusNote && (
        <span className="text-xs text-slate-400 italic">{statusNote}</span>
      )}
    </div>
  );
}

export default function EvidencePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* Header */}
        <div className="mb-10">
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">
            Evidence
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
            The public scorecard
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
            No vendor publishes this. Here is exactly what&apos;s real, what&apos;s specified, and
            what&apos;s still paper — graded row by row against a reference architecture for a
            merchant reasoning layer, with a file path or test suite behind every checkmark.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Verified {VERIFIED_DATE} ·{' '}
            <Link href="/specs" className="text-emerald-600 hover:underline">
              Open specs
            </Link>{' '}
            ·{' '}
            <Link href="/adopt" className="text-emerald-600 hover:underline">
              Adoption guide
            </Link>
          </p>
        </div>

        {/* Summary stats */}
        <section className="mb-12">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {SUMMARY_STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col"
              >
                <span className="text-2xl font-extrabold text-slate-900 tabular-nums">{stat.value}</span>
                <span className="text-xs font-semibold text-slate-600 mt-1">{stat.label}</span>
                <span className="text-[11px] text-slate-400 mt-1.5 leading-snug">{stat.detail}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Legend */}
        <section className="mb-12 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            How to read the status column
          </p>
          <dl className="grid sm:grid-cols-2 gap-3">
            {Object.values(STATUS_META).map((meta) => (
              <div key={meta.status} className="flex items-start gap-2.5">
                <span aria-hidden="true" className="text-base leading-none mt-0.5">{meta.glyph}</span>
                <div>
                  <dt className="text-sm font-semibold text-slate-800">{meta.label}</dt>
                  <dd className="text-xs text-slate-500 leading-relaxed">{meta.description}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        {/* Scorecard sections */}
        {SCORECARD_SECTIONS.map((section) => (
          <section key={section.id} className="mb-12">
            <h2 className="text-lg font-bold text-slate-900 mb-4">{section.title}</h2>
            <div className="space-y-3">
              {section.rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono font-semibold text-slate-400 mt-0.5">{row.id}</span>
                      <h3 className="text-sm font-semibold text-slate-900 leading-snug">{row.requirement}</h3>
                    </div>
                    <StatusBadge status={row.status} statusNote={row.statusNote} />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{row.note}</p>
                  {row.evidence && row.evidence.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {row.evidence.map((ref) => (
                        <code
                          key={ref.path}
                          title={ref.label}
                          className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1"
                        >
                          {ref.path}
                          {ref.label && <span className="text-emerald-500"> · {ref.label}</span>}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Claims we deliberately don't make yet */}
        <section className="mb-12">
          <div className="rounded-xl border border-slate-900 bg-slate-900 p-6 sm:p-8">
            <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">
              The differentiator
            </p>
            <h2 className="text-xl font-bold text-white mb-3">
              Claims we deliberately don&apos;t make yet
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6 max-w-2xl">
              Anyone can promise. The credible move is labeling exactly what isn&apos;t verified,
              right next to what is — so every ✅ above stays believable. Each of these is a
              feature that&apos;s designed, and unbuilt, on purpose.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {CLAIMS_WE_DONT_MAKE.map((item) => (
                <div key={item.claim} className="rounded-lg bg-white/5 border border-white/10 p-4">
                  <p className="text-sm font-semibold text-white mb-1">{item.claim}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.why}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer nav */}
        <div className="border-t border-slate-100 pt-8 flex flex-wrap items-center justify-between gap-3">
          <Link href="/specs" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
            All Specs
          </Link>
          <Link href="/adopt" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            See the adoption guide
          </Link>
        </div>
      </div>
    </div>
  );
}
