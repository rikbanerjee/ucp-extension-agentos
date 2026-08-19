'use client';

import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import type { StepProps } from '../StudioWizard';
import { analyzeReadiness, buildExecutiveAnswers, topGaps, buildBuildPlan, generateAllArtifacts } from '@/lib/readiness';
import { StatusBadge } from '../StatusBadge';
import { downloadTextFile } from '../downloadFile';

const OWNER_LABEL: Record<string, string> = {
  retail_sme: 'Retail SME',
  product_operations: 'Product/Operations',
  site_admin: 'Site Administrator',
  platform: 'Commerce Platform',
  developer: 'Developer',
};

export default function Step7Results({ session }: StepProps) {
  const [tab, setTab] = useState<'summary' | 'plan'>('summary');
  // Captured once per mount (not on every render) — the generatedAt timestamp
  // in every downloaded artifact must stay stable while the user is on this step.
  const [generatedAt] = useState(() => Date.now());

  const result = useMemo(() => analyzeReadiness(session, generatedAt), [session, generatedAt]);
  const answers = useMemo(() => buildExecutiveAnswers(session, result), [session, result]);
  const gaps = useMemo(() => topGaps(result), [result]);
  const plan = useMemo(() => buildBuildPlan(session), [session]);
  const artifacts = useMemo(() => generateAllArtifacts(session, result), [session, result]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Your results</h1>
      <p className="mt-2 text-slate-600 max-w-2xl">
        Right product. Right price. A cart that works — here’s where {session.storeProfile?.storeName || 'your store'} stands today.
      </p>

      <div role="tablist" aria-label="Results view" className="mt-6 inline-flex rounded-lg border border-slate-200 p-1">
        {(['summary', 'plan'] as const).map((t) => (
          <button
            key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)}
            className={`min-h-[40px] rounded-md px-4 py-1.5 text-sm font-semibold ${tab === t ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {t === 'summary' ? 'Executive Summary' : 'Build Plan'}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">UCP readiness</h2>
                <StatusBadge status={result.ucp.status} />
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Whether a real UCP endpoint could be installed and verified from what you’ve told the Studio so far.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">RetailAgentOS readiness</h2>
                <StatusBadge status={result.raos.status} />
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Whether the decision layer (eligibility, pricing, inventory, fulfilment) has what it needs to answer
                correctly for your catalog.
              </p>
            </div>
          </div>

          {answers.map((a) => (
            <div key={a.question} className="rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-semibold text-slate-900">{a.question}</h2>
                <StatusBadge status={a.status} />
              </div>
              <p className="mt-2 text-sm text-slate-700">{a.answer}</p>
            </div>
          ))}

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="font-semibold text-amber-900">Top 3 highest-impact gaps</h2>
            <ul className="mt-3 space-y-2 text-sm text-amber-900">
              {gaps.length === 0 && <li>No blocking gaps found.</li>}
              {gaps.map((g) => <li key={g.id}>• {g.explanation}</li>)}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <h2 className="font-semibold text-emerald-900">What your retail team can do now</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-emerald-900 list-disc pl-4">
                <li>Finish cleaning up your catalog and store rules in the Readiness Studio.</li>
                <li>Review product exceptions and confirm they match how you actually sell.</li>
                <li>Share this kit with whoever manages your site or commerce platform.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-semibold text-slate-900">What your platform or site team must do</h2>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-700 list-disc pl-4">
                <li>Expose live catalog, cart and checkout endpoints.</li>
                <li>Verify those endpoints against UCP conformance tests.</li>
                <li>Connect checkout to your commerce platform.</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-slate-900 bg-slate-900 p-5 text-white">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-300">Next best action</h2>
            <p className="mt-2 text-base font-semibold">
              {result.ucp.status === 'needs_platform_installation'
                ? 'Download the implementation kit and hand it to your site administrator, commerce platform, or developer to expose live endpoints.'
                : result.ucp.status === 'needs_live_verification'
                  ? 'Have your site administrator or commerce platform verify your candidate endpoints, then re-run conformance checks.'
                  : 'Finish your catalog and store details, then download your implementation kit.'}
            </p>
          </div>
        </div>
      )}

      {tab === 'plan' && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Task', 'Why it matters', 'Owner', 'Status'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-2 text-left font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plan.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3 font-medium text-slate-900 align-top">{item.task}</td>
                  <td className="px-4 py-3 text-slate-600 align-top max-w-xs">{item.why}</td>
                  <td className="px-4 py-3 text-slate-600 align-top">{OWNER_LABEL[item.owner]}</td>
                  <td className="px-4 py-3 align-top"><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-10 rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-900">Download your implementation kit</h2>
        <p className="mt-1 text-sm text-slate-500">
          Generated locally in this browser. Hand these to your developer, site administrator, or commerce platform.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {artifacts.map((a) => (
            <button
              key={a.filename} type="button"
              onClick={() => downloadTextFile(a.filename, a.content, a.mimeType)}
              className="flex min-h-[44px] items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              <Download size={15} aria-hidden="true" />
              {a.filename}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-500 max-w-2xl">
        No developer was required to assess your catalog, map your business rules, preview the result, or create this
        kit. A site administrator, commerce platform, or engineering team may still be needed to expose live endpoints
        and connect checkout.
      </p>
    </div>
  );
}
