import Link from 'next/link';
import { ArrowRight, CheckCircle, Mail, Store, Bot, ShieldCheck, Zap, BarChart3, XCircle } from 'lucide-react';

const agentReadiness = [
  {
    id: 'visibility',
    check: 'Visibility',
    question: 'Can agents tell which products a given buyer should or shouldn\'t see?',
    extension: 'ext.eligibility',
    breaksWithout: 'Wholesale items appear to guest buyers — agent surfaces listings the buyer cannot purchase.',
  },
  {
    id: 'pricing',
    check: 'Contextual price',
    question: 'Is the right price exposed before cart, per buyer and quantity?',
    extension: 'ext.member_pricing / ext.bulk_pricing',
    breaksWithout: 'Agent quotes list price to a wholesale member — buyer is surprised at checkout.',
  },
  {
    id: 'qualification',
    check: 'Buyer qualification',
    question: 'Are buyer requirements (wholesale account, resale cert, MOQ) machine-readable?',
    extension: 'ext.eligibility / ext.bulk_pricing',
    breaksWithout: 'Cart is built below MOQ — checkout fails with a cryptic validation error.',
  },
  {
    id: 'fulfillment',
    check: 'Fulfilment feasibility',
    question: 'Are mode and region restrictions surfaced at catalog time, not checkout?',
    extension: 'ext.fulfillment_constraints',
    breaksWithout: 'Agent confirms shipping to Hawaii for a locally-delivered item — buyer abandoned at checkout.',
  },
  {
    id: 'promotions',
    check: 'Promotions',
    question: 'Do active offers surface to agents in real time at browse time?',
    extension: 'ext.promo_pricing',
    breaksWithout: 'Weekly sale never factors into the agent\'s recommendation — buyer goes elsewhere.',
  },
  {
    id: 'explainability',
    check: 'Explainability',
    question: 'Can the decision be explained, not just made?',
    extension: 'Agent Reasoning Console (Phase 2)',
    breaksWithout: 'Merchant and buyer have no visibility into why an item was blocked or a price changed.',
  },
];

const problems = [
  {
    icon: Store,
    title: 'Your catalog is invisible to agents',
    body: 'AI shopping assistants browse and recommend products. If your store has no machine-readable profile, they skip you entirely — even if you sell exactly what a buyer is looking for.',
  },
  {
    icon: Bot,
    title: 'Agents quote the wrong price',
    body: "Your pricing depends on who's asking — member tiers, bulk orders, weekly promos. An agent that can't read those rules quotes incorrectly or not at all.",
  },
  {
    icon: ShieldCheck,
    title: 'Unqualified buyers reach checkout',
    body: "Wholesale listings, age-restricted products, local-delivery-only items — agents don't know your rules, so they route buyers into dead ends.",
  },
  {
    icon: Zap,
    title: 'Promos never reach buyers in time',
    body: "Your sale prices, mix-and-match deals, and seasonal offers exist. Agents just can't see them at browse time, so they're never factored into recommendations.",
  },
];

const steps = [
  {
    step: '01',
    title: 'Publish your store rules',
    body: 'Pricing tiers, buyer eligibility, fulfilment zones, promotions — declared once in a structured, machine-readable profile.',
  },
  {
    step: '02',
    title: 'Agents understand your store',
    body: "Any AI shopping agent evaluates your rules against the buyer's context — who they are, where they are, what they need.",
  },
  {
    step: '03',
    title: 'Correct outcomes before checkout',
    body: 'Right products to the right buyers at the right price. No dead-end orders, no mis-quoted wholesale tiers, no blocked fulfilment.',
  },
];

const services = [
  {
    name: 'Store Visibility Audit',
    tagline: 'Find out how visible your store is to AI shopping agents today.',
    includes: [
      'Catalog and product structure review',
      'Pricing and promotion logic review',
      'Fulfilment and region rule review',
      'AI agent readiness summary',
    ],
  },
  {
    name: 'RetailAgentOS Readiness Blueprint',
    tagline: 'A structured plan to convert your store rules into machine-readable commerce behaviour.',
    includes: [
      'Merchant profile design',
      'Extension mapping for your store type',
      'Agent behaviour scenarios',
      'Integration recommendations',
    ],
  },
  {
    name: 'Custom Merchant Demo',
    tagline: 'See RetailAgentOS working with your actual catalog and policies.',
    includes: [
      'Branded demo experience',
      'Agent interaction scenarios',
      'Merchant-specific visibility and fulfilment logic',
      'Recommended action flows',
    ],
  },
  {
    name: 'Platform Integration Advisory',
    tagline: 'Connect the semantic layer to your existing commerce stack.',
    includes: [
      'Shopify / WooCommerce / Square / custom stack assessment',
      'Cart and checkout handoff strategy',
      'Operational workflow integration',
      'Platform readiness report',
    ],
  },
  {
    name: 'Managed Pilot',
    tagline: 'Short-term partnership to tune your rules and validate AI commerce readiness.',
    includes: [
      'Implementation and rule setup support',
      'Rule tuning based on real buyer contexts',
      'Feedback loop analysis',
      'Conversion and intent metrics',
    ],
  },
];

const merchantTypes = [
  { label: "Boutique & gift retail", href: '/guided', description: "See how Sara's Boutique becomes agent-discoverable" },
  { label: 'Wholesale & B2B', href: '/guided', description: "See how B&T Wholesale gates buyers and prices correctly" },
  { label: 'Grocery & local delivery', href: '/guided', description: "See how Fresh Corner handles promos and delivery zones" },
];

export default function ForMerchantsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            For small merchants and independent retailers
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-tight">
            Make your store visible
            <br />
            <span className="text-slate-500">to AI shopping agents.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            AI agents are already recommending products, quoting prices, and routing buyers to checkout.
            Most small merchants are invisible to them — not because their products are wrong,
            but because their store rules are unreadable to machines.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <a
              href="mailto:rikbanerjee007@gmail.com?subject=RetailAgentOS%20Store%20Visibility%20Audit"
              className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              Request a free audit <Mail className="w-4 h-4" />
            </a>
            <Link
              href="/guided"
              className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
            >
              See a demo first <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Problem recognition */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Why agents skip your store</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              It is not about your products. It is about whether agents can understand your rules.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {problems.map(({ icon: Icon, title, body }) => (
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

        {/* How it works */}
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

        {/* See your merchant type in the demo */}
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

        {/* Agent-Readiness Diagnostic (E1) */}
        <div id="readiness" className="mb-20 scroll-mt-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Is your store legible to AI agents?</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl">
              Six checks that determine whether an AI shopping agent can represent your store
              correctly — and what breaks when they can&apos;t. Each maps to a machine-readable
              rule layer your store needs.
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
          <div className="mt-5 text-center">
            <a
              href="mailto:rikbanerjee007@gmail.com?subject=RetailAgentOS%20Store%20Visibility%20Audit"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Not sure how your store scores? Request a free audit →
            </a>
          </div>
        </div>

        {/* Services */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">How we can help</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              Not sure where to start? These engagements are designed to meet you where you are —
              whether you need a quick read on your readiness or a full integration.
            </p>
          </div>
          <div className="space-y-4">
            {services.map(({ name, tagline, includes }) => (
              <div key={name} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 mb-1">{name}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">{tagline}</p>
                    <ul className="space-y-1.5">
                      {includes.map(item => (
                        <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={`mailto:rikbanerjee007@gmail.com?subject=${encodeURIComponent(name + ' — RetailAgentOS')}`}
                    className="shrink-0 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
                  >
                    Get in touch <Mail className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl border border-slate-200 bg-slate-900 p-10 text-center shadow-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold text-slate-300 mb-5">
            <BarChart3 className="w-3 h-3" />
            Start with a free audit
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Find out if agents can find your store
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto mb-8">
            A Store Visibility Audit takes your existing catalog and policies and tells you
            exactly what AI agents can and cannot understand about your store today.
          </p>
          <a
            href="mailto:rikbanerjee007@gmail.com?subject=RetailAgentOS%20Store%20Visibility%20Audit"
            className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Request a free audit <Mail className="w-4 h-4" />
          </a>
        </div>

      </div>
    </div>
  );
}
