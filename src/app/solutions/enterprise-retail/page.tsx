import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, ShieldCheck, GitBranch, Gauge, Layers } from 'lucide-react';
import { SUMMARY_STATS } from '@/app/evidence/scorecard-data';
import { NextBestAction } from '@/components/guided/NextBestAction';
import { ENTERPRISE_MAILTO, ENTRY_CTA_LABEL } from '@/lib/content/demoTracks';

export const metadata: Metadata = {
  title: 'For Enterprise Retail Leaders | RetailAgentOS',
  description:
    'Keep every AI shopping channel aligned with your retail policies — consistent eligibility, pricing and fulfilment answers, explainable and auditable across every AI surface.',
};

const breaksIndependently = [
  'Each AI channel builds its own interpretation of pricing and eligibility rules — and they drift apart.',
  'Fulfilment promises made by an AI agent don’t match what operations can actually deliver.',
  'No one can explain, after the fact, why an AI surface approved or denied a specific customer.',
  'Every new AI integration re-implements the same policy logic, at a different quality bar.',
];

const outcomes = [
  {
    icon: Layers,
    title: 'Consistency',
    body: 'One decision layer sits behind every AI channel, so pricing, eligibility and fulfilment answers are identical whether the question comes from your own assistant or a third-party agent.',
  },
  {
    icon: ShieldCheck,
    title: 'Governance and explainability',
    body: 'Every decision carries a machine-readable reason. Operators and auditors can see exactly why an AI surface made the call it made — no black box.',
  },
  {
    icon: GitBranch,
    title: 'Faster channel enablement',
    body: 'New AI channels reuse the same decision model instead of re-implementing policy logic. Enabling a new surface becomes a configuration exercise, not a rebuild.',
  },
];

const decisionFlow = [
  { step: '1', label: 'Channel asks a question', body: 'An AI shopping surface asks: can this customer buy this, at what price, fulfilled how?' },
  { step: '2', label: 'RetailAgentOS evaluates policy', body: 'It runs your eligibility, pricing and fulfilment rules against the buyer and transaction context.' },
  { step: '3', label: 'A governed answer returns', body: 'The channel gets a decision and a reason — the same one every other channel would get for the same inputs.' },
];

export default function EnterpriseRetailPage() {
  const testStat = SUMMARY_STATS.find((s) => s.label.toLowerCase().includes('tests'));

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Executive hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Enterprise Retail Leaders
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-tight">
            Keep every AI shopping channel
            <br />
            <span className="text-slate-500">aligned with your retail policies.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            RetailAgentOS helps AI assistants apply the same product, pricing, eligibility and
            fulfilment rules your business already uses&mdash;across every AI shopping experience.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/guided/enterprise"
              className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              {ENTRY_CTA_LABEL.enterprise} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/adopt"
              className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
            >
              Explore enterprise adoption <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/retailer-readiness"
              className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 transition-colors flex items-center gap-2"
            >
              Map our catalog and rules <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* What breaks */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">What breaks when AI channels interpret your rules independently</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {breaksIndependently.map((item) => (
              <div key={item} className="rounded-xl border border-rose-200 bg-rose-50/60 p-5">
                <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Three enterprise outcomes */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Three outcomes for the enterprise</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {outcomes.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Representative decision flow */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">A representative decision</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {decisionFlow.map(({ step, label, body }) => (
              <div key={step} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4">
                <span className="shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">{step}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{label}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Relationship to existing systems */}
        <div className="mb-20 rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <div className="flex items-start gap-4">
            <Gauge className="w-6 h-6 text-slate-400 shrink-0 mt-1" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">Where this sits relative to your commerce stack</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                RetailAgentOS is a decision and translation layer, not a replacement for your ERP,
                OMS, PIM, POS, pricing engine, inventory system, loyalty platform or fulfilment
                systems. It reads truth from those systems and turns your existing policies into
                consistent, explainable answers that AI channels can act on — it does not own or
                replace the systems of record.
              </p>
            </div>
          </div>
        </div>

        {/* Current maturity */}
        <div className="mb-20 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Current product maturity</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Eligibility, contextual pricing, inventory, quote integrity and the trust/provenance
            envelope are built and tested
            {testStat ? ` — ${testStat.value} automated checks pass today` : ''}. Promotion stacking,
            loyalty, restricted-goods enforcement and live multi-tenant infrastructure are designed
            or planned, not yet production-ready — see the scorecard for the exact line.
          </p>
          <Link href="/evidence" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
            See the public scorecard &rarr;
          </Link>
        </div>

        {/* Pilot / adoption CTA */}
        <NextBestAction
          variant="dark"
          heading="Ready to test one of your retail policies?"
          body="Bring one difficult pricing, qualification or fulfilment rule. See how an AI shopping channel should handle it."
          primaryLabel="Map a retail scenario"
          primaryHref={ENTERPRISE_MAILTO}
          secondaryLabel="Read the adoption guide"
          secondaryHref="/adopt"
        />

      </div>
    </div>
  );
}
