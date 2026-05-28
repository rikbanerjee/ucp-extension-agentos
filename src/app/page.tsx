import Link from 'next/link';
import { ArrowRight, BookOpen, Layers, Sparkles } from 'lucide-react';

const merchants = [
  {
    id: 'm_boutique_001',
    humanName: "Sara's Boutique",
    archetype: 'Discovery-Led Retail',
    problem: 'Sara has beautiful handcrafted products. AI shopping assistants never recommend them — she has no machine-readable way to declare what she sells or who it is for.',
    resolution: 'With RetailAgentOS, Sara declares her catalog once. Any agent helping a shopper find personalised gifts now finds her.',
    color: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  {
    id: 'm_wholesale_002',
    humanName: 'B&T Wholesale',
    archetype: 'Qualification-First Commerce',
    problem: "B&T's tiered pricing and buyer qualification rules were invisible to agents. Buyers were quoted the wrong price, and unqualified buyers saw listings they couldn't purchase.",
    resolution: 'RetailAgentOS enforces qualification gates and volume pricing automatically. Agents always quote the right tier to the right buyer.',
    color: 'border-slate-200',
    dot: 'bg-slate-400',
  },
  {
    id: 'm_grocery_003',
    humanName: 'Fresh Corner Market',
    archetype: 'Contextual Offers & Fulfilment',
    problem: "Customers ordered items for shipping that Fresh Corner only delivers locally. Weekly promos weren't visible to agents at checkout time.",
    resolution: 'RetailAgentOS surfaces promos in real time and blocks unavailable fulfilment modes before the buyer wastes a trip.',
    color: 'border-slate-200',
    dot: 'bg-slate-400',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Merchant declares rules',
    body: 'Pricing context, buyer qualification, fulfilment constraints, and promo logic — all declared once in a structured, machine-readable profile.',
  },
  {
    step: '02',
    title: 'Agent reads and reasons',
    body: 'The agent evaluates the merchant profile against the buyer\'s context — who they are, where they are, how they want to receive their order.',
  },
  {
    step: '03',
    title: 'Commerce happens correctly',
    body: 'The right products surface to the right buyers at the right price. Checkout, a quote, a WhatsApp handoff — whatever the context calls for.',
  },
];

export default function Home() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Built on the Universal Commerce Protocol
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-tight">
            AI shopping agents are already active.
            <br />
            <span className="text-slate-500">Most small merchants are invisible to them.</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            RetailAgentOS makes small merchants agent-ready. Declare your rules once — pricing,
            eligibility, fulfilment, promos. Let agents understand you, reason about your context,
            and act on your behalf.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-4 flex-wrap gap-y-3">
            <Link
              href="/guided"
              className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
            >
              See how it works <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/demo"
              className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
            >
              Open Playground <Layers className="w-4 h-4" />
            </Link>
            <Link
              href="/architecture"
              className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1.5"
            >
              Architecture notes <BookOpen className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Merchant stories */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Three merchants. One protocol.</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              Same UCP foundation. Same extension vocabulary. Different rules, different outcomes —
              all handled correctly by the agent.
            </p>
          </div>

          <div className="space-y-5">
            {merchants.map(({ humanName, archetype, problem, resolution, color }) => (
              <div key={humanName} className={`rounded-2xl border ${color} bg-white p-7 shadow-sm`}>
                <div className="flex items-start gap-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{archetype}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">{humanName}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-lg bg-rose-50 border border-rose-100 p-3.5">
                        <div className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-1.5">Before</div>
                        <p className="text-sm text-slate-700 leading-relaxed">{problem}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3.5">
                        <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1.5">After</div>
                        <p className="text-sm text-slate-700 leading-relaxed">{resolution}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
            <p className="mt-2 text-slate-500 text-sm">Three steps from declaration to commerce.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {howItWorks.map(({ step, title, body }) => (
              <div key={step} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="text-3xl font-black text-slate-200 mb-4 font-mono">{step}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What RetailAgentOS is */}
        <div className="mt-20 rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                UCP gives you the rails.
                <br />
                <span className="text-slate-500">RetailAgentOS makes them usable.</span>
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                The Universal Commerce Protocol defines how merchants expose capabilities — catalog
                discovery, cart management, checkout handoff. It is a shared foundation for
                interoperable commerce.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                RetailAgentOS is the layer on top: the semantics, policies, and reasoning that let
                agents understand merchant-specific rules and act safely on behalf of buyers.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 overflow-hidden text-sm font-mono">
              <div className="bg-slate-900 text-white px-4 py-3">
                <div className="text-xs text-slate-400 mb-2">Mental model</div>
                <div className="space-y-1.5">
                  <div className="flex gap-2"><span className="text-slate-500">UCP</span><span className="text-slate-300">= the standard rails</span></div>
                  <div className="flex gap-2"><span className="text-slate-500">Profile</span><span className="text-slate-300">= what the merchant declares</span></div>
                  <div className="flex gap-2"><span className="text-emerald-400">rOS</span><span className="text-slate-300">= how the agent interprets &amp; acts</span></div>
                  <div className="flex gap-2"><span className="text-sky-400">Demo</span><span className="text-slate-300">= visible proof of all three</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA row */}
        <div className="mt-20 rounded-2xl border border-slate-200 bg-slate-900 p-10 text-center shadow-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold text-slate-300 mb-5">
            <Sparkles className="w-3 h-3" />
            Start with the story
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            See RetailAgentOS in action
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto mb-8">
            Walk through Sara, B&T, and Fresh Corner — see how each merchant declares their rules
            and how the agent responds to different buyer contexts.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/guided"
              className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              Start Guided Demo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/vision"
              className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-white/40 transition-colors"
            >
              RetailAgentOS roadmap →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
