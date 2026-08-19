import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Store, Bot, ShieldCheck, Zap, XCircle } from 'lucide-react';
import { SUMMARY_STATS } from '@/app/evidence/scorecard-data';
import AgentDemoStrip from '@/components/AgentDemoStrip';
import { NextBestAction } from '@/components/guided/NextBestAction';
import { ENTRY_CTA_LABEL } from '@/lib/content/demoTracks';

export const metadata: Metadata = {
  title: 'For Boutique & Specialty Retailers | RetailAgentOS',
  description:
    'Help AI find your products and represent your store correctly — without rebuilding your storefront. See what AI shopping agents may get wrong about your store today.',
};

const misunderstandings = [
  {
    icon: Store,
    title: 'Your catalog is invisible to agents',
    body: 'AI shopping assistants browse and recommend products. If your store has no machine-readable profile, they skip you entirely — even if you sell exactly what a buyer is looking for.',
  },
  {
    icon: Bot,
    title: 'Agents quote the wrong price',
    body: "Your pricing depends on who's asking — member tiers, bulk orders, sale pricing. An agent that can't read those rules quotes incorrectly or not at all.",
  },
  {
    icon: ShieldCheck,
    title: 'Unqualified buyers reach checkout',
    body: 'Wholesale listings, local-delivery-only items, region-restricted products — agents don’t know your rules, so they route buyers into dead ends.',
  },
  {
    icon: Zap,
    title: 'Delivery rules are invisible',
    body: "Your shipping zones and fulfilment modes exist, but agents can't see them at browse time — so they promise deliveries you can't make.",
  },
];

const steps = [
  { step: '01', title: 'Publish your store rules', body: 'Pricing tiers, buyer eligibility, and fulfilment zones — declared once, in a structured, machine-readable profile.' },
  { step: '02', title: 'Agents understand your store', body: "Any AI shopping agent evaluates your rules against the buyer's context — who they are, where they are, what they need." },
  { step: '03', title: 'Correct outcomes before checkout', body: 'Right products to the right buyers at the right price. No dead-end orders, no blocked fulfilment.' },
];

const beforeAfter = {
  before: 'A shopper asks an AI assistant for a personalised, handcrafted gift under $50 shipping to California. Sara’s Boutique sells exactly that — but the AI has never heard of her, and recommends three national chains instead.',
  after: 'Sara declares her catalog once. The same AI assistant now discovers her store, reads her pricing and shipping rules correctly, and recommends her alongside the chains — because it finally can.',
};

const merchantTypes = [
  { label: 'Boutique & gift retail', href: '/demo?scenario=boutique_discovery', description: "See how Sara's Boutique becomes agent-discoverable" },
  { label: 'Wholesale & B2B', href: '/demo?scenario=wholesale_gating', description: 'See how B&T Wholesale gates buyers and prices correctly' },
  { label: 'Grocery & local delivery', href: '/demo?scenario=grocery_offers', description: 'See how Fresh Corner surfaces promos and delivery limits' },
];

const agentReadiness = [
  {
    id: 'visibility',
    check: 'Visibility',
    question: 'Can agents tell which products a given buyer should or shouldn’t see?',
    extension: 'RAOS-0001 eligibility',
    breaksWithout: 'Wholesale items appear to guest buyers — agent surfaces listings the buyer cannot purchase.',
  },
  {
    id: 'pricing',
    check: 'Contextual price',
    question: 'Is the right price exposed before cart, per buyer and quantity?',
    extension: 'RAOS-0002 contextual pricing',
    breaksWithout: 'Agent quotes list price to a member — buyer is surprised at checkout.',
  },
  {
    id: 'qualification',
    check: 'Buyer qualification',
    question: 'Are buyer requirements (wholesale account, resale cert, MOQ) machine-readable?',
    extension: 'RAOS-0001 / RAOS-0002',
    breaksWithout: 'Cart is built below MOQ — checkout fails with a cryptic validation error.',
  },
  {
    id: 'fulfillment',
    check: 'Fulfilment feasibility',
    question: 'Are mode and region restrictions surfaced at catalog time, not checkout?',
    extension: 'RAOS-0003 fulfillment',
    breaksWithout: 'Agent confirms shipping to a region the item can’t ship to — buyer abandoned at checkout.',
  },
  {
    id: 'explainability',
    check: 'Explainability',
    question: 'When the agent blocks a product or changes a price, can it explain why?',
    extension: 'All RAOS specs (reason codes)',
    breaksWithout: 'You and the buyer have no visibility into why an item was blocked or a price changed — trust erodes.',
  },
];

export default function IndependentRetailPage() {
  const testStat = SUMMARY_STATS.find((s) => s.label.toLowerCase().includes('tests'));

  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Boutique & Specialty Retailers
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-tight">
            Help AI find your products
            <br />
            <span className="text-slate-500">and represent your store correctly.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            RetailAgentOS helps AI assistants understand what you sell, what customers should pay
            and which orders your store can actually support.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/guided/independent"
              className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              {ENTRY_CTA_LABEL.independent} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#agent-demo"
              className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
            >
              See the demo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/retailer-readiness"
              className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:border-emerald-400 hover:bg-emerald-100 transition-colors flex items-center gap-2"
            >
              Check my catalog <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* What AI may misunderstand */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">What AI may misunderstand about your store</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              It is not about your products. It is about whether agents can understand your rules.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {misunderstandings.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-rose-500" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AgentDemoStrip — see the difference, live */}
        <div id="agent-demo" className="mb-20 scroll-mt-20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              See the difference
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              What changes when your store becomes understandable to AI
            </h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              A shopper asks an AI for a product like yours. Watch what the agent can—and cannot—find
              before and after the store publishes information it can understand.
            </p>
          </div>
          <AgentDemoStrip />
          <div className="text-center mt-6">
            <Link
              href="/guided/independent"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Continue through the guided demo <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Boutique before-and-after */}
        <div className="mb-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">A boutique, before and after</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-3">Before</p>
              <p className="text-sm text-slate-700 leading-relaxed">{beforeAfter.before}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">After</p>
              <p className="text-sm text-slate-700 leading-relaxed">{beforeAfter.after}</p>
            </div>
          </div>
        </div>

        {/* Three-step explanation */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">How RetailAgentOS fixes it</h2>
            <p className="mt-2 text-slate-500 text-sm">Declare your rules once. Let agents do the rest.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {steps.map(({ step, title, body }) => (
              <div key={step} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="text-3xl font-black text-slate-200 mb-4 font-mono">{step}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Store-type examples */}
        <div className="mb-20 rounded-2xl border border-slate-200 bg-slate-50 p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">See how this works for your store type</h2>
            <p className="mt-1 text-sm text-slate-500">
              Pick the demo closest to your business and watch how RetailAgentOS handles real buyer contexts.
            </p>
          </div>
          <div className="space-y-3">
            {merchantTypes.map(({ label, href, description }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400 hover:shadow-sm transition-all group"
              >
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{description}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Readiness diagnostic — deeper technical mapping, spec numbers live here */}
        <div id="readiness" className="mb-20 scroll-mt-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Is your store legible to AI agents?</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl">
              Five checks that determine whether an AI shopping agent can represent your store
              correctly — and what breaks when they can&apos;t.
            </p>
          </div>
          <div className="space-y-3">
            {agentReadiness.map(({ id, check, question, extension, breaksWithout }) => (
              <div key={id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{check}</span>
                      <span className="text-xs font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">{extension}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-1.5">{question}</p>
                    <p className="text-xs text-rose-600 leading-relaxed">
                      <span className="font-semibold">Without it: </span>{breaksWithout}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current maturity */}
        <div className="mb-20 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Current product maturity</h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4">
            Eligibility, contextual pricing, inventory and quote integrity are built and tested against
            {testStat ? ` ${testStat.value} automated checks` : ' a growing automated test suite'}.
            Promotion stacking, loyalty and full fulfilment feasibility are designed but not yet built —
            the public scorecard shows exactly which is which.
          </p>
          <Link href="/evidence" className="text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors">
            See the public scorecard &rarr;
          </Link>
        </div>

        {/* Bottom CTA */}
        <NextBestAction
          variant="dark"
          heading="See what AI understands about your store."
          body="Two minutes, no signup — get a plain-language readout of what's holding your store back from AI shoppers today."
          primaryLabel="Check my store"
          primaryHref="/aeo-score"
          secondaryLabel="Follow the build"
          secondaryHref="/buildlog"
        />

      </div>
    </div>
  );
}
