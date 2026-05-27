import Link from 'next/link';
import { Panel } from '@/components/ui/Panel';
import { ArrowRight, AlertTriangle } from 'lucide-react';

const extensionNamespaces = [
  {
    id: 'ext.pricing_context',
    namespace: 'com.ezyupload.shopping.pricing_context',
    purpose: 'Carrier of buyer context: customer type, tier, region, fulfillment mode, tax state. All other extensions consume it.',
    enabledFor: ['Boutique A', 'Wholesale B', 'Grocery C'],
    required: true,
  },
  {
    id: 'ext.eligibility',
    namespace: 'com.ezyupload.shopping.eligibility',
    purpose: 'Structured visibility and eligibility reasoning. Returns VISIBLE/HIDDEN and ELIGIBLE/CONDITIONAL/BLOCKED with machine-readable reason codes.',
    enabledFor: ['Boutique A', 'Wholesale B', 'Grocery C'],
    required: true,
  },
  {
    id: 'ext.member_pricing',
    namespace: 'com.ezyupload.shopping.member_pricing',
    purpose: 'Member-exclusive pricing, teaser pricing for upsell, and locked price states for unqualified buyers.',
    enabledFor: ['Wholesale B'],
    required: false,
  },
  {
    id: 'ext.bulk_pricing',
    namespace: 'com.ezyupload.shopping.bulk_pricing',
    purpose: 'Minimum Order Quantities (MOQ), quantity increments, and volume-based price tier selection.',
    enabledFor: ['Wholesale B'],
    required: false,
  },
  {
    id: 'ext.promo_pricing',
    namespace: 'com.ezyupload.shopping.promo_pricing',
    purpose: 'Sale pricing, mix-and-match quantity thresholds, and applied offer state declarations.',
    enabledFor: ['Grocery C'],
    required: false,
  },
  {
    id: 'ext.fulfillment_constraints',
    namespace: 'com.ezyupload.shopping.fulfillment_constraints',
    purpose: 'Mode and region availability restrictions surfaced at catalog time, not checkout time.',
    enabledFor: ['Grocery C'],
    required: false,
  },
  {
    id: 'ext.loyalty',
    namespace: 'com.ezyupload.shopping.loyalty',
    purpose: 'Earn/burn preview mechanics, account-linked state, member benefit summaries. (Future — not yet spec\'d)',
    enabledFor: [],
    required: false,
    future: true,
  },
  {
    id: 'ext.intent_capture',
    namespace: 'com.ezyupload.shopping.intent_capture',
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
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Architecture Notes
          </h1>
          <p className="mt-2 text-slate-500 text-sm max-w-xl">
            How vendor-scoped extensions layer on top of core UCP to give agents the retail
            semantics they need before checkout.
          </p>
        </div>

        <div className="space-y-8">

          {/* Three-Layer Model */}
          <Panel title="The Three-Layer Model">
            <div className="space-y-3">
              <p className="text-sm text-slate-600 mb-5">
                This project operates in three distinct layers. Each layer has a clear owner and
                a clear contract with the layers above and below it.
              </p>

              <div className="rounded-lg overflow-hidden border border-slate-200 text-sm font-mono">
                {/* Layer 3 */}
                <div className="bg-slate-900 text-white p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Layer 3 · Computed Retail Semantics</div>
                  <div className="font-semibold text-white mb-1">What the agent evaluates and acts on</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['ComputedVisibility', 'ComputedEligibility', 'ComputedPriceState', 'CartValidationResult'].map(t => (
                      <span key={t} className="bg-slate-700 text-slate-200 border border-slate-600 rounded px-2 py-0.5 text-xs">{t}</span>
                    ))}
                  </div>
                  <div className="text-xs text-slate-400 mt-2">→ Derived at request time from context + extension rules. Fully deterministic.</div>
                </div>

                {/* Arrow */}
                <div className="bg-slate-100 border-y border-slate-200 px-4 py-1.5 text-xs text-slate-500 text-center flex items-center justify-center gap-2">
                  <span>evaluates rules declared in</span>
                  <ArrowRight className="w-3 h-3" />
                </div>

                {/* Layer 2 */}
                <div className="bg-slate-50 p-4 border-b border-slate-200">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Layer 2 · Vendor-Scoped Extensions</div>
                  <div className="font-semibold text-slate-800 mb-1">How merchant retail rules are declared</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['ext.pricing_context', 'ext.eligibility', 'ext.bulk_pricing', 'ext.promo_pricing', 'ext.fulfillment_constraints'].map(e => (
                      <span key={e} className="bg-white text-emerald-700 border border-emerald-200 rounded px-2 py-0.5 text-xs font-mono">{e}</span>
                    ))}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">→ Merchant-declared schemas. Attached to variants. Namespaced to prevent conflicts.</div>
                </div>

                {/* Arrow */}
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-1.5 text-xs text-slate-500 text-center flex items-center justify-center gap-2">
                  <span>extends and builds on</span>
                  <ArrowRight className="w-3 h-3" />
                </div>

                {/* Layer 1 */}
                <div className="bg-white p-4">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Layer 1 · Core UCP Protocol</div>
                  <div className="font-semibold text-slate-800 mb-1">Protocol rails: discover, transact, hand off</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['ucp.catalog.discovery', 'ucp.cart.management', 'ucp.checkout.init'].map(c => (
                      <span key={c} className="bg-slate-100 text-slate-700 border border-slate-200 rounded px-2 py-0.5 text-xs font-mono">{c}</span>
                    ))}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">→ Unchanged. This project extends UCP — it does not redefine it.</div>
                </div>
              </div>
            </div>
          </Panel>

          {/* The Agentic Commerce Gap */}
          <Panel title="The Agentic Commerce Gap">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Without this extension layer, AI shopping agents encounter checkout-time failures
                that could have been prevented at catalog time. Each row below shows what happens
                without the extension, and how the extension resolves it.
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
