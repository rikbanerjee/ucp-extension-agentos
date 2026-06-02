import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';
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
    <div className="relative h-full overflow-y-auto scroll-smooth">
      {/* Decorative hero background band — native CSS/SVG, no image asset.
          Faint slate topographic lines in the lower third converge toward a soft
          emerald glow on the right (spec B1). Purely decorative: sits behind the
          hero content via explicit z-index (.hero-band-behind / .hero-content-above
          in globals.css — this build does NOT emit Tailwind's -z-10 utility),
          never intercepts pointer events (pointer-events-none), and is clipped
          (overflow-hidden) so it can't cause horizontal scroll. The glow is a
          radial-gradient arbitrary-value utility; the lines use SVG attributes. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] overflow-hidden"
      >
        {/* Soft emerald glow, right side */}
        <div
          className="absolute top-[-10%] h-[640px] w-[640px] rounded-full blur-3xl"
          style={{ right: '0%', background: 'radial-gradient(circle, rgba(16,185,129,0.55) 0%, rgba(16,185,129,0.22) 40%, rgba(16,185,129,0) 70%)' }}
        />
      </div>

      <div className="hero-content-above relative mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-8">
            <Link
              href="/buildlog"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              Building in public &middot; {latest.week} of {latest.date} &middot; Shipped: {latest.shipped}
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
          <p className="mt-4 text-lg text-gray-500 max-w-md mx-auto">
            AI agents are already shopping. Most stores get skipped or misread.
          </p>
          <p className="mt-4 text-base text-slate-600 max-w-lg mx-auto">
            <span className="font-semibold text-slate-900">RetailAgent<span className="text-emerald-600">OS</span></span>{' '}is the layer that makes your store readable &mdash; and sellable &mdash; by AI shopping agents.
          </p>
          <p className="mt-2 mb-8 text-xs text-slate-400">
            Extends Google&apos;s open Universal Commerce Protocol.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <a
              href="#demo"
              className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
            >
              Show me what AI sees &rarr;
            </a>
            <Link
              href="/demo"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Explore the live playground &rarr;
            </Link>
          </div>
        </div>

        {/* Before section */}
        <div className="mt-8 mb-8 max-w-2xl mx-auto bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden shadow-md shadow-slate-200/60">

          {/* Eyebrow */}
          <div className="px-7 pt-4 pb-3 border-b border-gray-200 text-center">
            <p className="text-sm tracking-[0.2em] text-amber-500 font-bold flex items-center justify-center gap-2">
              <span className="text-base">⚠</span> Today, Without RetailAgentOS
            </p>
          </div>

          {/* Body — query → what they surface → who they skip, as one flowing beat */}
          <div className="px-7 pt-4 pb-4 space-y-4">
            {/* The setup */}
            <p className="text-sm text-gray-600 leading-relaxed">
              An AI shopper searches for a personalized Father&apos;s Day T-shirt under $50, shipping to California.
            </p>

            {/* What they surface instead */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-2">What they surface instead</p>
              <div className="flex flex-wrap gap-2">
                {['The Big Sportswear Brand', 'The Luxury Brand', 'The Big Box Retailer'].map((name) => (
                  <span key={name} className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* The gut punch — who gets crossed out */}
            <p className="text-xl font-bold leading-tight pt-0.5">
              <s className="text-gray-900 decoration-red-500 decoration-2">TheCustomHub</s><br />
              <s className="text-gray-900 decoration-red-500 decoration-2">Sara&apos;s Boutique</s><br />
              <s className="text-gray-900 decoration-red-500 decoration-2 italic">You</s>
            </p>
          </div>

          {/* Handoff */}
          <div className="px-7 py-4 border-t border-gray-100 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-700 tracking-wide hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-default select-none">
              <span className="animate-bounce inline-block">&darr;</span>
              now watch what changes
            </span>
          </div>

        </div>

        {/* Demo strip — scroll target */}
        <div id="demo" className="scroll-mt-6">
          <AgentDemoStrip />
        </div>

        {/* Breadth connector */}
        <div className="mt-16 max-w-xl mx-auto text-center">
          <p className="text-xl font-bold text-gray-900">Discovery is just the start.</p>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Getting found is only the first gap. Pricing, buyer qualification, and fulfilment break
            down for agents too &mdash; and they break differently for every kind of retailer.
          </p>
        </div>

        {/* Merchant stories */}
        <div className="mt-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Every retail tier has a blind spot.</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              That&apos;s exactly what RetailAgentOS is being built to fix.
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
            <p className="mt-2 text-slate-500 text-sm">Three steps between a broken agent interaction and a correct one.</p>
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

        {/* Where RetailAgentOS fits */}
        <div className="mt-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Where RetailAgent<span className="text-emerald-600">OS</span> fits</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              UCP provides the rails. But agents still can&apos;t reason about a merchant&apos;s rules.
              That&apos;s the gap RetailAgentOS fills.
            </p>
          </div>
          <div className="max-w-2xl mx-auto space-y-0">
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
                Merchant rules become machine-readable &mdash; eligibility, contextual pricing, visibility,
                fulfilment constraints, and the next correct action.
              </p>
            </div>
            <div className="border-x border-dashed border-rose-300 bg-rose-50/50 px-7 py-4">
              <div className="text-xs font-semibold text-rose-500 uppercase tracking-wider mb-1">The gap</div>
              <p className="text-sm text-slate-600">
                Agents can&apos;t reliably read a merchant&apos;s rules &mdash; who is eligible, what price
                applies, what fulfilment is valid, what action to take.
              </p>
            </div>
            <div className="rounded-b-2xl border border-slate-200 bg-white px-7 py-5">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Universal Commerce Protocol</div>
              <div className="font-semibold text-slate-700 text-sm">The rails</div>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Discovery &middot; Catalog &middot; Cart &middot; Checkout handoff. Interoperability for commerce systems.
              </p>
            </div>
          </div>
          <div className="text-center mt-4">
            <Link href="/architecture" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
              See the full three-layer model in Architecture notes &rarr;
            </Link>
          </div>
        </div>

        {/* Founder */}
        <div className="mt-20 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-5">Who&apos;s behind this &mdash; and why it took a retail operator to build it</h2>
          <div className="space-y-4 text-[15px] leading-7 text-slate-600">
            <p>
              For 15 years I&apos;ve built retail technology &mdash; modernizing POS, building StoreOS to
              simplify the work colleagues do on the floor, and the hardest version of modernization:
              running legacy and modern POS in the same store at the same time, no big-bang cutover,
              while customers kept shopping. That&apos;s the whole idea here.
            </p>
            <p>
              Millions of merchants on Shopify, Etsy, Amazon, and Walmart Marketplace &mdash; custom apparel
              sellers, local boutiques, specialty food stores, niche wholesalers &mdash; pay steep platform
              fees and give up a cut of every sale, and in return they get a storefront but not
              control: over who sees their catalog, who gets quoted which price, who qualifies, or how
              their fulfillment rules are read outside the platform&apos;s walls. That was manageable
              when humans were clicking. AI agents shopping on behalf of buyers will make it critical,
              because an agent can&apos;t read rules locked inside a platform it can&apos;t reach &mdash; so
              the merchant pays the platform tax and still gets left out of the next commerce layer.
            </p>
            <p>
              Every previous shift &mdash; mobile, voice, social &mdash; got built for the big players first, and
              small merchants got the integration years later, at a price, inside a new lock-in.
              RetailAgentOS is the bridge: declare your rules once, keep selling, and let your existing
              store join agentic commerce without rebuilding anything.
            </p>
            <p className="text-slate-700">
              I&apos;m building it in the open because I honestly don&apos;t know yet whether merchants
              will configure this layer themselves or whether platforms need to absorb it invisibly &mdash;
              and I&apos;d rather find that out in public than guess in private.
            </p>
          </div>
          <div className="mt-5">
            <Link href="/buildlog" className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
              Follow the build, open question and all &rarr;
            </Link>
          </div>
        </div>

        {/* Merged closing — dual-track doors */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">You&apos;ve seen the problem. Pick your path.</h2>
          <p className="text-sm text-gray-500 mb-8">RetailAgentOS is the bridge &mdash; declare your rules once, and every agent that shops for your customers can find you.</p>

          {/* Two equal doors — merchant + builder (one responsive grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
            <Link href="/for-merchants" className="group block bg-white border border-slate-300 rounded-xl p-5 hover:border-slate-900 hover:shadow-sm transition-all">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">I&apos;m a Merchant</p>
              <p className="text-base font-bold text-slate-900 leading-snug mb-2">Make my store visible to AI</p>
              <p className="text-sm text-slate-500 mb-3">Declare your rules once and join agentic commerce without rebuilding anything.</p>
              <span className="text-sm text-emerald-600 font-semibold group-hover:text-emerald-700">Start here &rarr;</span>
            </Link>
            <Link href="/demo" className="group block bg-white border border-slate-300 rounded-xl p-5 hover:border-slate-900 hover:shadow-sm transition-all">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">I&apos;m a Builder</p>
              <p className="text-base font-bold text-slate-900 leading-snug mb-2">Open the live playground</p>
              <p className="text-sm text-slate-500 mb-3">Run a real agent query against a live merchant profile and see exactly what it returns.</p>
              <span className="text-sm text-emerald-600 font-semibold group-hover:text-emerald-700">Try it now &rarr;</span>
            </Link>
          </div>

          {/* Tertiary — following the build */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/guided" className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
              Prefer a guided story? Watch Sara&apos;s Boutique get found &rarr;
            </Link>
            <Link href="/buildlog" className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
              Just following along? See what shipped &rarr;
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

