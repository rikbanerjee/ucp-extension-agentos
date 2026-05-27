import Link from 'next/link';
import { CheckCircle, Clock, BookOpen, Layers, ArrowUpRight } from 'lucide-react';

const provenPillars = [
  {
    label: 'UCP Profile + Extension Declaration',
    detail: 'Vendor-scoped extensions declared alongside core UCP capabilities in /.well-known/ucp',
  },
  {
    label: 'Context-Driven Visibility & Eligibility',
    detail: 'Structured visibility and eligibility reasoning — VISIBLE, HIDDEN, ELIGIBLE, CONDITIONAL, BLOCKED',
  },
  {
    label: 'Contextual Pricing',
    detail: 'Member pricing, sale pricing, bulk tier pricing — all derived from PricingContext, not hard-coded',
  },
  {
    label: 'Bulk Order Semantics',
    detail: 'MOQ enforcement, quantity increments, and volume-based tier selection before cart validation',
  },
  {
    label: 'Fulfillment Constraints',
    detail: 'Mode and region availability restrictions surfaced at catalog time, not checkout time',
  },
  {
    label: 'Human + Machine Dual Payload',
    detail: 'Every decision is expressed in both human-readable reasoning and raw JSON — built for agents and developers',
  },
];

// TODO: The phases below are placeholders derived from PROJECT_CONTEXT.md future scope.
// Exact specs, sequencing, and scope for each phase need to be defined.
const roadmapPhases = [
  {
    phase: 'Phase 1',
    title: 'UCP Extension Demo',
    status: 'complete' as const,
    description: 'Proves the extension thesis across three merchant archetypes. Four interactive pillars: Profile Viewer, Context Simulator, Catalog Search, Cart Validation.',
    items: ['Boutique (discovery)', 'Wholesale (gating + bulk)', 'Grocery (offers + fulfillment)'],
  },
  {
    phase: 'Phase 2',
    title: 'Loyalty & Account Linking',
    status: 'planned' as const,
    description: 'Preview earn/burn mechanics, account-linked state, and member benefit summaries. Agents need to understand loyalty state before recommending or pricing.',
    items: [
      'Account linked vs not linked state',
      'Earn preview per cart action',
      'Redeem eligibility reasoning',
      // TODO: Exact loyalty spec TBD — what loyalty data shapes should agents consume?
    ],
    todo: 'Loyalty extension spec not yet defined. Needs design session.',
  },
  {
    phase: 'Phase 3',
    title: 'Intent Capture Flows',
    status: 'planned' as const,
    description: 'Non-checkout commerce outcomes. An agent that cannot complete a checkout should know how to route to an intent capture flow instead.',
    items: [
      'WhatsApp handoff routing',
      'Lead form submission',
      'Assisted sales callback',
      // TODO: Intent capture routing schema TBD
    ],
    todo: 'Intent capture routing schema and agent action vocabulary not yet defined.',
  },
  {
    phase: 'Phase 4',
    title: 'Fulfillment Constraint Engine',
    status: 'planned' as const,
    description: 'Richer fulfillment reasoning: pickup-only behaviors, local delivery windows, lead times, manual quote requirements.',
    items: [
      'Supported modes per region',
      'Lead time declarations',
      'Manual quote requirement flags',
      // TODO: Fulfillment constraint depth TBD
    ],
    todo: 'Deep fulfillment constraint spec not yet defined.',
  },
  {
    phase: 'Phase 5',
    title: 'Cart Bridging & Checkout Handoff',
    status: 'planned' as const,
    description: 'Optional checkout handoff — bridging from extension-aware cart validation to an actual downstream transaction flow.',
    items: [
      'Cart state serialization',
      'Downstream handoff contract',
      // TODO: Checkout bridge schema TBD
    ],
    todo: 'Cart bridging and handoff contract not yet defined.',
  },
  {
    phase: 'Future',
    title: 'Upstream UCP Proposals',
    status: 'future' as const,
    description: 'Identify extension patterns from this project that could be proposed upstream into the broader UCP ecosystem.',
    items: [
      'Pattern candidates for standardization',
      'Extension namespace governance',
      // TODO: Requires community discussion and UCP upstream process
    ],
    todo: 'Depends on UCP community engagement. No specs to define yet.',
  },
];

const merchants = [
  {
    name: 'Boutique A',
    thesis: 'Discovery-led commerce',
    proven: 'Clean DTC payloads. Public pricing. No qualification gating. An agent can recommend freely.',
  },
  {
    name: 'Wholesale B',
    thesis: 'Qualification & bulk semantics',
    proven: 'Gated visibility, MOQ enforcement, tiered pricing. An agent must verify buyer qualifications first.',
  },
  {
    name: 'Grocery Retail C',
    thesis: 'Contextual offers & fulfillment',
    proven: 'Sale prices, mix-and-match promos, region-sensitive availability. Context drives all outcomes.',
  },
];

export default function VisionPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">

        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            A learning journey into agentic commerce
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 mb-6">
            RetailAgentOS
          </h1>
          <p className="text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
            A spec and reference framework for AI agents that reason over retail semantics —
            before, during, and beyond checkout.
          </p>
          <p className="mt-4 text-sm text-slate-500 max-w-xl mx-auto">
            This project is not a product. It is a deep-dive learning vehicle and a reference
            implementation path for the question:{' '}
            <em className="text-slate-700">
              &quot;What do agents really need from a merchant before they can act?&quot;
            </em>
          </p>
        </div>

        {/* What This Demo Proves */}
        <div className="mt-20">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">What Phase 1 proves</h2>
            <p className="mt-2 text-slate-500 text-sm">
              The UCP extension demo is the first chapter. These are the claims it validates.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {provenPillars.map(({ label, detail }) => (
              <div key={label} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900 text-sm">{label}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">{detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Three Merchants */}
        <div className="mt-20">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Three merchants, one protocol</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl">
              The same UCP foundation. The same extension vocabulary. Radically different computed
              outcomes based on context. This is the core thesis.
            </p>
          </div>

          <div className="space-y-4">
            {merchants.map(({ name, thesis, proven }) => (
              <div key={name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex gap-5 items-start">
                <div className="shrink-0">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{name}</div>
                  <div className="font-semibold text-slate-800 text-sm mt-1">{thesis}</div>
                </div>
                <div className="w-px bg-slate-200 self-stretch" />
                <p className="text-sm text-slate-600 leading-relaxed">{proven}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap */}
        <div className="mt-20">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">The journey ahead</h2>
            <p className="mt-2 text-slate-500 text-sm max-w-xl">
              Each phase builds a new capability into the RetailAgentOS spec. Phases 2–5 are planned
              but not yet spec&apos;d — see TODO markers.
            </p>
          </div>

          <div className="space-y-5">
            {roadmapPhases.map(({ phase, title, status, description, items, todo }) => (
              <div
                key={phase}
                className={`rounded-xl border p-6 shadow-sm ${
                  status === 'complete'
                    ? 'border-emerald-200 bg-emerald-50/50'
                    : status === 'planned'
                    ? 'border-slate-200 bg-white'
                    : 'border-slate-200 bg-slate-50/50 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 mb-3">
                    {status === 'complete' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    ) : status === 'planned' ? (
                      <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-slate-300 shrink-0" />
                    )}
                    <div>
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{phase}</span>
                      <h3 className="font-bold text-slate-900 text-base">{title}</h3>
                    </div>
                  </div>
                  <div>
                    {status === 'complete' && (
                      <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1">
                        Complete
                      </span>
                    )}
                    {status === 'planned' && (
                      <span className="text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2.5 py-1">
                        Planned
                      </span>
                    )}
                    {status === 'future' && (
                      <span className="text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 rounded-full px-2.5 py-1">
                        Future
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed mb-4">{description}</p>

                <ul className="space-y-1 mb-3">
                  {items.map((item) => (
                    <li key={item} className="text-sm text-slate-700 flex items-center gap-2">
                      <span className={`w-1 h-1 rounded-full shrink-0 ${status === 'complete' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      {item}
                    </li>
                  ))}
                </ul>

                {todo && (
                  <div className="mt-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 font-mono">
                    {/* TODO: {todo} */}
                    TODO: {todo}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* The Why */}
        <div className="mt-20 rounded-2xl border border-slate-200 bg-slate-900 p-10 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-white mb-4">
            Why this matters for agentic commerce
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mx-auto">
            If UCP is going to support real-world AI agents, the protocol story cannot stop at
            discovery and checkout handoff. Merchants need a semantics layer that explains whether
            an item is visible, whether a price is valid in context, whether a promotion applies,
            or whether a buyer qualifies at all. RetailAgentOS is the exploration of what that
            layer looks like — built from real merchant archetypes, not hypothetical examples.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/demo"
              className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              Explore the demo <Layers className="w-4 h-4" />
            </Link>
            <Link
              href="/architecture"
              className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-white/40 transition-colors flex items-center gap-2"
            >
              Architecture notes <BookOpen className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-10 text-center">
          <p className="text-xs text-slate-400">
            Start from the beginning?{' '}
            <Link href="/home" className="text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors">
              Read the full story
            </Link>
            {' '}·{' '}
            <Link href="/" className="text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors">
              Simple overview
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
