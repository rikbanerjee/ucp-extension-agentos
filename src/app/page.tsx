import Link from 'next/link';
import { ArrowRight, Sparkles, Store, Zap } from 'lucide-react';
import { buildLog } from '@/lib/content/buildlog';
import AgentDemoStrip from '@/components/AgentDemoStrip';

const latest = buildLog[0];

const merchants = [
  {
    id: 'm_boutique_001',
    humanName: "Sara's Boutique",
    archetype: 'Discovery-Led Retail',
    problem: 'Sara has beautiful handcrafted products. AI shopping assistants never recommend them — she has no machine-readable way to declare what she sells or who it is for.',
    resolution: 'With RetailAgentOS, Sara declares her catalog once. Any agent helping a shopper find personalised gifts now finds her.',
    color: 'border-slate-200',
  },
  {
    id: 'm_wholesale_002',
    humanName: 'B&T Wholesale',
    archetype: 'Qualification-First Commerce',
    problem: "B&T's tiered pricing and buyer qualification rules were invisible to agents. Buyers were quoted the wrong price, and unqualified buyers saw listings they couldn't purchase.",
    resolution: 'RetailAgentOS enforces qualification gates and volume pricing automatically. Agents always quote the right tier to the right buyer.',
    color: 'border-slate-200',
  },
  {
    id: 'm_grocery_003',
    humanName: 'Fresh Corner Market',
    archetype: 'Contextual Offers & Fulfilment',
    problem: "Customers ordered items for shipping that Fresh Corner only delivers locally. Weekly promos weren't visible to agents at checkout time.",
    resolution: 'RetailAgentOS surfaces promos in real time and blocks unavailable fulfilment modes before the buyer wastes a trip.',
    color: 'border-slate-200',
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
    body: "The agent evaluates the merchant profile against the buyer's context — who they are, where they are, how they want to receive their order.",
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
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Built on the Universal Commerce Protocol
          </div>
          <div className="flex items-center justify-center mb-8">
            <Link
              href="/buildlog"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Building in public · {latest.week} of {latest.date} · Shipped: {latest.shipped}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-tight">
            Your next customer is asking an AI
            <br />
            to find them the perfect store.
          </h1>
          <p className="text-4xl font-bold tracking-tight text-slate-500 sm:text-5xl leading-tight mt-1">
            Will it find yours?
          </p>

          <p className="mt-4 mb-6 text-lg text-gray-500 max-w-md mx-auto">
            AI agents are already shopping. Most stores are invisible to them.
          </p>
          {/* Primary CTA */}
          <div className="mt-8 flex justify-center">
            <Link
              href="/for-merchants"
              className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
            >
              Make my store visible to AI &rarr;
            </Link>
          </div>

          {/* Divider */}
          <p className="mt-5 mb-3 text-xs text-gray-400 tracking-widest uppercase text-center">or, pick your path</p>

          {/* Story rail */}
          <div className="mt-2 hidden sm:grid grid-cols-3 gap-3 max-w-2xl mx-auto">
            <Link href="/guided" className="block bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-white hover:border-gray-400 hover:shadow-sm transition-all text-left">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">I&apos;m a Merchant</p>
              <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">Watch how Sara&apos;s Boutique got found by AI</p>
              <span className="text-xs text-green-600 font-medium hover:underline">See the guided story &rarr;</span>
            </Link>
            <Link href="/demo" className="block bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-white hover:border-gray-400 hover:shadow-sm transition-all text-left">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">I&apos;m a Builder</p>
              <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">Try a live agent query on a real merchant profile</p>
              <span className="text-xs text-green-600 font-medium hover:underline">Open the playground &rarr;</span>
            </Link>
            <Link href="/buildlog" className="block bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-white hover:border-gray-400 hover:shadow-sm transition-all text-left">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">I&apos;m Following the Build</p>
              <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">See what shipped this week and what&apos;s next</p>
              <span className="text-xs text-green-600 font-medium hover:underline">Read the build log &rarr;</span>
            </Link>
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:hidden">
            <Link href="/guided" className="block bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-white hover:border-gray-400 hover:shadow-sm transition-all text-left">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">I&apos;m a Merchant</p>
              <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">Watch how Sara&apos;s Boutique got found by AI</p>
              <span className="text-xs text-green-600 font-medium">See the guided story &rarr;</span>
            </Link>
            <Link href="/demo" className="block bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-white hover:border-gray-400 hover:shadow-sm transition-all text-left">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">I&apos;m a Builder</p>
              <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">Try a live agent query on a real merchant profile</p>
              <span className="text-xs text-green-600 font-medium">Open the playground &rarr;</span>
            </Link>
            <Link href="/buildlog" className="block bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-white hover:border-gray-400 hover:shadow-sm transition-all text-left">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">I&apos;m Following the Build</p>
              <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">See what shipped this week and what&apos;s next</p>
              <span className="text-xs text-green-600 font-medium">Read the build log &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Before section */}
        <div className="mt-10 mb-8 max-w-xl mx-auto bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">

          {/* Eyebrow */}
          <div className="px-7 pt-7 pb-5 border-b border-gray-200 text-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-semibold flex items-center justify-center gap-1">
              <span>⚠</span> Before RetailAgentOS
            </p>
          </div>

          {/* Layer 1 — The setup */}
          <div className="px-7 pt-5 pb-4 border-b border-gray-100">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-2">The query</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              An AI shopper searches for a personalized Father&apos;s Day T-shirt under $50, shipping to California.
            </p>
          </div>

          {/* Layer 2 — What the AI finds (faux result chips) */}
          <div className="px-7 pt-4 pb-5 border-b border-gray-100">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-3">What the agent finds</p>
            <div className="flex flex-wrap gap-2">
              {['The Big Sportswear Brand', 'The Legacy Lifestyle Label', 'The Mall Anchor Store'].map((name) => (
                <span key={name} className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-300 line-through">
                  {name}
                </span>
              ))}
            </div>
          </div>

          {/* Layer 3 — The gut punch */}
          <div className="px-7 pt-5 pb-5 border-b border-gray-100">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-3">Who gets left out</p>
            <p className="text-xl font-bold text-gray-900 leading-snug">
              Not TheCustomHub.<br />
              Not Sara&apos;s Boutique.<br />
              Not <em>you</em>.
            </p>
          </div>

          {/* Layer 4 — Handoff */}
          <div className="px-7 py-5 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-700 tracking-wide hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-default select-none">
              <span className="animate-bounce inline-block">↓</span>
              now watch what changes
            </span>
          </div>

        </div>

        {/* Inline Agent Demo Strip */}
        <AgentDemoStrip />

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

        {/* Where RetailAgentOS fits — stacked gap visual (B2) */}
        <div className="mt-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Where RetailAgentOS fits</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              UCP provides the rails. But agents still can&apos;t reason about a merchant&apos;s rules.
              That&apos;s the gap RetailAgentOS fills.
            </p>
          </div>
          <div className="max-w-2xl mx-auto space-y-0">
            {/* Top — RetailAgentOS layer */}
            <div className="rounded-t-2xl border border-emerald-300 bg-emerald-50 px-7 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">RetailAgentOS</span>
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">fills the gap</span>
                  </div>
                  <div className="font-semibold text-slate-900 text-sm">The reasoning + semantics layer</div>
                </div>
                <Zap className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              </div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Merchant rules become machine-readable — eligibility, contextual pricing, visibility,
                fulfilment constraints, and the next correct action.
              </p>
            </div>

            {/* Middle — The gap */}
            <div className="border-x border-dashed border-rose-300 bg-rose-50/50 px-7 py-4">
              <div className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-1">The gap</div>
              <p className="text-sm text-slate-600">
                Agents can&apos;t reliably read a merchant&apos;s rules — who is eligible, what price
                applies, what fulfilment is valid, what action to take.
              </p>
            </div>

            {/* Bottom — UCP rails */}
            <div className="rounded-b-2xl border border-slate-200 bg-white px-7 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Universal Commerce Protocol</div>
                  <div className="font-semibold text-slate-700 text-sm">The rails</div>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Discovery · Catalog · Cart · Checkout handoff. Interoperability for commerce systems.
              </p>
            </div>
          </div>
          <div className="text-center mt-4">
            <Link
              href="/architecture"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              See the full three-layer model in Architecture notes →
            </Link>
          </div>
        </div>

        {/* Who's behind this — founder mission */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-5">Who&apos;s behind this — and why it took a retail operator to build it</h2>
          <div className="space-y-4 text-[15px] leading-7 text-slate-600">
            <p>
              For 15 years I&apos;ve built retail technology — modernizing POS, building StoreOS to
              simplify the work colleagues do on the floor, and the hardest version of modernization:
              running legacy and modern POS in the same store at the same time, no big-bang cutover,
              while customers kept shopping. That&apos;s the whole idea here.
            </p>
            <p>
              Millions of merchants on Shopify, Etsy, Amazon, and Walmart Marketplace — custom apparel
              sellers, local boutiques, specialty food stores, niche wholesalers — pay steep platform
              fees and give up a cut of every sale, and in return they get a storefront but not
              control: over who sees their catalog, who gets quoted which price, who qualifies, or how
              their fulfillment rules are read outside the platform&apos;s walls. That was manageable
              when humans were clicking. AI agents shopping on behalf of buyers will make it critical,
              because an agent can&apos;t read rules locked inside a platform it can&apos;t reach — so
              the merchant pays the platform tax and still gets left out of the next commerce layer.
            </p>
            <p>
              Every previous shift — mobile, voice, social — got built for the big players first, and
              small merchants got the integration years later, at a price, inside a new lock-in.
              RetailAgentOS is the bridge: declare your rules once, keep selling, and let your existing
              store join agentic commerce without rebuilding anything.
            </p>
            <p className="text-slate-700">
              I&apos;m building it in the open because I honestly don&apos;t know yet whether merchants
              will configure this layer themselves or whether platforms need to absorb it invisibly —
              and I&apos;d rather find that out in public than guess in private.
            </p>
          </div>
          <div className="mt-5">
            <Link
              href="/buildlog"
              className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              Follow the build, open question and all →
            </Link>
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
              href="/for-merchants"
              className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              Get visible to agents <Store className="w-4 h-4" />
            </Link>
            <Link
              href="/guided"
              className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-white/40 transition-colors flex items-center gap-2"
            >
              See a demo first <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
