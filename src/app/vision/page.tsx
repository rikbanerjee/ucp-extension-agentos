'use client';

import Link from 'next/link';
import { CheckCircle, Clock, BookOpen, Layers, ArrowUpRight, ArrowRight, Store, Bot, Zap, BarChart3 } from 'lucide-react';
import { useView } from '@/lib/context/ViewContext';
import { merchantMeta } from '@/lib/mock/merchantMeta';
import { ViewToggle } from '@/components/ui/ViewToggle';

// ─── Technical mode data (preserved from original) ───────────────────────────

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
    detail: 'Every decision expressed in both human-readable reasoning and raw JSON — for agents and developers',
  },
];

const roadmapPhases = [
  {
    phase: 'Phase 1',
    title: 'Merchant Semantics Foundation',
    status: 'complete' as const,
    description: 'Proves the extension thesis across three merchant archetypes. UCP profile declaration, contextual pricing, visibility and eligibility, bulk semantics, fulfillment constraints, dual human + machine payloads.',
    items: ['Boutique A — discovery-led commerce', 'Wholesale B — gating + bulk pricing', 'Grocery C — offers + fulfillment constraints'],
  },
  {
    phase: 'Phase 2',
    title: 'Loyalty & Account Linking',
    status: 'planned' as const,
    description: 'Preview earn/burn mechanics, account-linked state, and member benefit summaries. Agents need to understand loyalty state before recommending or pricing.',
    items: ['Account linked vs not linked state', 'Earn preview per cart action', 'Redeem eligibility reasoning'],
    todo: 'Loyalty extension spec not yet defined. Needs design session.',
  },
  {
    phase: 'Phase 3',
    title: 'Intent Capture & Assisted Commerce',
    status: 'planned' as const,
    description: 'Non-checkout commerce outcomes. When checkout is not possible, the agent routes to intent capture instead.',
    items: ['WhatsApp handoff routing', 'Lead form submission', 'Assisted sales callback'],
    todo: 'Intent capture routing schema and agent action vocabulary not yet defined.',
  },
  {
    phase: 'Phase 4',
    title: 'Fulfillment Constraint Engine',
    status: 'planned' as const,
    description: 'Richer fulfillment reasoning: pickup-only behaviors, local delivery windows, lead times, manual quote requirements.',
    items: ['Supported modes per region', 'Lead time declarations', 'Manual quote requirement flags'],
    todo: 'Deep fulfillment constraint spec not yet defined.',
  },
  {
    phase: 'Phase 5',
    title: 'Cart Bridge & Checkout Handoff',
    status: 'planned' as const,
    description: 'Optional checkout handoff — bridging from extension-aware cart validation to a downstream transaction flow.',
    items: ['Cart state serialization', 'Downstream handoff contract'],
    todo: 'Cart bridging and handoff contract not yet defined.',
  },
  {
    phase: 'Future',
    title: 'Upstream UCP Proposals',
    status: 'future' as const,
    description: 'Identify recurring extension patterns from this project that could be proposed upstream into the broader UCP ecosystem.',
    items: ['Pattern candidates for standardisation', 'Extension namespace governance'],
    todo: 'Depends on UCP community engagement. No specs to define yet.',
  },
];

const technicalMerchants = [
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

// ─── Business mode data ───────────────────────────────────────────────────────

const merchantValueStories = [
  {
    id: 'm_boutique_001',
    outcome: 'Agent-discoverable catalog',
    value: "Sara's products now appear when AI shopping assistants look for personalised gifts. Declaring her catalog once made her visible to agents she never had to configure individually.",
  },
  {
    id: 'm_wholesale_002',
    outcome: 'Correct pricing, every time',
    value: "B&T's volume tiers and qualification gates are declared once. Agents always quote the right price to the right buyer — no manual corrections, no checkout surprises.",
  },
  {
    id: 'm_grocery_003',
    outcome: 'Promos and delivery work correctly',
    value: "Fresh Corner's weekly sales and local delivery zones are visible to agents at browse time. Buyers only see what they can actually receive, at the price that actually applies.",
  },
];

const platformCapabilities = [
  {
    icon: Store,
    title: 'Store Setup',
    status: 'coming' as const,
    description: 'Configure pricing rules, buyer qualifications, fulfilment zones, and promotions — without needing to understand the underlying protocol.',
  },
  {
    icon: Bot,
    title: 'Agent Understanding',
    status: 'coming' as const,
    description: 'See exactly how AI agents interpret your store rules. Inspect the reasoning behind every visibility, eligibility, and pricing decision.',
  },
  {
    icon: Zap,
    title: 'Agent Actions',
    status: 'coming' as const,
    description: 'Quote, reserve, schedule a callback, route to WhatsApp, or hand off to checkout — all as agent-initiated actions driven by your declared rules.',
  },
  {
    icon: BarChart3,
    title: 'Outcomes',
    status: 'coming' as const,
    description: 'Track what agents did on your behalf: completed handoffs, captured leads, qualification completions, and agent-assisted conversions.',
  },
];

const whyItMatters = [
  {
    problem: 'Invisible catalog',
    detail: 'AI shopping agents cannot recommend products they cannot interpret. Most small merchant catalogs have no machine-readable rules.',
  },
  {
    problem: 'Wrong price quoted',
    detail: 'Without structured pricing context, agents default to list price — ignoring member rates, volume tiers, and active promotions.',
  },
  {
    problem: 'Invalid fulfilment promise',
    detail: 'Agents confirm shipping for items that are pickup-only, or recommend products unavailable in the buyer\'s region.',
  },
  {
    problem: 'Checkout-time failures',
    detail: 'Eligibility, MOQ, and qualification checks happen at checkout — after the agent has already built the cart. Buyers abandon.',
  },
];

// ─── Currently building block ─────────────────────────────────────────────────

function CurrentlyBuilding({ view }: { view: 'business' | 'technical' }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6 mb-10 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Currently building</span>
      </div>

      <div className="space-y-4">
        {/* Immediate — Week 4 */}
        <div className="rounded-lg border border-emerald-200 bg-white p-4">
          <div className="flex items-start justify-between gap-4 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Immediate · Week 4</span>
              <h3 className="font-bold text-slate-900 text-sm">The Specs page</h3>
            </div>
            <span className="text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2.5 py-1 shrink-0">
              In progress
            </span>
          </div>
          {view === 'business' ? (
            <p className="text-sm text-slate-600 leading-relaxed">
              Publishing the eligibility and pricing extension contracts as a first-class reference
              surface. Drafts already live in the repo — this makes them public and citable, so the
              rules agents act on are out in the open.
            </p>
          ) : (
            <p className="text-sm text-slate-600 leading-relaxed">
              Publishing the eligibility and pricing extension contracts as a first-class,
              versioned reference surface — namespaces, schemas, reason-code registries, and open
              questions. Drafts already live in <code className="text-xs">/specs</code> in the repo;
              next is making them public and citable.
            </p>
          )}
        </div>

        {/* Phase 2 — Following */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-4 mb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phase 2 · Following</span>
              <h3 className="font-bold text-slate-900 text-sm">Agent Reasoning Console</h3>
            </div>
            <span className="text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-2.5 py-1 shrink-0">
              Next
            </span>
          </div>
          {view === 'business' ? (
            <p className="text-sm text-slate-600 leading-relaxed">
              A visible console that explains <em>why</em> an agent made each decision — why an item
              is visible or hidden, why a price changed, why a buyer is eligible or blocked. The
              Specs page is the contract layer that makes the Console&apos;s reasoning explainable.
            </p>
          ) : (
            <p className="text-sm text-slate-600 leading-relaxed">
              A step-by-step trace of why an agent made each decision, visible in the Playground
              inspector — over the computed visibility, eligibility, pricing, and fulfilment
              outputs. The Specs page is the contract layer that makes the Console&apos;s reasoning
              explainable, not competing with it.
            </p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <Link
          href="/buildlog#week-3"
          className="text-xs font-medium text-emerald-700 hover:text-emerald-900 transition-colors"
        >
          See build log for context →
        </Link>
      </div>
    </div>
  );
}

// ─── Founder strip ─────────────────────────────────────────────────────────────

function FounderStrip() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mt-16">
      <div className="flex items-start gap-5">
        <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0 flex items-center justify-center text-slate-500 text-sm font-bold">
          RB
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-900 text-sm">Rik Banerjee</span>
            <a
              href="mailto:rikbanerjee007@gmail.com"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              rikbanerjee007@gmail.com
            </a>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Retail technology operator building the agentic commerce layer for small merchants.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {['POS modernization', 'Mobile store OS', 'AI-driven pharmacy workflows', 'Omnichannel fulfillment'].map((b) => (
              <span key={b} className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded px-2 py-0.5">{b}</span>
            ))}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            The gap between UCP and what agents need isn&apos;t theoretical — it&apos;s diagnosed
            from years inside rules-enforcement systems where correctness has real consequences.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <a href="#" className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">{/* TODO: LinkedIn URL */}LinkedIn</a>
            <span className="text-slate-200">·</span>
            <a href="#" className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">{/* TODO: Substack URL */}Substack</a>
            <span className="text-slate-200">·</span>
            <Link href="/buildlog" className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors">Build Log</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mode indicator bar ────────────────────────────────────────────────────────

function ModeBar({ view }: { view: 'business' | 'technical' }) {
  return (
    <div className={`rounded-lg border px-4 py-2.5 mb-10 flex items-center justify-between gap-4 text-xs ${
      view === 'business'
        ? 'bg-slate-50 border-slate-200 text-slate-600'
        : 'bg-slate-900 border-slate-700 text-slate-400'
    }`}>
      <span>
        {view === 'business'
          ? 'Business view — implementation direction and merchant value.'
          : 'Technical view — learning journey, spec framework, and architectural roadmap.'}
      </span>
      <span className="shrink-0 font-medium">
        {view === 'business'
          ? 'Switch to Technical in the nav toggle for the learning journey →'
          : 'Switch to Business in the nav toggle for merchant value →'}
      </span>
    </div>
  );
}

// ─── Business narrative ────────────────────────────────────────────────────────

function BusinessContent() {
  return (
    <>
      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          AI commerce platform direction · Built on UCP
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-tight mb-6">
          Make your store visible to
          <br />
          <span className="text-slate-500">AI shopping agents</span>
        </h1>
        <p className="text-lg leading-8 text-slate-600 max-w-2xl mx-auto">
          RetailAgentOS helps small merchants publish pricing, eligibility, fulfilment, and
          promotion logic in a form AI agents can understand before they recommend, quote,
          or hand off to checkout.
        </p>
        <p className="mt-3 text-sm text-slate-500 max-w-xl mx-auto">
          Built on UCP. Works alongside your existing commerce system — not instead of it.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/guided"
            className="rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors flex items-center gap-2"
          >
            See Guided Demo <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/demo"
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-400 transition-colors flex items-center gap-2"
          >
            Open Playground <Layers className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Why it matters */}
      <div className="mt-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Why most small merchants are invisible to agents</h2>
          <p className="mt-2 text-slate-500 text-sm max-w-xl">
            UCP gives the rails — discovery, catalog, cart, checkout handoff. But agents
            still can&apos;t reason about a merchant&apos;s rules. That&apos;s the gap. These
            are the four ways it breaks.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {whyItMatters.map(({ problem, detail }) => (
            <div key={problem} className="rounded-xl border border-rose-100 bg-rose-50/50 p-5">
              <div className="font-semibold text-slate-900 text-sm mb-1.5">{problem}</div>
              <p className="text-sm text-slate-600 leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mt-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">What RetailAgentOS does</h2>
          <p className="mt-2 text-slate-500 text-sm">Three steps from store rules to correct outcomes.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {[
            {
              step: '01',
              title: 'Publish your store rules',
              body: 'Pricing tiers, buyer qualifications, fulfilment zones, promotions — declared once in a structured, machine-readable form.',
            },
            {
              step: '02',
              title: 'Let agents understand your store',
              body: 'Any AI shopping agent can read your declarations, evaluate buyer context, and reason about what is valid for this buyer at this moment.',
            },
            {
              step: '03',
              title: 'Drive correct outcomes',
              body: 'The right product to the right buyer at the right price — with the right next action: recommendation, quote, callback, or checkout.',
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
              <div className="text-3xl font-black text-slate-200 mb-4 font-mono">{step}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Merchant value stories */}
      <div className="mt-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">What it looks like for real merchants</h2>
          <p className="mt-2 text-slate-500 text-sm max-w-xl">
            Three different store types. Three different rule sets. One platform handling all of it correctly.
          </p>
        </div>
        <div className="space-y-5">
          {merchantValueStories.map(({ id, outcome, value }) => {
            const meta = merchantMeta[id];
            return (
              <div key={id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-5">
                  <div className="shrink-0 min-w-[160px]">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{meta.archetype}</div>
                    <div className="font-bold text-slate-900 text-sm">{meta.humanName}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{meta.tagline}</div>
                  </div>
                  <div className="w-px bg-slate-200 self-stretch shrink-0" />
                  <div className="flex-1">
                    <div className="inline-flex items-center gap-1.5 mb-2">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-700">{outcome}</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Platform direction */}
      <div className="mt-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Platform direction</h2>
          <p className="mt-2 text-slate-500 text-sm max-w-xl">
            Phase 1 proves the foundation. These are the capabilities being built next — turning
            the protocol layer into a full merchant-facing platform.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {platformCapabilities.map(({ icon: Icon, title, status, description }) => (
            <div key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-slate-600" />
                  <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
                </div>
                {status === 'coming' && (
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-2 py-0.5 uppercase tracking-wider">
                    Coming
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-20 rounded-2xl border border-slate-200 bg-slate-900 p-10 text-center shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-3">
          See it working for merchants like yours
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto mb-8">
          Walk through Sara, B&T, and Fresh Corner — see how each merchant&apos;s rules are
          declared and how the agent responds to different buyer contexts in real time.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/guided"
            className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            Start Guided Demo <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/architecture"
            className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-white/40 transition-colors flex items-center gap-2"
          >
            Architecture <BookOpen className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
}

// ─── Technical narrative ──────────────────────────────────────────────────────

function TechnicalContent() {
  return (
    <>
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
          This is a deep-dive learning vehicle and reference implementation path for the question:{' '}
          <em className="text-slate-700">
            &quot;What do agents really need from a merchant before they can act?&quot;
          </em>
        </p>
      </div>

      {/* Phase 1 proof points */}
      <div className="mt-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">What Phase 1 proves</h2>
          <p className="mt-2 text-slate-500 text-sm">
            The UCP extension demo is the first chapter. These are the architectural claims it validates.
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

      {/* Three merchants */}
      <div className="mt-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">Three merchants, one protocol</h2>
          <p className="mt-2 text-slate-500 text-sm max-w-xl">
            The same UCP foundation. The same extension vocabulary. Radically different computed
            outcomes based on context. This is the core thesis.
          </p>
        </div>
        <div className="space-y-4">
          {technicalMerchants.map(({ name, thesis, proven }) => (
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
                    <span className="text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-1">Complete</span>
                  )}
                  {status === 'planned' && (
                    <span className="text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2.5 py-1">Planned</span>
                  )}
                  {status === 'future' && (
                    <span className="text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 rounded-full px-2.5 py-1">Future</span>
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
                  {`TODO: ${todo}`}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Why this matters */}
      <div className="mt-20 rounded-2xl border border-slate-200 bg-slate-900 p-10 text-center shadow-lg">
        <h2 className="text-2xl font-bold text-white mb-4">
          Why this matters for agentic commerce
        </h2>
        <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mx-auto">
          UCP provides the rails — discovery, catalog, cart, checkout handoff. But the rails
          alone don&apos;t make a merchant&apos;s rules machine-readable. Agents still can&apos;t
          reliably reason about visibility, contextual price, qualification, fulfilment feasibility,
          or what action to take. RetailAgentOS is the semantics and reasoning layer that fills
          that gap — built from real merchant archetypes, not hypothetical examples.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/demo"
            className="rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
          >
            Explore the Playground <Layers className="w-4 h-4" />
          </Link>
          <Link
            href="/architecture"
            className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-white/40 transition-colors flex items-center gap-2"
          >
            Architecture notes <BookOpen className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VisionPage() {
  const { view } = useView();

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex justify-end mb-6">
          <ViewToggle />
        </div>
        <ModeBar view={view} />
        <CurrentlyBuilding view={view} />
        {view === 'business' ? <BusinessContent /> : <TechnicalContent />}
        <FounderStrip />
        <div className="mt-10 text-center">
          <p className="text-xs text-slate-400">
            <Link href="/" className="text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors">
              Overview
            </Link>
            {' '}·{' '}
            <Link href="/guided" className="text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors">
              See it (90s)
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
