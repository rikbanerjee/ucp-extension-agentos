'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Clock } from 'lucide-react';

type SpecStatus = 'Draft · RFC' | 'Planned' | 'Planned · next up';

type TierGroupId = 'foundation' | 'tier-0' | 'tier-1' | 'tier-2' | 'tier-3' | 'tier-4';

interface Spec {
  number: string;
  title: string;
  namespace: string;
  status: SpecStatus;
  version: string | null;
  date: string | null;
  href: string | null;
  summary: string;
  group: TierGroupId;
  tierBadge: string;
}

// Mirrors specs/README.md exactly — the catalog is the single source of truth
// for grouping, statuses, and tier assignments. Update both together.
const specs: Spec[] = [
  // Foundation — required at every tier
  {
    number: '0000',
    title: 'Protocol Foundations, Context & Conformance',
    namespace: 'com.os.retailagent.shopping.core',
    status: 'Draft · RFC',
    version: '0.1.0',
    date: 'June 2026',
    href: '/specs/0000-foundations',
    summary: 'The canonical BuyerContext object, conformance tiers (0–4), versioning policy, determinism rule, graceful degradation, and the /.well-known/ucp extension manifest. Everything else depends on this.',
    group: 'foundation',
    tierBadge: 'Foundation',
  },
  {
    number: '0008',
    title: 'Trust, Provenance & Freshness',
    namespace: 'com.os.retailagent.shopping.trust',
    status: 'Draft · RFC',
    version: '1.0.0',
    date: 'June 2026',
    href: '/specs/0008-trust-provenance',
    summary: 'Signed payload envelopes (simulated crypto — seam for real HMAC/ECDSA), per-stage TTL defaults, data-staleness behavior matrix, key rotation, and a threat model mapping four attack vectors to envelope fields. Lets agents and buyers trust that catalog and price data is authentic and current.',
    group: 'foundation',
    tierBadge: 'Foundation',
  },
  {
    number: '0013 pt 1',
    title: 'Decision Trace (three audiences)',
    namespace: 'com.os.retailagent.shopping.trace',
    status: 'Draft · RFC',
    version: '0.1.0',
    date: 'June 2026',
    href: '/specs/0013-intent-capture',
    summary: 'Three-audience rendering of every pipeline decision: developer JSON (stable key-order, round-trip safe), merchant ops table (BLOCK/CONDITION reasons + config hints), buyer card (deny-list enforced). Trace schema v1.0.0.',
    group: 'foundation',
    tierBadge: 'Foundation',
  },
  {
    number: '0015',
    title: 'Privacy, Consent & Identity',
    namespace: 'com.os.retailagent.shopping.identity',
    status: 'Planned',
    version: null,
    date: null,
    href: null,
    summary: 'Buyer context is PII. Consent model, PII minimization, account-linking trust (how a loyalty/member claim is verified), and GDPR/CCPA-aware data-retention signals.',
    group: 'foundation',
    tierBadge: 'Foundation',
  },
  // Tier 0 · Discoverable
  {
    number: '0004',
    title: 'Discovery & Catalog Semantics',
    namespace: 'com.os.retailagent.shopping.discovery',
    status: 'Planned',
    version: null,
    date: null,
    href: null,
    summary: 'Merchant-declared discoverability: keywords, intent tags, substitution/alternates, bundle/kit schemas, and attribute normalization so agents match across merchants.',
    group: 'tier-0',
    tierBadge: 'Tier 0 · Discoverable',
  },
  // Tier 1 · Qualified
  {
    number: '0001',
    title: 'Eligibility & Visibility Semantics',
    namespace: 'com.os.retailagent.shopping.eligibility',
    status: 'Draft · RFC',
    version: '1.1.0',
    date: 'June 2026',
    href: '/specs/0001-eligibility',
    summary: 'Machine-readable way for a merchant to declare who may see a product and who may buy it, and why — evaluated at catalog time with structured reason codes.',
    group: 'tier-1',
    tierBadge: 'Tier 1 · Qualified',
  },
  {
    number: '0005',
    title: 'Inventory & Availability',
    namespace: 'com.os.retailagent.shopping.inventory',
    status: 'Draft · RFC',
    version: '1.0.0',
    date: 'June 2026',
    href: '/specs/0005-inventory',
    summary: 'Real-time stock state (in-stock / low / out / backorder / preorder), per-location quantity, availability TTL, soft reservation semantics, and threshold signaling. Agents never recommend what isn\'t there.',
    group: 'tier-1',
    tierBadge: 'Tier 1 · Qualified',
  },
  {
    number: '0003',
    title: 'Fulfillment Feasibility',
    namespace: 'com.os.retailagent.shopping.fulfillment_constraints',
    status: 'Draft · RFC',
    version: '1.0.0',
    date: 'August 2026',
    href: '/specs/0003-fulfillment',
    summary: 'Deterministic reach: mode, region, hazmat/oversize carrier restrictions, lead-time-vs-need-by, and same-day cutoff — surfaced before cart, not at checkout. Promoted from Tier 4 (2026-08-12): "can this reach this buyer at all" is a dead-end-cart question.',
    group: 'tier-1',
    tierBadge: 'Tier 1 · Qualified',
  },
  {
    number: '0011',
    title: 'Tax & Restricted / Regulated Goods',
    namespace: 'com.os.retailagent.shopping.tax / …restricted',
    status: 'Planned · next up',
    version: null,
    date: null,
    href: null,
    summary: 'Age-restricted goods (alcohol, cannabis, tobacco, pharmacy), regional legality, purchase limits, and tax-treatment signals — surfaced at catalog time so agents never route buyers into a restricted-goods dead end.',
    group: 'tier-1',
    tierBadge: 'Tier 1 · Qualified',
  },
  // Tier 2 · Priced
  {
    number: '0002',
    title: 'Contextual Pricing (Member + Bulk)',
    namespace: 'com.os.retailagent.shopping.member_pricing / …bulk_pricing',
    status: 'Draft · RFC',
    version: '1.0.0',
    date: 'June 2026',
    href: '/specs/0002-contextual-pricing',
    summary: 'Member price, teaser price for unqualified buyers, bulk tier selection, MOQ, quantity increments, purchase limits, and call-for-price — all derived from buyer context at catalog time. Ships the forward-compatible AppliedOffer shape that RAOS-0006 and RAOS-0007 bind.',
    group: 'tier-2',
    tierBadge: 'Tier 2 · Priced',
  },
  {
    number: '0007',
    title: 'Quote Integrity & Price Lock',
    namespace: 'com.os.retailagent.shopping.quote',
    status: 'Draft · RFC',
    version: '1.0.0',
    date: 'June 2026',
    href: '/specs/0007-quote-integrity',
    summary: 'Signed, TTL\'d price commitments binding variant + quantity + buyer-context hash + resolved price. Five-step checkout validation (signature → TTL/grace → context hash → stock → price recomputation) with merchant-declared HonorPolicy. Guarantees the price the agent showed is the price charged — the retailer-trust unlock.',
    group: 'tier-2',
    tierBadge: 'Tier 2 · Priced',
  },
  {
    number: '0006',
    title: 'Promotional Pricing & Stacking',
    namespace: 'com.os.retailagent.shopping.promo_pricing',
    status: 'Planned · next up',
    version: null,
    date: null,
    href: null,
    summary: 'Sale/markdown, BOGO, mix-and-match, coupons, and a deterministic stacking model (stackable/exclusive flags + priority ladder) with reason codes for every applied or suppressed offer.',
    group: 'tier-2',
    tierBadge: 'Tier 2 · Priced',
  },
  // Tier 3 · Member-aware
  {
    number: '0009',
    title: 'Loyalty & Rewards',
    namespace: 'com.os.retailagent.shopping.loyalty',
    status: 'Planned',
    version: null,
    date: null,
    href: null,
    summary: 'Browse-time earn preview per line item, burn/redeem eligibility, member benefit summaries, tier-progress signals, and account-linked state — so agents can surface loyalty value before checkout, not after. Owns the buyer loyalty tier (gold/silver/guest) as a BuyerContext claim — orthogonal to a merchant\'s conformance tier.',
    group: 'tier-3',
    tierBadge: 'Tier 3 · Member-aware',
  },
  {
    number: '0010',
    title: 'Subscriptions & Recurring',
    namespace: 'com.os.retailagent.shopping.subscription',
    status: 'Planned',
    version: null,
    date: null,
    href: null,
    summary: 'Subscribe-and-save pricing, first-order discount, cadence semantics, skip/pause/cancel, and recurring eligibility. Essential for grocery and DTC agent shopping.',
    group: 'tier-3',
    tierBadge: 'Tier 3 · Member-aware',
  },
  // Tier 4 · Assisted
  {
    number: '0012',
    title: 'Cart Bridge & Checkout Handoff',
    namespace: 'com.os.retailagent.shopping.cart_bridge',
    status: 'Planned',
    version: null,
    date: null,
    href: null,
    summary: 'Serialize the agent-built cart and hand off to real checkout with all quote tokens intact. Idempotent, quote-expiry-aware, and handles partial-cart scenarios.',
    group: 'tier-4',
    tierBadge: 'Tier 4 · Assisted',
  },
  {
    number: '0013 pt 2',
    title: 'Intent Capture & Assisted Commerce',
    namespace: 'com.os.retailagent.shopping.intent_capture',
    status: 'Planned',
    version: null,
    date: null,
    href: null,
    summary: 'Intent capture routing (notify-me, B2B quote request) for items that can\'t resolve to an immediate price or cart line. Builds on the Decision Trace substrate shipped in Foundation (0013 pt 1).',
    group: 'tier-4',
    tierBadge: 'Tier 4 · Assisted',
  },
  {
    number: '0014',
    title: 'Returns & Post-Purchase Policy',
    namespace: 'com.os.retailagent.shopping.returns',
    status: 'Planned',
    version: null,
    date: null,
    href: null,
    summary: 'Return window, final-sale flags, restocking fees, who pays return shipping, warranty terms — machine-readable at catalog time so agents communicate policy before the buyer commits.',
    group: 'tier-4',
    tierBadge: 'Tier 4 · Assisted',
  },
];

const groups: { id: TierGroupId; label: string; description: string }[] = [
  { id: 'foundation', label: 'Foundation', description: 'Required at every tier — the spine everything else depends on.' },
  { id: 'tier-0', label: 'Tier 0 · Discoverable', description: 'An agent can find and correctly read my catalog.' },
  { id: 'tier-1', label: 'Tier 1 · Qualified', description: 'No dead-end carts.' },
  { id: 'tier-2', label: 'Tier 2 · Priced', description: 'The right price per buyer, honored at checkout.' },
  { id: 'tier-3', label: 'Tier 3 · Member-aware', description: 'Supports member/loyalty-aware pricing and earn preview.' },
  { id: 'tier-4', label: 'Tier 4 · Assisted', description: 'Full commerce: handoff, intent, returns.' },
];

const statusStyles: Record<string, string> = {
  'Draft · RFC': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Planned': 'bg-slate-50 text-slate-500 border border-slate-200',
  'Planned · next up': 'bg-sky-50 text-sky-700 border border-sky-200',
};

export default function SpecsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">

        {/* Header */}
        <div className="mb-12">
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">
            Open Specs
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">
            RetailAgentOS Spec Series
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
            UCP gives commerce the rails — discovery, catalog, cart, checkout handoff. These specs move a merchant&apos;s <em>reasoning</em> (who may see this, who may buy it, at what price, with what fulfillment) <strong>from checkout-time to catalog-time, with machine-readable reasons attached</strong> — so AI shopping agents can act correctly and explain themselves.
          </p>
          <p className="mt-4 text-base text-slate-500 max-w-2xl">
            Every spec is backed by a runnable reference implementation in the{' '}
            <Link href="/demo" className="text-emerald-600 hover:underline">Playground</Link>.
            If the Playground runs it, the spec is real. Want the reference architecture instead of
            the raw RFCs? Start at{' '}
            <Link href="/adopt" className="text-emerald-600 hover:underline">/adopt</Link>.
          </p>
        </div>

        {/* The leverage framing */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-12">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Why specs first</p>
          <p className="text-slate-700 leading-relaxed">
            A small retailer can&apos;t build a bespoke AI-commerce integration. But if the semantics exist as an open spec, the platform they already use can implement it once — and every merchant on that platform inherits agent-readiness for free. <strong>The spec is the leverage.</strong> The goal is to prove patterns on real merchant archetypes and propose the durable ones upstream into UCP.
          </p>
        </div>

        {/* Conformance tier summary */}
        <div className="mb-12">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Conformance tiers</p>
          <p className="text-sm text-slate-600 max-w-2xl mb-4 leading-relaxed">
            A conformance tier describes a <strong>merchant&apos;s implementation maturity</strong> — what their catalog can do for an agent. It is <em>separate</em> from a <strong>buyer&apos;s loyalty tier</strong> (gold / silver / guest), which travels as a buyer-context claim (RAOS-0009). Tier 3 <strong>Member-aware</strong> means the merchant <em>supports</em> member-aware pricing and earn preview — not that the shopper is a member. A guest can shop a Member-aware merchant.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Promise to the agent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Example retailer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { tier: '0', name: 'Discoverable', promise: 'An agent can find and correctly read my catalog.', example: 'Any store' },
                  { tier: '1', name: 'Qualified', promise: 'No dead-end carts — only eligible, in-stock items surface.', example: 'Boutique' },
                  { tier: '2', name: 'Priced', promise: 'The right price per buyer, honored at checkout.', example: 'Wholesale' },
                  { tier: '3', name: 'Member-aware', promise: 'Supports member-aware pricing, earn preview, and subscriptions.', example: 'Grocery' },
                  { tier: '4', name: 'Assisted', promise: 'Full commerce — fulfillment, handoff, intent, returns.', example: 'Grocery chain' },
                ].map((row) => (
                  <tr key={row.tier} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-400">{row.tier}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900 text-sm">{row.name}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{row.promise}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden sm:table-cell">{row.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Spec list — grouped by conformance tier (mirrors specs/README.md) */}
        {groups.map((group) => {
          const groupSpecs = specs.filter((s) => s.group === group.id);
          return (
            <div key={group.id} className="mb-10">
              <div className="mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{group.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{group.description}</p>
              </div>
              <div className="space-y-3">
                {groupSpecs.map((spec) => (
                  <div
                    key={spec.number}
                    className={`rounded-xl border ${spec.href ? 'border-slate-200 hover:border-emerald-200 hover:shadow-sm transition-all' : 'border-slate-100'} bg-white overflow-hidden`}
                  >
                    {spec.href ? (
                      <Link href={spec.href} className="block p-5">
                        <SpecCard spec={spec} />
                      </Link>
                    ) : (
                      <div className="block p-5 opacity-60">
                        <SpecCard spec={spec} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Contribute */}
        <div className="mt-16 border-t border-slate-100 pt-10">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">How to contribute</p>
          <p className="text-slate-600 leading-relaxed mb-4">
            These drafts exist to be argued with. Each spec ends with an open questions section — genuine design forks, not rhetorical ones. If you run a real catalog, build on a commerce platform, or work on agents, your disagreement is the most valuable input there is.
          </p>
          <a
            href="mailto:rikbanerjee007@gmail.com"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            rikbanerjee007@gmail.com
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

function SpecCard({ spec }: { spec: Spec }) {
  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0 mt-0.5">
        {spec.href ? (
          <FileText size={18} className="text-emerald-500" />
        ) : (
          <Clock size={18} className="text-slate-300" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-mono font-semibold text-slate-400">RAOS-{spec.number}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyles[spec.status]}`}>
            {spec.status}
          </span>
          <span className="text-xs text-slate-400 border border-slate-100 rounded px-1.5 py-0.5">{spec.tierBadge}</span>
          {spec.version && (
            <span className="text-xs text-slate-400">v{spec.version}</span>
          )}
          {spec.date && (
            <span className="text-xs text-slate-400">{spec.date}</span>
          )}
        </div>
        <h2 className="text-sm font-bold text-slate-900 mb-1">{spec.title}</h2>
        <p className="text-sm text-slate-500 mb-2 leading-relaxed">{spec.summary}</p>
        <p className="text-xs font-mono text-slate-400 truncate">{spec.namespace}</p>
      </div>
      {spec.href && (
        <ArrowRight size={16} className="shrink-0 mt-1 text-slate-300" />
      )}
    </div>
  );
}
