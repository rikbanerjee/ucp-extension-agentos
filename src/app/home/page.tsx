import Link from 'next/link';
import { ArrowRight, BookOpen, Layers, Terminal, Check, HelpCircle, Sparkles } from 'lucide-react';

const ucpProvides = [
  'Catalog discovery endpoint',
  'Cart lifecycle management',
  'Checkout handoff protocol',
  'Capability declaration schema',
  'Merchant identity & endpoint negotiation',
];

const stillMissing = [
  'Is this item visible to this buyer?',
  'Is this price valid in this context?',
  'Does the buyer meet qualification requirements?',
  'Is this quantity valid for wholesale ordering?',
  'Which fulfillment modes apply to this region?',
  'Should this end in checkout — or intent capture?',
];

const features = [
  {
    icon: Terminal,
    title: 'Profile Viewer',
    href: '/profile',
    description: (
      <>
        Inspect a mock <code className="text-slate-800 bg-slate-100 px-1 rounded">/.well-known/ucp</code> profile
        demonstrating how vendor-scoped extensions are declared alongside core UCP capabilities.
      </>
    ),
  },
  {
    icon: Layers,
    title: 'Context Simulator',
    href: '/demo',
    description:
      'Mutate the active request context — customer type, tier, region, fulfillment mode — and watch product visibility and prices adapt in real time.',
  },
  {
    icon: BookOpen,
    title: 'Cart Validation',
    href: '/demo',
    description:
      'Test complex pre-checkout logic: Minimum Order Quantities (MOQ), quantity increments, eligibility restrictions, and bulk pricing tiers.',
  },
];

export default function HomePage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            UCP Retail Semantics Extension Demo
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-tight">
            The missing layer between{' '}
            <span className="text-slate-500">protocol</span> and{' '}
            <span className="text-slate-500">pre-checkout retail logic</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            AI shopping agents can discover endpoints and hand off to checkout.
            But before checkout, they need to answer harder questions.
            This demo shows how vendor-scoped extensions fill that gap — without redefining UCP.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/demo"
              className="rounded-md bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 flex items-center gap-2 transition-colors"
            >
              Launch Playground <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/architecture" className="text-sm font-semibold leading-6 text-slate-900 flex items-center gap-2 hover:text-slate-600 transition-colors">
              Architecture Notes <BookOpen className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* The Gap */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">The gap</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-lg mx-auto">
              Core UCP is the foundation. But real retail decisions happen before a checkout endpoint is even valid.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* UCP Gives You */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <h3 className="font-semibold text-slate-800">Core UCP gives you</h3>
              </div>
              <ul className="space-y-3">
                {ucpProvides.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* What's Missing */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-7 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                </div>
                <h3 className="font-semibold text-slate-800">What agents still need to answer</h3>
              </div>
              <ul className="space-y-3">
                {stillMissing.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* The Bridge */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-900 text-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-300 leading-relaxed">
              Vendor-scoped extensions answer these questions before checkout by adding a
              semantics layer on top of each declared UCP capability — expressed as structured,
              machine-readable payloads that any shopping agent can evaluate.
            </p>
            <Link
              href="/architecture"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              See the three-layer model in Architecture Notes <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">What the demo shows</h2>
            <p className="mt-2 text-slate-500 text-sm">
              Three interactive tools, three merchant archetypes, one unified extension story.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, href, description }) => (
              <Link key={title} href={href} className="group">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:border-slate-400 hover:shadow-md transition-all h-full">
                  <Icon className="w-8 h-8 text-slate-700 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 group-hover:text-slate-700 transition-colors">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Merchant Archetypes */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-slate-900">Three merchants, one protocol story</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
              The same UCP foundation supports radically different retail models through a consistent
              extension layer. The computed outcomes differ — the architecture does not.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Boutique A</div>
              <h3 className="font-semibold text-slate-900 mb-2">Discovery-Led Commerce</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Public DTC items. Clean discovery payloads. No gating, no qualification rules.
                An agent can recommend freely — the payload confirms it.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['ext.pricing_context', 'ext.eligibility'].map(e => (
                  <span key={e} className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">{e}</span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Wholesale B</div>
              <h3 className="font-semibold text-slate-900 mb-2">Qualification & Bulk Semantics</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Gated visibility, MOQ enforcement, tiered pricing by volume.
                An agent must evaluate buyer qualifications before surfacing any item.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['ext.pricing_context', 'ext.eligibility', 'ext.bulk_pricing'].map(e => (
                  <span key={e} className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">{e}</span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Grocery Retail C</div>
              <h3 className="font-semibold text-slate-900 mb-2">Contextual Offers & Fulfillment</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sale pricing, mix-and-match promos, region-sensitive availability.
                Context drives whether an item is valid and at what price.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {['ext.pricing_context', 'ext.eligibility', 'ext.promo_pricing', 'ext.fulfillment_constraints'].map(e => (
                  <span key={e} className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5">{e}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RetailAgentOS Teaser */}
        <div className="mt-20 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-10 text-center shadow-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold text-slate-300 mb-5">
            <Sparkles className="w-3 h-3" />
            What comes next
          </div>
          <h2 className="text-2xl font-bold text-white">
            This is Chapter 1 of the RetailAgentOS journey
          </h2>
          <p className="mt-4 text-slate-400 text-sm leading-relaxed max-w-xl mx-auto">
            This demo proves the extension thesis. RetailAgentOS builds on it — a spec and reference
            framework for AI agents that reason over retail semantics before, during, and beyond checkout.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/vision"
              className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              See the RetailAgentOS vision <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/demo"
              className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-white/40 transition-colors flex items-center gap-2"
            >
              Explore the demo <Layers className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-10 text-center">
          <p className="text-xs text-slate-400">
            Looking for the original quick overview?{' '}
            <Link href="/" className="text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors">
              Back to the simple landing page
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
