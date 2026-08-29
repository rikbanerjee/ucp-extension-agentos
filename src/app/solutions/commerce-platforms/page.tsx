import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Network, ShieldCheck, Layers, MessageCircle, ListChecks, CheckCircle2, Zap } from 'lucide-react';
import { SUMMARY_STATS } from '@/app/evidence/scorecard-data';
import { NextBestAction } from '@/components/guided/NextBestAction';
import { PLATFORM_MAILTO, ENTRY_CTA_LABEL } from '@/lib/content/demoTracks';

export const metadata: Metadata = {
  title: 'For Commerce & Fulfilment Platforms | RetailAgentOS',
  description:
    'Make AI commerce reliable across every merchant on your platform. RetailAgentOS turns different merchant policies into consistent, explainable answers agents can use before they create an invalid cart.',
};

const outcomes = [
  'Reduce invalid carts and late checkout failures',
  'Reduce merchant-specific exception logic',
  'Standardize how AI agents ask commerce questions',
  'Return explanations instead of opaque denials',
  'Enable new AI channels without duplicating policy logic',
];

const transactionFlow = [
  { icon: MessageCircle, label: 'Shopper', body: 'Asks an AI agent for something specific through your platform.' },
  { icon: Network, label: 'Platform', body: 'Routes the request toward a merchant on the platform that could fulfil it.' },
  { icon: ListChecks, label: 'Merchant policy', body: 'RetailAgentOS evaluates that merchant’s own eligibility, pricing and fulfilment rules.' },
  { icon: CheckCircle2, label: 'Consistent answer', body: 'The platform gets a decision and a reason, in the same shape regardless of which merchant answered.' },
];

const boundaries = [
  { label: 'What RetailAgentOS consumes', body: 'Merchant-declared catalog, pricing, eligibility and fulfilment rules, plus buyer and transaction context supplied by the platform.' },
  { label: 'What it decides', body: 'Whether a buyer is eligible, what price applies, whether inventory and fulfilment mode are feasible, and whether a quote can be honored.' },
  { label: 'What it returns', body: 'A structured decision with a machine-readable reason — usable directly by an AI agent, a checkout flow, or a support tool.' },
  { label: 'What remains in existing systems', body: 'Payments, order management, merchant onboarding, catalog ingestion and platform-level trust and safety stay exactly where they are today.' },
];

export default function CommercePlatformsPage() {
  const testStat = SUMMARY_STATS.find((s) => s.label.toLowerCase().includes('tests'));

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Executive hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Commerce & Fulfilment Platforms
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-tight">
            Make AI commerce reliable
            <br />
            <span className="text-slate-500">across every merchant on your platform.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            RetailAgentOS turns different merchant policies into consistent, explainable answers
            that shopping agents can use before they create an invalid cart.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/guided/platform"
              className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              {ENTRY_CTA_LABEL.platform} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/adopt"
              className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
            >
              Read the adoption guide <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Quick commerce and instant retail */}
        <div className="mb-20 rounded-2xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-800 mb-5">
            <Zap className="w-3.5 h-3.5" />
            Quick commerce and instant retail
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3 max-w-xl">
            When the customer needs it now, &ldquo;probably available&rdquo; is not enough.
          </h2>
          <p className="text-slate-600 leading-relaxed max-w-2xl mb-6">
            RetailAgentOS helps platforms verify merchant-side availability, pricing, acceptance windows and
            fulfilment constraints before combining them with live delivery signals.
          </p>
          <Link
            href="/guided/platform"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
          >
            See the late-night pizza scenario <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Two-minute, no-jargon explanation */}
        <div className="mb-20 max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">In plain terms</h2>
          <p className="text-slate-600 leading-relaxed">
            Every merchant on your platform has different rules for who can buy what, at what
            price, and how it can be fulfilled. Today, AI agents either guess at those rules or
            your platform reimplements them per merchant. RetailAgentOS gives you one decision
            layer that reads each merchant&rsquo;s own declared rules and returns the same kind of
            answer every time — so agents stop guessing and merchants stop writing one-off
            exception code.
          </p>
        </div>

        {/* Platform economics / operational value */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">What this is worth operationally</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {outcomes.map((item) => (
              <div key={item} className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-4">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* One transaction across shopper, platform, merchant, fulfilment */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">One transaction, four parties</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            {transactionFlow.map(({ icon: Icon, label, body }) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <Icon className="w-5 h-5 text-slate-400 mb-3" />
                <p className="text-sm font-semibold text-slate-900 mb-1">{label}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Build once, support many merchant models */}
        <div className="mb-20 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <Layers className="w-6 h-6 text-slate-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Build once, support many merchant models</h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-xl mx-auto">
            A boutique, a wholesaler and a grocer have very different rules — but your platform
            integrates the same decision contract for each. New merchant types don&rsquo;t require
            new platform-side logic; they declare their own rules and RetailAgentOS evaluates them.
          </p>
        </div>

        {/* Integration boundaries */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Integration boundaries</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              A decision and translation layer — not a replacement for your platform&rsquo;s core systems.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {boundaries.map(({ label, body }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{label}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Current maturity and limitations */}
        <div className="mb-20 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Current maturity and limitations</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Eligibility, contextual pricing, inventory and quote integrity are built and tested
            {testStat ? ` — ${testStat.value} automated checks pass today` : ''}. There is no live
            MCP transport, no agent authentication or rate limiting, and no persistence or
            multi-tenant production infrastructure yet — those are explicit non-goals of the
            current reference phase. One merchant pilot integration is in progress; none has
            shipped. We have not measured conversion impact — no pilot data exists yet.
          </p>
          <Link href="/evidence" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
            See the public scorecard &rarr;
          </Link>
        </div>

        {/* Pilot CTA */}
        <NextBestAction
          variant="dark"
          heading="Test one merchant rule that creates failed carts today."
          body="Bring one pricing, eligibility, inventory or fulfilment rule. We’ll show the merchant inputs, the decision returned to the platform and the explanation an agent receives."
          primaryLabel="Discuss a merchant-rule pilot"
          primaryHref={PLATFORM_MAILTO}
          secondaryLabel="Run the late-night pizza scenario"
          secondaryHref="/guided/platform"
        />

      </div>
    </div>
  );
}
