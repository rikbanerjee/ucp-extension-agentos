import Link from 'next/link';
import AgentDemoStrip from '@/components/AgentDemoStrip';

const merchants = [
  {
    humanName: "Sara's Boutique",
    archetype: 'Discovery-Led Retail',
    problem: 'Sara has beautiful handcrafted products. AI shopping assistants never recommend them — she has no machine-readable way to declare what she sells or who it is for.',
    resolution: 'With RetailAgentOS, Sara declares her catalog once. Any agent helping a shopper find personalised gifts now finds her.',
  },
  {
    humanName: 'B&T Wholesale',
    archetype: 'Qualification-First Commerce',
    problem: "B&T's tiered pricing and buyer qualification rules were invisible to agents. Buyers were quoted the wrong price, and unqualified buyers saw listings they couldn't purchase.",
    resolution: 'RetailAgentOS enforces qualification gates and volume pricing automatically. Agents always quote the right tier to the right buyer.',
  },
  {
    humanName: 'Fresh Corner Market',
    archetype: 'Contextual Offers & Fulfilment',
    problem: "Customers ordered items for shipping that Fresh Corner only delivers locally. Weekly promos weren't visible to agents at checkout time.",
    resolution: 'RetailAgentOS surfaces promos in real time and blocks unavailable fulfilment modes before the buyer wastes a trip.',
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Your store introduces itself.',
    body: 'A simple, standard file tells AI assistants what your store offers and what it can do — like a storefront sign written for machines.',
  },
  {
    step: '02',
    title: 'Your rules become answers.',
    body: 'Who qualifies for member pricing. What the bulk discount is. What ships where. Each rule becomes a clear yes, no, or here’s-what-you’d-need — answered instantly, while the AI is still browsing.',
  },
  {
    step: '03',
    title: 'Every decision comes with a reason.',
    body: 'When the answer is no, the AI hears why and what would change it. No silent failures, no abandoned carts, no guessing.',
  },
];

const readinessLadder = [
  {
    level: 'Level 1',
    name: 'Visible.',
    body: 'AI can find you. Your store shows up when AI assistants go shopping.',
    who: 'For any store — takes about a day.',
  },
  {
    level: 'Level 2',
    name: 'Correct.',
    body: 'AI gets your rules right. Prices, promotions, memberships, and shipping — answered correctly before checkout.',
    who: 'For growing stores with real pricing complexity.',
  },
  {
    level: 'Level 3',
    name: 'Trusted.',
    body: 'AI can buy safely. The price the AI shows is the price you charge. Age-restricted and regulated products handled properly.',
    who: 'For grocery, wholesale, and regulated retail.',
  },
  {
    level: 'Level 4',
    name: 'Native.',
    body: 'Your whole platform is ready. Commerce platforms build it in once — every store on the platform inherits levels 1–3 automatically.',
    who: 'For platforms and marketplaces.',
  },
];

const proofStats = [
  { value: '100%', label: 'Decisions explained', body: 'Every yes, no, and price comes with a stated reason.' },
  { value: '328', label: 'Automated checks', body: 'Every rule is tested against real shopping scenarios before it ships.' },
  { value: '3', label: 'Store types proven', body: 'A boutique, a wholesaler, and a grocer — very different rules, one system.' },
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

        {/* Section 1 — Hero */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              RetailAgentOS
            </span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-tight">
            AI shoppers are coming.
            <br />
            Your store speaks human.
          </h1>
          <p className="text-4xl font-bold tracking-tight text-slate-500 sm:text-5xl leading-tight mt-1">
            We teach it to speak AI.
          </p>
          <p className="mt-4 text-lg text-gray-500 max-w-md mx-auto">
            People are starting to shop through AI assistants — &ldquo;find me a gift under $50 that arrives by Friday.&rdquo;
          </p>
          <p className="mt-4 text-base text-slate-600 max-w-lg mx-auto">
            <span className="font-semibold text-slate-900">RetailAgent<span className="text-emerald-600">OS</span></span>{' '}makes sure that when an AI shops your store, it gets your prices, your rules, and your stock right.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
            <Link
              href="/aeo-score"
              className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
            >
              Check your store&rsquo;s AI-readiness score &rarr;
            </Link>
            <a
              href="#demo"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              See it work (90-second demo) &rarr;
            </a>
          </div>
        </div>

        {/* Concrete teaser — unchanged from prior build (homepage-reorder.md step 2):
            leads a cold reader from the abstract hero into the live demo below. */}
        <div className="mt-8 max-w-2xl mx-auto bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden shadow-md shadow-slate-200/60">
          <div className="px-7 pt-4 pb-3 border-b border-gray-200 text-center">
            <p className="text-sm tracking-[0.2em] text-amber-500 font-bold flex items-center justify-center gap-2">
              <span className="text-base">⚠</span> Today, Without RetailAgentOS
            </p>
          </div>
          <div className="px-7 pt-4 pb-4 space-y-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              An AI shopper searches for a personalized Father&apos;s Day T-shirt under $50, shipping to California.
            </p>
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
            <p className="text-xl font-bold leading-tight pt-0.5">
              <s className="text-gray-900 decoration-red-500 decoration-2">TheCustomHub</s><br />
              <s className="text-gray-900 decoration-red-500 decoration-2">Sara&apos;s Boutique</s><br />
              <s className="text-gray-900 decoration-red-500 decoration-2 italic">You</s>
            </p>
          </div>
          <div className="px-7 py-4 border-t border-gray-100 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-medium text-emerald-700 tracking-wide hover:bg-emerald-100 hover:border-emerald-300 transition-colors cursor-default select-none">
              <span className="animate-bounce inline-block">&darr;</span>
              now watch what changes
            </span>
          </div>
        </div>

        {/* Section 2 — The problem (before/after panel) */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900">AI can see your store. It doesn&rsquo;t understand it.</h2>
            <p className="mt-3 text-slate-500 text-sm max-w-xl mx-auto leading-relaxed">
              An AI assistant can read your product pages. But it doesn&rsquo;t know your member prices,
              your bulk discounts, what ships where, or who&rsquo;s allowed to buy what. So it guesses —
              and guesses cost you sales.
            </p>
          </div>

          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-6">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider mb-3">Without RetailAgentOS</p>
              <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
                <li>AI can&rsquo;t see your store — many stores are invisible to AI search entirely</li>
                <li>Quotes the wrong price — the AI shows one number, checkout charges another</li>
                <li>Carts fail at checkout — the AI builds a cart your store has to reject</li>
                <li>Nobody knows why — the sale dies silently, and the AI stops recommending you</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">With RetailAgentOS</p>
              <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
                <li>AI finds you in agent search — your store shows up when assistants go shopping</li>
                <li>Right price, every buyer — member, bulk, and sale prices, correct before checkout</li>
                <li>Carts that check out — problems caught while browsing, not at the register</li>
                <li>Every &ldquo;no&rdquo; comes with a why — &ldquo;this doesn&rsquo;t ship to Canada,&rdquo; not a dead end</li>
              </ul>
            </div>
          </div>
          <p className="text-center mt-6 text-sm font-medium text-slate-500 max-w-md mx-auto">
            Every misunderstanding is a lost sale. RetailAgentOS ends the misunderstandings.
          </p>
        </div>

        {/* Demo strip — scroll target */}
        <div id="demo" className="scroll-mt-6 mt-16">
          <AgentDemoStrip />
        </div>

        {/* Breadth connector */}
        <div className="mt-16 max-w-xl mx-auto text-center">
          <p className="text-xl font-bold text-gray-900">Discovery is just the start.</p>
          <p className="mt-2 text-sm text-slate-500 leading-relaxed">
            Wholesalers get mispriced. Retailers get fulfillment wrong. Same blind spot — different cost.
          </p>
        </div>

        {/* Merchant stories — breadth proof (homepage-reorder.md's anchor for the
            connector above: discovery, wholesale mispricing, and fulfilment errors
            are three distinct blind spots, not one boutique-only problem). */}
        <div className="mt-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Every retail tier has a blind spot.</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              That&apos;s exactly what RetailAgentOS is being built to fix.
            </p>
          </div>
          <div className="space-y-5">
            {merchants.map(({ humanName, archetype, problem, resolution }) => (
              <div key={humanName} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
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
            ))}
          </div>
        </div>

        {/* Section 3 — How it works */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">A translator between your store and AI shoppers</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto leading-relaxed">
              You already have the rules. RetailAgentOS explains them in a language AI understands —
              before checkout, not after it fails.
            </p>
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
          <p className="text-center mt-8 text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            Same question, same answer, every time. There&rsquo;s no AI guessing inside RetailAgentOS —
            your rules run exactly as you wrote them, and we can prove it.
          </p>
        </div>

        {/* Section 4 — The readiness ladder */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">How ready is your store?</h2>
            <p className="mt-2 text-slate-500 text-sm">Four levels. Most stores are at zero.</p>
          </div>
          <div className="max-w-2xl mx-auto space-y-3">
            {readinessLadder.map(({ level, name, body, who }) => (
              <div key={level} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-start gap-4">
                <span className="shrink-0 text-xs font-semibold text-emerald-600 uppercase tracking-wider rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 mt-0.5">
                  {level}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{name}</h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{body}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{who}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/aeo-score"
              className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
            >
              Find out your level — free store check &rarr;
            </Link>
          </div>
        </div>

        {/* Section 5 — Proof */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Built in the open. Tested like it matters.</h2>
          </div>
          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {proofStats.map(({ value, label, body }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-3xl font-black text-emerald-600">{value}</p>
                <p className="text-sm font-semibold text-slate-900 mt-1">{label}</p>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-6 text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
            We publish exactly what&rsquo;s built, what&rsquo;s designed, and what&rsquo;s next — verified
            against the code. Where something isn&rsquo;t real yet, it&rsquo;s labeled.{' '}
            <Link href="/evidence" className="font-semibold text-slate-700 hover:text-slate-900 underline underline-offset-2">
              See the scorecard &rarr;
            </Link>
          </p>
        </div>

        {/* Merged closing — dual-track doors (Section 6 + 7 + homepage-reorder's merged rail) */}
        <div className="mt-20 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">You&rsquo;ve seen the problem. Pick your path.</h2>
          <p className="text-sm text-gray-500 mb-8 max-w-lg mx-auto">
            Run the free check. Two minutes, no signup — get your AI-readiness score and the exact list
            of what&rsquo;s holding it back.
          </p>

          {/* Two equal doors — retailer + platforms/builders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto text-left">
            <Link href="/aeo-score" className="group block bg-white border border-slate-300 rounded-xl p-5 hover:border-slate-900 hover:shadow-sm transition-all">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">For Retailers</p>
              <p className="text-base font-bold text-slate-900 leading-snug mb-2">Don&rsquo;t lose the sale to a misunderstanding.</p>
              <p className="text-sm text-slate-500 mb-3">
                AI assistants are already trying to shop stores like yours — and failing silently. Get
                visible, get quoted correctly, and make every AI interaction end in a sale or a clear reason.
              </p>
              <span className="text-sm text-emerald-600 font-semibold group-hover:text-emerald-700">Check my store&rsquo;s score &rarr;</span>
            </Link>
            <Link href="/adopt" className="group block bg-white border border-slate-300 rounded-xl p-5 hover:border-slate-900 hover:shadow-sm transition-all">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">For Platforms &amp; Builders</p>
              <p className="text-base font-bold text-slate-900 leading-snug mb-2">Build it once. Every merchant inherits it.</p>
              <p className="text-sm text-slate-500 mb-3">
                RetailAgentOS is published as open specifications with a running reference implementation —
                not a walled product. Adopt it at the platform level and your entire long tail becomes
                AI-ready for free.
              </p>
              <span className="text-sm text-emerald-600 font-semibold group-hover:text-emerald-700">Read the specs &rarr;</span>
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
