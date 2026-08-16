import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Layers, GitBranch, FileJson, BookOpen, Package, PlayCircle, Gauge, AlertTriangle } from 'lucide-react';
import { SUMMARY_STATS } from '@/app/evidence/scorecard-data';

export const metadata: Metadata = {
  title: 'Developer Overview | RetailAgentOS',
  description:
    'The technical gateway to RetailAgentOS: what it is, how it relates to UCP, the reference-engine and decision-pipeline model, available specifications, and where to try it.',
};

const sections = [
  {
    icon: Layers,
    title: 'What RetailAgentOS is, technically',
    body: 'An open specification (RAOS) plus a tested reference engine that evaluates a retailer’s eligibility, pricing, inventory, fulfilment and quote rules against a buyer’s context, and returns a deterministic, explainable DecisionRecord.',
  },
  {
    icon: GitBranch,
    title: 'Relationship to UCP',
    body: 'UCP defines the discovery and transport rails commerce agents use to talk to a store. RetailAgentOS is the reasoning layer that sits behind those rails — it decides what an agent should be told, UCP carries the message.',
  },
  {
    icon: FileJson,
    title: 'Reference-engine overview',
    body: 'Published as @retailagentos/engine — pure, deterministic evaluation functions with no I/O, no wall-clock reads, and no randomness. Same inputs always produce the same DecisionRecord.',
    href: '/architecture',
    linkLabel: 'See the architecture',
  },
  {
    icon: Layers,
    title: 'Decision pipeline overview',
    body: 'A staged, fault-isolated pipeline runs each extension in priority order, folding reasons into one ordered record. A throwing evaluator degrades safely instead of crashing the pipeline.',
    href: '/architecture',
    linkLabel: 'See the pipeline model',
  },
  {
    icon: Package,
    title: 'Extension model',
    body: 'Each capability — eligibility, pricing, inventory, fulfilment, quote integrity, trust — is a namespaced extension (com.os.retailagent.shopping.*) with a pure evaluate function, negotiated per merchant via the discovery manifest.',
    href: '/architecture',
    linkLabel: 'See the extension registry',
  },
  {
    icon: FileJson,
    title: 'Decision records and reasons',
    body: 'Every decision carries a uniform reason vocabulary (code, severity, source, requirements) and renders into audience-specific traces — merchant ops, buyer-facing, or raw developer JSON.',
  },
];

const specs = [
  { code: 'RAOS-0000', title: 'Protocol Foundations', href: '/specs/0000-foundations' },
  { code: 'RAOS-0001', title: 'Eligibility & Visibility', href: '/specs/0001-eligibility' },
  { code: 'RAOS-0002', title: 'Contextual Pricing', href: '/specs/0002-contextual-pricing' },
  { code: 'RAOS-0003', title: 'Fulfillment', href: '/specs/0003-fulfillment' },
  { code: 'RAOS-0005', title: 'Inventory & Availability', href: '/specs/0005-inventory' },
  { code: 'RAOS-0007', title: 'Quote Integrity', href: '/specs/0007-quote-integrity' },
  { code: 'RAOS-0008', title: 'Trust & Provenance', href: '/specs/0008-trust-provenance' },
  { code: 'RAOS-0013', title: 'Intent Capture', href: '/specs/0013-intent-capture' },
];

const limitations = [
  'No live MCP transport ships yet — the engine is packaged so one can be built outside this repo.',
  'Cryptographic signing is simulated by locked decision, labeled TRUST_SIMULATED wherever it applies.',
  'No agent authentication, rate limiting, persistence, or multi-tenant production infrastructure.',
  'Promotion stacking, loyalty and restricted-goods enforcement are designed but not implemented.',
];

export default function DevelopersPage() {
  const testStat = SUMMARY_STATS.find((s) => s.label.toLowerCase().includes('tests'));
  const coverageStat = SUMMARY_STATS.find((s) => s.label.toLowerCase().includes('coverage'));

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Developers & Platform Architects
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-tight">
            The technical gateway to RetailAgentOS
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            An open specification and a tested reference engine, not a walled product. This page
            links to the primary sources instead of duplicating them.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/demo"
              className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              Open the technical playground <PlayCircle className="w-4 h-4" />
            </Link>
            <Link
              href="/adopt"
              className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
            >
              Read the adoption guide <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {(testStat || coverageStat) && (
            <p className="mt-6 text-xs text-slate-400">
              {testStat && `${testStat.value} automated tests passing`}
              {testStat && coverageStat && ' · '}
              {coverageStat && `${coverageStat.value} line coverage (rules engine scope)`}
              {' — '}
              <Link href="/evidence" className="underline underline-offset-2 hover:text-slate-600">see the scorecard</Link>
            </p>
          )}
        </div>

        {/* Technical overview grid */}
        <div className="mb-20 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {sections.map(({ icon: Icon, title, body, href, linkLabel }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                <Icon className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
              {href && (
                <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900">
                  {linkLabel} &rarr;
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Available specifications */}
        <div className="mb-20">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-slate-400" />
            <h2 className="text-xl font-bold text-slate-900">Available specifications</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {specs.map(({ code, title, href }) => (
              <Link
                key={code}
                href={href}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400 hover:shadow-sm transition-all group"
              >
                <div>
                  <span className="text-xs font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 mr-2">{code}</span>
                  <span className="text-sm font-semibold text-slate-900">{title}</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors shrink-0" />
              </Link>
            ))}
          </div>
          <div className="text-center mt-5">
            <Link href="/specs" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              See all specifications &rarr;
            </Link>
          </div>
        </div>

        {/* Package / adoption entry point + playground + conformance */}
        <div className="mb-20 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Link href="/adopt" className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-400 hover:shadow-sm transition-all">
            <Package className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">Adoption Guide</h3>
            <p className="text-sm text-slate-600 leading-relaxed">The @retailagentos/engine package entry point and the tiered adoption ladder.</p>
          </Link>
          <Link href="/demo" className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-400 hover:shadow-sm transition-all">
            <PlayCircle className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">Live Playground</h3>
            <p className="text-sm text-slate-600 leading-relaxed">Run real buyer contexts against the reference engine and inspect the decision trace.</p>
          </Link>
          <Link href="/evidence/conformance" className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-400 hover:shadow-sm transition-all">
            <Gauge className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors mb-3" />
            <h3 className="font-semibold text-slate-900 mb-1">Conformance</h3>
            <p className="text-sm text-slate-600 leading-relaxed">What a conformant implementation must satisfy, checked against the code.</p>
          </Link>
        </div>

        {/* Known limitations */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-900">Known limitations</h2>
          </div>
          <ul className="space-y-2.5">
            {limitations.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-600 leading-relaxed">
                <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0 mt-2" />
                {item}
              </li>
            ))}
          </ul>
          <Link href="/evidence" className="mt-5 inline-block text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
            See the full public scorecard &rarr;
          </Link>
        </div>

      </div>
    </div>
  );
}
