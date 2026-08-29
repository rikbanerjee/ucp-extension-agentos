'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, Clipboard, Download, Printer } from 'lucide-react';
import type { StepProps } from '../StudioWizard';
import { analyzeReadiness, buildExecutiveAnswers, topGaps, buildBuildPlan, generateAllArtifacts } from '@/lib/readiness';
import type { ReadinessAudience, ReadinessStatus } from '@/lib/readiness';
import { StatusBadge, SeverityBadge } from '../StatusBadge';
import { downloadTextFile } from '../downloadFile';

const CONTACT_EMAIL = 'rikbanerjee007@gmail.com';
const OWNER_LABEL: Record<string, string> = { retail_sme: 'Your retail team', product_operations: 'Product and operations', site_admin: 'Site or platform team', platform: 'Site or platform team', developer: 'Engineering team' };
const commerceLabel = (status: ReadinessStatus) => status === 'ready_to_implement' || status === 'ready' ? 'Ready' : status === 'needs_input' ? 'Needs information' : 'Needs review';
const connectionLabel = (status: ReadinessStatus) => status === 'needs_live_verification' ? 'Needs verification' : status === 'needs_platform_installation' ? 'Ready for installation' : status === 'needs_input' ? 'Not connected' : 'Verified';

function createMailto(audience: ReadinessAudience, storeName: string, commerce: string, connection: string) {
  const subject = audience === 'enterprise' ? 'RetailAgentOS — map one live retail policy' : 'RetailAgentOS setup help';
  const lines = audience === 'enterprise'
    ? [`I completed the Retailer Readiness Studio for ${storeName}.`, '', 'I would like to map one difficult pricing, buyer qualification, inventory or fulfilment rule for a live retail policy session.']
    : [`I completed the Retailer Readiness Studio for ${storeName}.`, '', 'My current result:', `- Commerce rules: ${commerce}`, `- Live store connection: ${connection}`, '', 'I would like help understanding the next installation step.'];
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

export default function Step7Results({ session, goToStep, audience = 'direct' }: StepProps) {
  const [tab, setTab] = useState<'summary' | 'plan'>('summary');
  const [generatedAt] = useState(() => Date.now());
  const [notice, setNotice] = useState('');
  const result = useMemo(() => analyzeReadiness(session, generatedAt), [session, generatedAt]);
  const answers = useMemo(() => buildExecutiveAnswers(session, result), [session, result]);
  const gaps = useMemo(() => topGaps(result), [result]);
  const plan = useMemo(() => buildBuildPlan(session), [session]);
  const artifacts = useMemo(() => generateAllArtifacts(session, result).filter((item) => item.filename !== 'executive-summary.md'), [session, result]);
  const storeName = session.storeProfile?.storeName || 'your store';
  const commerce = commerceLabel(result.raos.status);
  const connection = connectionLabel(result.ucp.status);
  const catalogIssues = session.importResult?.blocking.length ?? 0;
  const needsRepair = result.raos.status === 'needs_input' || result.ucp.status === 'needs_input';
  const needsVerification = result.ucp.status === 'needs_live_verification';
  const mailto = createMailto(audience, storeName, commerce, connection);
  const providerInstructions = `RetailAgentOS readiness handoff for ${storeName}\n\nCommerce rules: ${commerce}\nLive store connection: ${connection}\n\nPlease connect catalog, cart and checkout endpoints, then verify the integration before launch.`;
  const summary = `RetailAgentOS result for ${storeName}\nCommerce rules: ${commerce}\nLive store connection: ${connection}\n${gaps.length ? `What still needs attention: ${gaps.map((gap) => gap.title).join('; ')}` : 'Nothing in the catalog or rules is blocking the next step.'}`;

  async function copy(text: string, success: string) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setNotice(success);
    } catch {
      setNotice('Copy is unavailable in this browser. Select the text and copy it manually.');
    }
  }
  function showPlan() { setTab('plan'); document.getElementById('implementation-plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  return <div className="print-result">
    <div className="no-print flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">Your result</h1><p className="mt-1 text-slate-600">Understand what is ready, what remains, and the next step — without a download.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => copy(summary, 'Summary copied.')} className="min-h-[44px] rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700"><Clipboard className="mr-1 inline" size={15} aria-hidden="true" />Copy summary</button><button type="button" onClick={() => window.print()} className="min-h-[44px] rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700"><Printer className="mr-1 inline" size={15} aria-hidden="true" />Print summary</button></div>
    </div>
    <p aria-live="polite" className="mt-3 text-sm text-emerald-800">{notice}</p>
    <section className={`mt-6 rounded-2xl border p-6 ${needsRepair ? 'border-amber-200 bg-amber-50' : needsVerification ? 'border-sky-200 bg-sky-50' : 'border-emerald-200 bg-emerald-50'}`}>
      {needsRepair ? <><h2 className="text-xl font-bold text-slate-900">Your catalog needs attention before AI can use it reliably.</h2><p className="mt-2 text-slate-700">{catalogIssues || 'Some'} blocking issue{catalogIssues === 1 ? '' : 's'} need attention before the Studio can make dependable shopping decisions.</p><button type="button" onClick={() => goToStep(1)} className="no-print mt-4 min-h-[44px] rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">{catalogIssues ? `Fix ${catalogIssues} catalog issue${catalogIssues === 1 ? '' : 's'}` : 'Complete store details'}</button></> : needsVerification ? <><h2 className="text-xl font-bold text-slate-900">Your store connection is prepared, but it still needs live verification.</h2><p className="mt-2 text-slate-700">The Studio has candidate endpoints, but it has not called or verified them against a live commerce system.</p></> : <><h2 className="text-xl font-bold text-slate-900">Your products and store rules are ready for AI shopping.</h2><p className="mt-2 text-slate-700">RetailAgentOS can determine what can be sold, what this shopper should pay, whether it is available and how it can be fulfilled.</p><p className="mt-2 font-medium text-slate-800">One step remains: connect these decisions to your live store.</p></>}
    </section>
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <section className="rounded-xl border border-slate-200 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Commerce rules</p><p className="mt-2 text-lg font-bold text-slate-900">{commerce}</p><p className="mt-2 text-sm text-slate-700">Whether the Studio has enough product, price, buyer eligibility, inventory and fulfilment information to evaluate a shopping decision.</p><p className="mt-3 text-xs text-slate-500">Technical layer: RetailAgentOS decision readiness</p></section>
      <section className="rounded-xl border border-slate-200 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live store connection</p><p className="mt-2 text-lg font-bold text-slate-900">{connection}</p><p className="mt-2 text-sm text-slate-700">Whether a transaction connection has been installed and verified against your live commerce system.</p><p className="mt-3 text-xs text-slate-500">Technical layer: UCP/service endpoint readiness</p></section>
    </div>
    <section className="mt-6"><h2 className="text-lg font-bold text-slate-900">What this gives you</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{['Correct customer price', 'Products shown only to eligible shoppers', 'Availability checked before cart', 'Fulfilment checked before promise', 'Every decision explained'].map((benefit) => <div key={benefit} className="rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-800"><CheckCircle2 className="mb-2 text-emerald-600" size={18} aria-hidden="true" />{benefit}</div>)}</div></section>
    <div role="tablist" aria-label="Results view" className="no-print mt-8 inline-flex rounded-lg border border-slate-200 p-1">{(['summary', 'plan'] as const).map((value) => <button key={value} role="tab" aria-selected={tab === value} type="button" onClick={() => setTab(value)} className={`min-h-[40px] rounded-md px-4 text-sm font-semibold ${tab === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{value === 'summary' ? 'Summary' : 'Implementation Plan'}</button>)}</div>
    {tab === 'summary' ? <><section className="mt-6"><h2 className="text-lg font-bold text-slate-900">Readiness answers</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{answers.map((answer) => <div key={answer.question} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-900">{answer.question}</h3><StatusBadge status={answer.status} /></div><p className="mt-2 text-sm text-slate-700">{answer.answer}</p></div>)}</div></section><section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-bold text-slate-900">What still needs attention</h2>{gaps.length === 0 ? <p className="mt-2 text-sm text-slate-700">Nothing in your catalog or rules is blocking the next step.</p> : <div className="mt-4 space-y-3">{gaps.map((gap) => <div key={gap.id} className="rounded-lg bg-white/80 p-4"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{gap.title}</h3><SeverityBadge severity={gap.severity} /></div><p className="mt-1 text-sm text-slate-700">{gap.explanation}</p><p className="mt-2 text-sm text-slate-700"><strong>Owner:</strong> {OWNER_LABEL[gap.owner]}. <strong>Next:</strong> {gap.nextAction}</p></div>)}</div>}</section></> : <section id="implementation-plan" className="mt-6 overflow-x-auto rounded-xl border border-slate-200"><table className="min-w-[620px] divide-y divide-slate-200 text-sm"><thead className="bg-slate-50"><tr>{['Task', 'Why it matters', 'Owner', 'Status'].map((heading) => <th key={heading} scope="col" className="px-4 py-2 text-left font-semibold text-slate-600">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{plan.map((item) => <tr key={item.id}><td className="px-4 py-3 font-medium text-slate-900 align-top">{item.task}</td><td className="px-4 py-3 text-slate-600 align-top">{item.why}</td><td className="px-4 py-3 text-slate-600 align-top">{OWNER_LABEL[item.owner]}</td><td className="px-4 py-3 align-top"><StatusBadge status={item.status} /></td></tr>)}</tbody></table></section>}
    <section className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><h2 className="font-bold text-slate-900">What your team can do now</h2><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700"><li>Confirm the catalog is accurate.</li><li>Review product exceptions.</li><li>Confirm prices, buyer rules and fulfilment settings.</li></ul></div><div className="rounded-xl border border-slate-200 bg-slate-50 p-5"><h2 className="font-bold text-slate-900">What your site or platform team handles</h2><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700"><li>Connect the live commerce endpoint.</li><li>Connect checkout.</li><li>Verify the integration before launch.</li></ul></div></section>
    <section className="no-print mt-6 rounded-xl bg-slate-900 p-5 text-white"><p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Next best action</p>{needsRepair ? <button type="button" onClick={() => goToStep(catalogIssues ? 1 : 2)} className="mt-3 min-h-[44px] rounded-md bg-white px-4 text-sm font-semibold text-slate-900">{catalogIssues ? 'Fix catalog issues' : 'Complete store details'}</button> : needsVerification ? <div className="mt-3 flex flex-wrap gap-3"><a href="/evidence/conformance" className="inline-flex min-h-[44px] items-center rounded-md bg-white px-4 text-sm font-semibold text-slate-900">Review verification steps</a><a href={mailto} className="inline-flex min-h-[44px] items-center rounded-md border border-white/40 px-4 text-sm font-semibold text-white">Plan a verification session</a></div> : <div className="mt-3 flex flex-wrap gap-3"><a href={mailto} className="inline-flex min-h-[44px] items-center rounded-md bg-white px-4 text-sm font-semibold text-slate-900">{audience === 'enterprise' ? 'Map one live retail policy' : 'Get help connecting my store'}</a><button type="button" onClick={audience === 'enterprise' ? showPlan : () => copy(providerInstructions, 'Provider instructions copied.')} className="min-h-[44px] rounded-md border border-white/40 px-4 text-sm font-semibold text-white">{audience === 'enterprise' ? 'View the implementation plan' : 'Copy instructions for my website provider'}</button></div>}{session.importResult?.source === 'sample' && <button type="button" onClick={() => goToStep(5)} className="mt-4 inline-flex min-h-[44px] items-center text-sm font-semibold text-white underline">See the shopping decision behind this result</button>}</section>
    <details className="no-print mt-6 rounded-xl border border-slate-200 p-5"><summary className="cursor-pointer font-semibold text-slate-900">Technical implementation files</summary><p className="mt-2 text-sm text-slate-600">These files are for your commerce platform, site administrator or engineering team. You do not need them to understand your result.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{artifacts.map((artifact) => <button key={artifact.filename} type="button" onClick={() => downloadTextFile(artifact.filename, artifact.content, artifact.mimeType)} className="flex min-h-[44px] items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"><Download size={15} aria-hidden="true" />{artifact.filename}</button>)}</div></details>
    <details className="no-print mt-4 text-sm text-slate-600"><summary className="cursor-pointer font-semibold">Technical details</summary><p className="mt-2">The decision-ready status evaluates the information in this browser. It is distinct from a live UCP or service endpoint verification, which requires a live commerce system.</p></details>
  </div>;
}
