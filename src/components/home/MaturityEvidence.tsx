import Link from 'next/link';
import { CheckCircle2, CircleDashed, PenLine } from 'lucide-react';
import { SCORECARD_SECTIONS, SUMMARY_STATS } from '@/app/evidence/scorecard-data';

// Derived, not hand-typed: counts come straight from the same scorecard data
// module /evidence renders, so this section can never drift from the public
// scorecard (AGENTS.md: don't scatter mutable proof numbers).
const allRows = SCORECARD_SECTIONS.flatMap((section) => section.rows);
const builtCount = allRows.filter((r) => r.status === 'built').length;
const partialCount = allRows.filter((r) => r.status === 'partial').length;
const plannedCount = allRows.filter((r) => r.status === 'designed' || r.status === 'planned').length;

const testStat = SUMMARY_STATS.find((s) => s.label.toLowerCase().includes('tests'));

const categories = [
  {
    icon: CheckCircle2,
    title: 'Built and tested',
    count: builtCount,
    color: 'emerald',
    body: 'Eligibility, contextual pricing, inventory, quote integrity and the trust/provenance envelope all run against a tested reference engine.',
  },
  {
    icon: CircleDashed,
    title: 'In pilot or partially built',
    count: partialCount,
    color: 'amber',
    body: 'Fulfilment checks modes, regions, lead time, cutoff, operating hours, order buffers and need-by dates. Live delivery windows and courier routing remain out of scope.',
  },
  {
    icon: PenLine,
    title: 'Designed or planned',
    count: plannedCount,
    color: 'slate',
    body: 'Promotion stacking, loyalty and restricted-goods enforcement are specified but not yet implemented.',
  },
];

const colorClasses: Record<string, string> = {
  emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600',
  amber: 'bg-amber-50 border-amber-100 text-amber-600',
  slate: 'bg-slate-100 border-slate-200 text-slate-500',
};

export function MaturityEvidence() {
  return (
    <section id="maturity" className="scroll-mt-20 bg-slate-50 border-y border-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="text-center mb-4">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Built in the open. Clear about what is real.
          </h2>
          {testStat && (
            <p className="mt-3 text-slate-500 max-w-xl mx-auto leading-relaxed">
              {testStat.value} automated tests currently pass against the reference engine.
              Every claim on this page is checked against that same evidence.
            </p>
          )}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {categories.map(({ icon: Icon, title, count, color, body }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-left">
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center mb-4 ${colorClasses[color]}`}>
                <Icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <p className="text-2xl font-black text-slate-900">{count}</p>
              <h3 className="text-sm font-semibold text-slate-900 mt-1 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          <Link href="/evidence" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
            See the public scorecard &rarr;
          </Link>
          <Link href="/evidence/conformance" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
            View conformance &rarr;
          </Link>
          <Link href="/buildlog" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
            Follow the build &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
