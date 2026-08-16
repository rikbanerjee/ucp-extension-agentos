import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';
import { ArrowRight, AlertTriangle, Layers } from 'lucide-react';

const computedContracts = [
  {
    name: 'ComputedVisibility',
    shape: `{ status: 'VISIBLE' | 'HIDDEN', reason?: string }`,
    note: 'Tells an agent whether to surface the item to this buyer. HIDDEN includes the reason why.',
  },
  {
    name: 'ComputedEligibility',
    shape: `{ status: 'ELIGIBLE' | 'CONDITIONAL' | 'BLOCKED', reasons: EligibilityReason[] }`,
    note: 'Tells an agent whether a purchase is valid. Each reason has a code, message, and blocking flag.',
  },
  {
    name: 'ComputedPriceState',
    shape: `{ unitPrice, priceSource: 'base'|'member'|'bulk_tier'|'promo_sale'|'promo_tier', appliedTier?, teaser? }`,
    note: 'The resolved price with its source. teaser surfaces "add 5 more for 10% off"-style prompts.',
  },
  {
    name: 'CartValidationResult',
    shape: `{ valid, lines[{ lineId, valid, unitPrice, lineTotal, eligibility, priceSource, messages[] }], cartTotal }`,
    note: 'Full cart-level validation — each line validated against the live context.',
  },
];

const extensionNamespaces = [
  {
    id: 'ext.pricing_context',
    namespace: 'com.os.retailagent.shopping.pricing_context',
    purpose: 'Carrier of buyer context: customer type, tier, region, fulfillment mode, tax state. All other extensions consume it.',
    enabledFor: ['Boutique A', 'Wholesale B', 'Grocery C'],
    required: true,
  },
  {
    id: 'ext.eligibility',
    namespace: 'com.os.retailagent.shopping.eligibility',
    purpose: 'Structured visibility and eligibility reasoning. Returns VISIBLE/HIDDEN and ELIGIBLE/CONDITIONAL/BLOCKED with machine-readable reason codes.',
    enabledFor: ['Boutique A', 'Wholesale B', 'Grocery C'],
    required: true,
  },
  {
    id: 'ext.member_pricing',
    namespace: 'com.os.retailagent.shopping.member_pricing',
    purpose: 'Member-exclusive pricing, teaser pricing for upsell, and locked price states for unqualified buyers.',
    enabledFor: ['Wholesale B'],
    required: false,
  },
  {
    id: 'ext.bulk_pricing',
    namespace: 'com.os.retailagent.shopping.bulk_pricing',
    purpose: 'Minimum Order Quantities (MOQ), quantity increments, and volume-based price tier selection.',
    enabledFor: ['Wholesale B'],
    required: false,
  },
  {
    id: 'ext.promo_pricing',
    namespace: 'com.os.retailagent.shopping.promo_pricing',
    purpose: 'Sale pricing, mix-and-match quantity thresholds, and applied offer state declarations.',
    enabledFor: ['Grocery C'],
    required: false,
  },
  {
    id: 'ext.fulfillment_constraints',
    namespace: 'com.os.retailagent.shopping.fulfillment_constraints',
    purpose: 'Mode and region availability restrictions surfaced at catalog time, not checkout time.',
    enabledFor: ['Grocery C'],
    required: false,
  },
  {
    id: 'ext.loyalty',
    namespace: 'com.os.retailagent.shopping.loyalty',
    purpose: 'Earn/burn preview mechanics, account-linked state, member benefit summaries. (Future — not yet spec\'d)',
    enabledFor: [],
    required: false,
    future: true,
  },
  {
    id: 'ext.intent_capture',
    namespace: 'com.os.retailagent.shopping.intent_capture',
    purpose: 'Non-checkout commerce outcomes: WhatsApp handoff, lead form routing, assisted sales callbacks. (Future — not yet spec\'d)',
    enabledFor: [],
    required: false,
    future: true,
  },
];

const agentGapExamples = [
  {
    without: 'Wholesale item shown to guest buyer',
    impact: 'Agent surfaces a product the buyer cannot purchase — checkout fails with a cryptic error',
    withExtension: 'ext.eligibility returns HIDDEN for guests — agent never surfaces it',
  },
  {
    without: 'List price shown to wholesale member',
    impact: 'Agent quotes wrong price — buyer is surprised at checkout with a different number',
    withExtension: 'ext.member_pricing / ext.bulk_pricing returns correct contextual price before cart',
  },
  {
    without: 'Cart quantity below MOQ',
    impact: 'Agent builds a cart that fails validation at checkout — buyer abandons',
    withExtension: 'ext.bulk_pricing exposes MOQ — agent enforces it during cart construction',
  },
  {
    without: 'Item ordered for shipping to restricted region',
    impact: 'Checkout blocks the item — agent had no way to know it was region-restricted',
    withExtension: 'ext.fulfillment_constraints surfaces restriction at catalog time — agent routes correctly',
  },
];

export default function ArchitecturePage() {
  return (
    <div>
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Architecture Notes
          </h1>
          <p className="mt-2 text-slate-500 text-sm max-w-xl">
            How vendor-scoped extensions layer on top of core UCP to give agents the retail
            semantics they need before checkout.
          </p>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <strong className="text-slate-800">The contract you can build with:</strong> UCP gives the
            rails — discovery, catalog, cart, checkout handoff. The extension layer on top produces
            four computed output shapes that agents (or any downstream system) consume:{' '}
            <code className="text-xs font-mono text-emerald-700">ComputedVisibility</code>,{' '}
            <code className="text-xs font-mono text-emerald-700">ComputedEligibility</code>,{' '}
            <code className="text-xs font-mono text-emerald-700">ComputedPriceState</code>, and{' '}
            <code className="text-xs font-mono text-emerald-700">CartValidationResult</code>. Every
            decision is deterministic and inspectable — see the{' '}
            <Link href="/demo" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-900 transition-colors">
              live Playground
            </Link>{' '}
            to inspect these contracts in real time.
          </div>

          {/* Hero "at a glance" flow */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              The whole model at a glance
            </div>
            <svg
              role="img"
              viewBox="0 0 920 200"
              className="w-full h-auto"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              <title>
                Buyer query flows through UCP rails, into the extension layer of merchant rules,
                which produces four computed outputs that let the agent act correctly.
              </title>
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill="#64748b" />
                </marker>
              </defs>

              {/* 1. Buyer query */}
              <rect x="8" y="74" width="120" height="52" rx="10" fill="#f1f5f9" stroke="#cbd5e1" />
              <text x="68" y="96" textAnchor="middle" fontSize="13" fontWeight="600" fill="#0f172a">Buyer query</text>
              <text x="68" y="114" textAnchor="middle" fontSize="10" fill="#64748b">via AI agent</text>

              <line x1="130" y1="100" x2="168" y2="100" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

              {/* 2. UCP rails */}
              <rect x="172" y="58" width="170" height="84" rx="10" fill="#0f172a" />
              <text x="257" y="80" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff">UCP rails</text>
              <text x="257" y="100" textAnchor="middle" fontSize="9.5" fill="#cbd5e1" fontFamily="ui-monospace, monospace">discover</text>
              <text x="257" y="115" textAnchor="middle" fontSize="9.5" fill="#cbd5e1" fontFamily="ui-monospace, monospace">cart</text>
              <text x="257" y="130" textAnchor="middle" fontSize="9.5" fill="#cbd5e1" fontFamily="ui-monospace, monospace">checkout</text>

              <line x1="344" y1="100" x2="382" y2="100" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

              {/* 3. Extension layer */}
              <rect x="386" y="58" width="180" height="84" rx="10" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
              <text x="476" y="82" textAnchor="middle" fontSize="12" fontWeight="700" fill="#047857">Extension layer</text>
              <text x="476" y="101" textAnchor="middle" fontSize="10" fill="#059669">merchant rules</text>
              <text x="476" y="120" textAnchor="middle" fontSize="9" fill="#10b981" fontFamily="ui-monospace, monospace">eligibility · pricing</text>

              <line x1="568" y1="100" x2="606" y2="100" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

              {/* 4. Four computed outputs */}
              <rect x="610" y="34" width="190" height="132" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
              <text x="705" y="52" textAnchor="middle" fontSize="10" fontWeight="600" fill="#64748b">4 computed outputs</text>
              {['ComputedVisibility', 'ComputedEligibility', 'ComputedPriceState', 'CartValidationResult'].map((t, i) => (
                <g key={t}>
                  <rect x="624" y={62 + i * 24} width="162" height="19" rx="5" fill="#ffffff" stroke="#a7f3d0" />
                  <text x="705" y={75 + i * 24} textAnchor="middle" fontSize="9.5" fill="#047857" fontFamily="ui-monospace, monospace">{t}</text>
                </g>
              ))}

              <line x1="802" y1="100" x2="838" y2="100" stroke="#64748b" strokeWidth="1.5" markerEnd="url(#arrow)" />

              {/* 5. Agent acts correctly */}
              <rect x="842" y="58" width="72" height="84" rx="10" fill="#10b981" />
              <text x="878" y="92" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">Agent</text>
              <text x="878" y="108" textAnchor="middle" fontSize="9" fill="#d1fae5">acts</text>
              <text x="878" y="120" textAnchor="middle" fontSize="9" fill="#d1fae5">correctly</text>
            </svg>
          </div>
        </div>

        <div className="space-y-8">

          {/* Three-Layer Model */}
          <Panel title="The Three-Layer Model">
            <div className="space-y-3">
              <p className="text-sm text-slate-600 mb-5">
                This project operates in three distinct layers. Each builds on the one below it and
                exposes a clear contract upward — read the stack bottom-up.
              </p>

              <svg
                role="img"
                viewBox="0 0 720 360"
                className="w-full h-auto"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                <title>
                  Three-layer stack: Layer 1 core UCP rails at the bottom, Layer 2 vendor-scoped
                  extensions in the middle that extend it, and Layer 3 computed retail semantics on
                  top that evaluates the extension rules.
                </title>
                <defs>
                  <marker id="up" viewBox="0 0 10 10" refX="5" refY="2" markerWidth="7" markerHeight="7" orient="auto">
                    <path d="M0,8 L5,0 L10,8 z" fill="#10b981" />
                  </marker>
                </defs>

                {/* Layer 3 — dark, computed semantics (top) */}
                <rect x="40" y="14" width="640" height="92" rx="12" fill="#0f172a" />
                <text x="60" y="38" fontSize="11" fontWeight="700" fill="#94a3b8" letterSpacing="0.5">LAYER 3 · COMPUTED RETAIL SEMANTICS</text>
                <text x="60" y="56" fontSize="12" fill="#e2e8f0">What the agent evaluates and acts on — deterministic, derived at request time</text>
                {['ComputedVisibility', 'ComputedEligibility', 'ComputedPriceState', 'CartValidationResult'].map((t, i) => (
                  <g key={t}>
                    <rect x={60 + i * 150} y="70" width="142" height="22" rx="5" fill="#1e293b" stroke="#334155" />
                    <text x={131 + i * 150} y="85" textAnchor="middle" fontSize="9.5" fill="#cbd5e1" fontFamily="ui-monospace, monospace">{t}</text>
                  </g>
                ))}

                {/* connector: evaluates */}
                <line x1="360" y1="138" x2="360" y2="112" stroke="#10b981" strokeWidth="2" markerEnd="url(#up)" />
                <text x="372" y="130" fontSize="11" fill="#059669" fontWeight="600">evaluates rules in ↑</text>

                {/* Layer 2 — emerald, extensions (middle) */}
                <rect x="40" y="142" width="640" height="92" rx="12" fill="#ecfdf5" stroke="#10b981" strokeWidth="1.5" />
                <text x="60" y="166" fontSize="11" fontWeight="700" fill="#059669" letterSpacing="0.5">LAYER 2 · VENDOR-SCOPED EXTENSIONS</text>
                <text x="60" y="184" fontSize="12" fill="#047857">How merchant retail rules are declared — namespaced schemas attached to variants</text>
                {['ext.pricing_context', 'ext.eligibility', 'ext.bulk_pricing', 'ext.promo_pricing', 'ext.fulfillment_constraints'].map((e, i) => (
                  <g key={e}>
                    <rect x={60 + i * 122} y="198" width="114" height="22" rx="5" fill="#ffffff" stroke="#a7f3d0" />
                    <text x={117 + i * 122} y="213" textAnchor="middle" fontSize="8.5" fill="#047857" fontFamily="ui-monospace, monospace">{e}</text>
                  </g>
                ))}

                {/* connector: extends */}
                <line x1="360" y1="266" x2="360" y2="240" stroke="#10b981" strokeWidth="2" markerEnd="url(#up)" />
                <text x="372" y="258" fontSize="11" fill="#059669" fontWeight="600">extends and builds on ↑</text>

                {/* Layer 1 — slate, core UCP (bottom) */}
                <rect x="40" y="270" width="640" height="80" rx="12" fill="#f1f5f9" stroke="#cbd5e1" />
                <text x="60" y="294" fontSize="11" fontWeight="700" fill="#64748b" letterSpacing="0.5">LAYER 1 · CORE UCP PROTOCOL</text>
                <text x="60" y="312" fontSize="12" fill="#334155">Protocol rails: discover, transact, hand off — unchanged, not redefined</text>
                {['ucp.catalog.discovery', 'ucp.cart.management', 'ucp.checkout.init'].map((c, i) => (
                  <g key={c}>
                    <rect x={60 + i * 165} y="324" width="155" height="20" rx="5" fill="#ffffff" stroke="#cbd5e1" />
                    <text x={137 + i * 165} y="338" textAnchor="middle" fontSize="9" fill="#475569" fontFamily="ui-monospace, monospace">{c}</text>
                  </g>
                ))}
              </svg>
            </div>
          </Panel>

          {/* Computed Output Contracts */}
          <Panel title="Computed Output Contracts — What Agents Consume">
            <div className="space-y-4">
              <p className="text-sm text-slate-600 mb-4">
                The extension layer resolves to four deterministic output shapes. These are what an
                agent, UI, or downstream system reads to make decisions — not raw merchant config,
                but computed results with reasons.
              </p>

              <svg
                role="img"
                viewBox="0 0 720 230"
                className="w-full h-auto mb-2"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                <title>
                  Buyer context plus extension rules are evaluated to produce four computed output
                  contracts: ComputedVisibility, ComputedEligibility, ComputedPriceState, and
                  CartValidationResult.
                </title>
                <defs>
                  <marker id="fan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill="#10b981" />
                  </marker>
                </defs>

                {/* inputs */}
                <rect x="14" y="40" width="150" height="40" rx="9" fill="#f1f5f9" stroke="#cbd5e1" />
                <text x="89" y="64" textAnchor="middle" fontSize="12" fontWeight="600" fill="#334155">buyer context</text>
                <rect x="14" y="148" width="150" height="40" rx="9" fill="#ecfdf5" stroke="#a7f3d0" />
                <text x="89" y="172" textAnchor="middle" fontSize="12" fontWeight="600" fill="#047857">extension rules</text>

                {/* evaluator */}
                <line x1="164" y1="60" x2="252" y2="105" stroke="#94a3b8" strokeWidth="1.5" />
                <line x1="164" y1="168" x2="252" y2="123" stroke="#94a3b8" strokeWidth="1.5" />
                <rect x="254" y="92" width="120" height="44" rx="10" fill="#0f172a" />
                <text x="314" y="112" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">evaluate</text>
                <text x="314" y="127" textAnchor="middle" fontSize="9" fill="#94a3b8">deterministic</text>

                {/* fan-out to 4 outputs */}
                {['ComputedVisibility', 'ComputedEligibility', 'ComputedPriceState', 'CartValidationResult'].map((t, i) => {
                  const y = 26 + i * 50;
                  return (
                    <g key={t}>
                      <line x1="374" y1="114" x2="470" y2={y + 18} stroke="#10b981" strokeWidth="1.5" markerEnd="url(#fan)" />
                      <rect x="474" y={y} width="232" height="36" rx="8" fill="#ffffff" stroke="#10b981" strokeWidth="1.3" />
                      <text x="590" y={y + 23} textAnchor="middle" fontSize="11.5" fontWeight="600" fill="#047857" fontFamily="ui-monospace, monospace">{t}</text>
                    </g>
                  );
                })}
              </svg>

              <div className="space-y-3">
                {computedContracts.map(({ name, shape, note }) => (
                  <div key={name} className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <Layers className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-mono text-sm font-semibold text-slate-800 mb-1">{name}</div>
                        <div className="font-mono text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded px-2 py-1 mb-2 break-all">{shape}</div>
                        <p className="text-xs text-slate-600 leading-relaxed">{note}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <Link
                  href="/demo"
                  className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1.5 transition-colors"
                >
                  See these computed live in the Playground <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </Panel>

          {/* The Agentic Commerce Gap */}
          <Panel title="The Agentic Commerce Gap">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Without this extension layer, AI shopping agents encounter checkout-time failures
                that could have been prevented at catalog time. The same buyer journey runs two ways:
              </p>

              <svg
                role="img"
                viewBox="0 0 720 240"
                className="w-full h-auto"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                <title>
                  Two parallel tracks. Without the extension, problems are only discovered at
                  checkout and fail. With the extension, the same constraints are caught at catalog
                  time and the agent succeeds.
                </title>
                <defs>
                  <marker id="r-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill="#fb7185" />
                  </marker>
                  <marker id="e-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill="#10b981" />
                  </marker>
                </defs>

                {/* stage labels */}
                <text x="120" y="20" textAnchor="middle" fontSize="10" fontWeight="600" fill="#94a3b8" letterSpacing="0.5">CATALOG</text>
                <text x="360" y="20" textAnchor="middle" fontSize="10" fontWeight="600" fill="#94a3b8" letterSpacing="0.5">CART</text>
                <text x="600" y="20" textAnchor="middle" fontSize="10" fontWeight="600" fill="#94a3b8" letterSpacing="0.5">CHECKOUT</text>

                {/* WITHOUT track (rose) */}
                <text x="14" y="62" fontSize="11" fontWeight="700" fill="#be123c">WITHOUT</text>
                <rect x="40" y="74" width="160" height="40" rx="9" fill="#fff1f2" stroke="#fda4af" />
                <text x="120" y="92" textAnchor="middle" fontSize="10" fill="#9f1239">no constraints surfaced</text>
                <text x="120" y="106" textAnchor="middle" fontSize="10" fill="#9f1239">item shown anyway</text>
                <line x1="200" y1="94" x2="276" y2="94" stroke="#fb7185" strokeWidth="1.5" markerEnd="url(#r-arrow)" />
                <rect x="280" y="74" width="160" height="40" rx="9" fill="#fff1f2" stroke="#fda4af" />
                <text x="360" y="98" textAnchor="middle" fontSize="10" fill="#9f1239">wrong price / qty in cart</text>
                <line x1="440" y1="94" x2="516" y2="94" stroke="#fb7185" strokeWidth="1.5" markerEnd="url(#r-arrow)" />
                <rect x="520" y="74" width="160" height="40" rx="9" fill="#f43f5e" />
                <text x="588" y="98" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">✗ checkout fails</text>

                {/* WITH track (emerald) */}
                <text x="14" y="160" fontSize="11" fontWeight="700" fill="#047857">WITH</text>
                <rect x="40" y="172" width="160" height="40" rx="9" fill="#10b981" />
                <text x="120" y="190" textAnchor="middle" fontSize="10" fill="#ffffff">caught at catalog time</text>
                <text x="120" y="204" textAnchor="middle" fontSize="10" fill="#d1fae5">hidden / labeled / priced</text>
                <line x1="200" y1="192" x2="276" y2="192" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#e-arrow)" />
                <rect x="280" y="172" width="160" height="40" rx="9" fill="#ecfdf5" stroke="#10b981" />
                <text x="360" y="196" textAnchor="middle" fontSize="10" fill="#047857">valid cart, correct price</text>
                <line x1="440" y1="192" x2="516" y2="192" stroke="#10b981" strokeWidth="1.5" markerEnd="url(#e-arrow)" />
                <rect x="520" y="172" width="160" height="40" rx="9" fill="#047857" />
                <text x="588" y="196" textAnchor="middle" fontSize="11" fontWeight="700" fill="#ffffff">✓ checkout succeeds</text>
              </svg>

              <p className="text-sm text-slate-600">
                Each row below shows a concrete scenario — what fails without the extension, and how
                the extension resolves it.
              </p>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/3">Without Extension</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/3">Impact on Agent</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider w-1/3">With Extension</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agentGapExamples.map(({ without, impact, withExtension }, i) => (
                      <tr key={i} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="px-4 py-3 text-slate-700 align-top">
                          <div className="flex gap-2">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                            {without}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-rose-700 align-top text-xs">{impact}</td>
                        <td className="px-4 py-3 text-emerald-700 align-top text-xs">{withExtension}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Panel>

          {/* Extension Namespace Reference */}
          <Panel title="Extension Namespace Reference">
            <div className="space-y-4">
              <p className="text-sm text-slate-600 mb-4">
                All vendor-scoped extensions use a namespaced ID to prevent collisions across
                merchants and protocol versions. Extensions are declared in the merchant&apos;s
                UCP profile and attached to product variants.
              </p>

              <div className="space-y-3">
                {extensionNamespaces.map(({ id, namespace, purpose, enabledFor, required, future }) => (
                  <div
                    key={id}
                    className={`rounded-lg border p-4 ${future ? 'border-slate-100 bg-slate-50/50 opacity-70' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="font-mono text-sm font-semibold text-slate-800">{id}</div>
                        <div className="font-mono text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 mt-1 inline-block">
                          {namespace}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {required && (
                          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 font-semibold">Required</span>
                        )}
                        {future && (
                          <span className="text-xs bg-slate-100 text-slate-500 border border-slate-200 rounded-full px-2 py-0.5 font-semibold">Future</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{purpose}</p>
                    {enabledFor.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        <span className="text-xs text-slate-400">Active in:</span>
                        {enabledFor.map(m => (
                          <span key={m} className="text-xs text-slate-600 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* Core UCP vs Extensions */}
          <Panel title="Core UCP vs Vendor Extensions">
            <div className="prose prose-slate max-w-none text-sm">
              <p>
                The Unified Commerce Protocol (UCP) standardizes the core rails of digital commerce.
                But retail semantics — how things are priced, who can buy them, and under what
                conditions — are fundamentally specific to each merchant and business model.
              </p>
              <p>This demo applies a clear separation of concerns:</p>
              <ul>
                <li>
                  <strong>Core UCP</strong> provides discovery, cart lifecycle, and transaction handoff.
                  It defines <em>what can be done</em>.
                </li>
                <li>
                  <strong>Vendor Extensions</strong> provide the &quot;why&quot; and &quot;under what conditions.&quot;
                  They encapsulate the rules for eligibility, dynamic pricing, and fulfillment constraints.
                  They define <em>whether it should be done, and at what terms</em>.
                </li>
              </ul>
              <p>
                The extension model is deliberately vendor-scoped (namespaced) so that merchants can
                evolve their own semantics without requiring changes to the core protocol.
              </p>
            </div>
          </Panel>

          {/* Why Pre-Checkout Logic Matters */}
          <Panel title="Why Pre-Checkout Retail Logic Matters">
            <div className="prose prose-slate max-w-none text-sm">
              <p>
                Historically, complex pricing and eligibility logic is evaluated late in the funnel —
                at checkout. This leads to poor agent and user experiences: an AI shopping agent
                that builds a cart using the wrong price, the wrong quantity, or a product the
                buyer cannot purchase.
              </p>
              <p>
                By surfacing <code>Eligibility</code>, <code>PricingContext</code>, and <code>BulkPricing</code> extensions
                early — at catalog browsing and cart stages — agents and UIs can:
              </p>
              <ul>
                <li>Hide or label products the current buyer context cannot access.</li>
                <li>Show the exact applicable price before adding to cart.</li>
                <li>Provide actionable feedback during discovery: &quot;Add 5 more for a 10% discount.&quot;</li>
                <li>Route to intent capture instead of checkout when qualification is missing.</li>
              </ul>
            </div>
          </Panel>

          {/* Learning Journey */}
          <Panel title="This is a Learning Journey">
            <div className="prose prose-slate max-w-none text-sm">
              <p>
                This project is a demonstration and a learning vehicle — not a production UCP server,
                not a complete ecommerce platform, not a competing protocol.
              </p>
              <p>
                It exists to test and validate ideas around agentic commerce and structured retail
                semantics. The long-term goal is to identify extension patterns that could eventually
                be proposed upstream into the broader UCP ecosystem.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Link
                href="/vision"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-colors"
              >
                See the RetailAgentOS roadmap <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Panel>

        </div>
      </div>
    </div>
  );
}
