'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, AlertCircle, Mail, Tag, TrendingDown } from 'lucide-react';
import { useView } from '@/lib/context/ViewContext';
import { ViewToggle } from '@/components/ui/ViewToggle';

const reasonCodes = [
  {
    code: 'MEMBER_PRICE_APPLIED',
    namespace: '…member_pricing',
    meaning: 'Member pricing applied to this buyer.',
    severity: 'INFO',
    resolvable: false,
    resolution: null,
  },
  {
    code: 'TEASER_LOCKED',
    namespace: '…member_pricing',
    meaning: 'Guest or unqualified buyer sees a teaser price but cannot add to cart. Addability is blocked by RAOS-0001 eligibility.',
    severity: 'CONDITION',
    resolvable: true,
    resolution: 'Upgrade membership tier',
  },
  {
    code: 'BULK_TIER_APPLIED',
    namespace: '…bulk_pricing',
    meaning: 'A volume pricing tier was matched and applied.',
    severity: 'INFO',
    resolvable: false,
    resolution: null,
  },
  {
    code: 'BELOW_MOQ',
    namespace: '…bulk_pricing',
    meaning: 'Quantity is below the minimum order quantity. Cannot proceed.',
    severity: 'BLOCK',
    resolvable: true,
    resolution: 'Increase quantity to MOQ',
  },
  {
    code: 'QUANTITY_INCREMENT_MISMATCH',
    namespace: '…bulk_pricing',
    meaning: 'Quantity is not a multiple of the required increment.',
    severity: 'BLOCK',
    resolvable: true,
    resolution: 'Adjust quantity to a valid increment',
  },
  {
    code: 'PURCHASE_LIMIT_EXCEEDED',
    namespace: '…member_pricing / …bulk_pricing',
    meaning: 'Quantity exceeds the per-order purchase limit for this pricing configuration.',
    severity: 'BLOCK',
    resolvable: true,
    resolution: 'Reduce quantity to within the limit',
  },
  {
    code: 'CALL_FOR_PRICE',
    namespace: '…member_pricing',
    meaning: 'Price is not published — must be requested via the merchant. Distinct from a zero ($0) price.',
    severity: 'CONDITION',
    resolvable: true,
    resolution: 'Submit intent capture (RAOS-0013 forward-ref)',
  },
];

const severityStyles: Record<string, string> = {
  INFO: 'bg-sky-50 text-sky-700 border border-sky-200',
  CONDITION: 'bg-amber-50 text-amber-700 border border-amber-200',
  BLOCK: 'bg-orange-50 text-orange-700 border border-orange-200',
};

const openQuestions = [
  {
    number: 1,
    question: 'Member price higher than bulk tier: last-wins or best-for-buyer?',
    resolved: false,
    resolvedDate: null,
    body: 'When a gold member\'s member price ($58) is lower than the applicable bulk tier ($60), bulk still wins today because it runs second (last-wins). Should bulk override member when its price is worse for the buyer?',
    proposed: 'Option C: defer to the RAOS-0006 stacking ladder, where member and bulk become named ladder entries with merchant-declared priorities. Until then, last-wins is documented behavior with the suppressed offer visible in the payload.',
  },
  {
    number: 2,
    question: '`callForPrice` and eligibility interaction',
    resolved: false,
    resolvedDate: null,
    body: 'When callForPrice is true, the pricing stage emits CALL_FOR_PRICE (CONDITION). Should eligibility (RAOS-0001) also signal call-for-price, or is it strictly the pricing stage\'s concern?',
    proposed: 'Currently pricing-only. Open for comment.',
  },
  {
    number: 3,
    question: '`purchaseLimit` scope: per-order vs per-customer',
    resolved: false,
    resolvedDate: null,
    body: 'This spec defines purchaseLimit as a per-order (cart) limit, not a cumulative per-customer limit across multiple orders. Should it be renamed perOrderLimit to avoid confusion with RAOS-0011\'s per-customer limits?',
    proposed: 'Renaming to `perOrderLimit` would be more precise but is a breaking change to the config shape. Open for comment — currently kept as `purchaseLimit` with the scope documented explicitly.',
  },
];

const priceStateSchema = `{
  "unitPrice": 28.00,
  "currency": "USD",
  "priceSource": "member",
  "appliedOffers": [
    {
      "offerId": "v_b_005_1:member",
      "type": "member",
      "namespace": "com.os.retailagent.shopping.member_pricing",
      "priority": 10,
      "stackable": false,
      "exclusive": false,
      "unitPriceAfter": 28.00,
      "description": "Member price (gold+)"
    }
  ],
  "suppressedOffers": [],
  "teaser": null,
  // @deprecated — derived from appliedOffers:
  "appliedOfferState": "Member price (gold+)",
  "isMemberPrice": true
}`;

const bulkPricingSchema = `{
  "bulkPricing": {
    "available": true,
    "moq": 10,
    "quantityIncrement": 5,
    "purchaseLimit": 500,          // optional per-order limit
    "tiers": [
      { "minQuantity": 10, "maxQuantity": 49, "price": 380.00 },
      { "minQuantity": 50, "maxQuantity": 99, "price": 350.00 },
      { "minQuantity": 100, "price": 310.00 }
    ]
  }
}`;

const memberPricingSchema = `{
  "memberPricing": {
    "available": true,
    "memberPrice": 28.00,
    "teaserPrice": 28.00,        // display-only for unqualified buyers
    "requiredTier": "gold",      // 'none' | 'gold' | 'reseller_plus' | 'distributor'
    "purchaseLimit": 2           // optional per-order limit
  },
  "callForPrice": true           // price unknown — must be requested (RAOS-0013)
}`;

const suppressedOfferSchema = `// When bulk tier overrides member price (last-wins)
{
  "appliedOffers": [
    { "offerId": "v_w_005_1:bulk_tier:10", "type": "bulk_tier", "unitPriceAfter": 60.00, ... }
  ],
  "suppressedOffers": [
    {
      "offerId": "v_w_005_1:member",
      "type": "member",
      "suppressedBy": "v_w_005_1:bulk_tier:10",
      "reason": "SUPERSEDED_BY_BULK_TIER"
    }
  ]
}`;

export default function Spec0002Page() {
  const { view } = useView();
  const isTechnical = view === 'technical';

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* Breadcrumb */}
        <Link href="/specs" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-8">
          <ArrowLeft size={14} />
          All Specs
        </Link>

        {/* Spec header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-mono font-semibold text-slate-400">RAOS-0002</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Draft · RFC
            </span>
            <span className="text-xs text-slate-400">v1.0.0</span>
            <span className="text-xs text-slate-400">June 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            Contextual Pricing (Member + Bulk)
          </h1>
          <p className="text-sm font-mono text-emerald-700 mb-1">
            com.os.retailagent.shopping.member_pricing
          </p>
          <p className="text-sm font-mono text-emerald-700 mb-4">
            com.os.retailagent.shopping.bulk_pricing
          </p>
          <p className="text-sm text-slate-500">
            Plane 3 · Price &amp; Value · Tier 2 · Priced ·{' '}
            <Link href="/demo" className="text-emerald-600 hover:underline">Reference implementation in Playground</Link>
          </p>

          {/* RFC callout */}
          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            This is an open draft. The point is to be argued with. The member-vs-bulk precedence
            question (§9.1) is a genuine fork with real implications for grocery + wholesale.{' '}
            <a href="#open-questions" className="underline font-medium">See the open questions →</a>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex justify-end mb-10">
          <ViewToggle />
        </div>

        {/* Abstract */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Abstract</h2>
          <p className="text-slate-700 leading-relaxed">
            This spec defines how a merchant declares <strong>contextual pricing</strong> — prices that vary by buyer identity and order quantity — and how an agent computes the applicable price at catalog time, before a cart is built. It produces a <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">ComputedPriceState</code> contract: a single unit price with full provenance.
          </p>
          <p className="mt-3 text-slate-700 leading-relaxed">
            The defining feature is <strong>offer transparency</strong>. Every applied discount carries a structured <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">AppliedOffer</code> record; every evaluated-but-superseded discount appears in <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">suppressedOffers[]</code> with the reason it lost. An agent can explain why the price is $X, not just state it.
          </p>
          {isTechnical && (
            <p className="mt-3 text-slate-700 leading-relaxed text-sm">
              The <code className="font-mono text-xs">AppliedOffer</code> shape is the load-bearing forward contract that RAOS-0006 (stacking ladder) and RAOS-0007 (quote token) will bind. Priority, stackable, and exclusive fields ship here — populated with stub values — so those specs are additive evolutions, not breaking changes.
            </p>
          )}
        </section>

        {/* The gap */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '2. Motivation — the gap this closes' : 'The problem this solves'}
          </h2>
          <ul className="space-y-2 mt-2">
            {[
              'A gold member is quoted the public price because the agent doesn\'t know member prices exist.',
              'A wholesale buyer orders below MOQ and hits a wall at checkout with no explanation.',
              'A guest sees an item they can\'t add but gets no teaser showing the member price or how to qualify.',
              'An agent quotes a price without knowing which offers were applied — the RAOS-0007 quote token can\'t bind what it can\'t see.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-slate-700">
                <XCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Inputs */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '4. Inputs' : 'What goes in'}
          </h2>
          {isTechnical ? (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.1 Variant pricing config (merchant-declared)</p>
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{memberPricingSchema}</pre>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.2 Bulk pricing config</p>
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{bulkPricingSchema}</pre>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.3 BuyerContext (RAOS-0000 §4)</p>
                <p className="text-xs text-slate-500">
                  This spec reads <code className="font-mono">customerType</code> and <code className="font-mono">membershipTier</code> from the shared <code className="font-mono">BuyerContext</code>. The pipeline normalizes context at the boundary per RAOS-0000 §4.3.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">Merchant declares on the variant</p>
                <p className="text-sm text-slate-600">Member price, teaser, bulk tiers, MOQ, quantity increments, purchase limits.</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">Agent supplies buyer context</p>
                <p className="text-sm text-slate-600">Customer type and membership tier determine which price the buyer qualifies for.</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">Agent supplies quantity</p>
                <p className="text-sm text-slate-600">Cart-line quantity determines which bulk tier applies and whether MOQ/increments are met.</p>
              </div>
            </div>
          )}
        </section>

        {/* Output */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '5. Outputs' : 'What comes out'}
          </h2>
          {isTechnical ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-mono font-semibold text-emerald-700 mb-2">ComputedPriceState v2</p>
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{priceStateSchema}</pre>
                <p className="text-xs text-slate-500 mt-2">
                  Deprecated fields (<code className="font-mono">appliedOfferState</code>, <code className="font-mono">isMemberPrice</code>, <code className="font-mono">appliedTier</code>) are derived from <code className="font-mono">appliedOffers</code> for one minor version per RAOS-0000 §7.4. Use <code className="font-mono">appliedOffers</code> for new code.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-mono font-semibold text-emerald-700 mb-2">SuppressedOffer (last-wins example)</p>
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{suppressedOfferSchema}</pre>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={14} className="text-emerald-500" />
                  <p className="text-sm font-semibold text-slate-800">Applied offers</p>
                </div>
                <p className="text-sm text-slate-600">Which discounts applied, and what each one did to the price. RAOS-0007 quote tokens bind this array.</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown size={14} className="text-slate-400" />
                  <p className="text-sm font-semibold text-slate-800">Suppressed offers</p>
                </div>
                <p className="text-sm text-slate-600">Discounts that were evaluated but didn&apos;t win — with the reason why. An agent can show buyers exactly why their expected discount didn&apos;t apply.</p>
              </div>
            </div>
          )}
        </section>

        {/* Reason code registry */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {isTechnical ? '6. Reason code registry' : 'Reason code registry'}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Every pricing decision is machine-readable. Two namespaces, seven codes.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Meaning</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
                  {isTechnical && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Namespace</th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolvable?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reasonCodes.map((rc) => (
                  <tr key={rc.code} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {rc.code}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{rc.meaning}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${severityStyles[rc.severity]}`}>
                        {rc.severity}
                      </span>
                    </td>
                    {isTechnical && (
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-slate-500">{rc.namespace}</code>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {rc.resolvable ? (
                        <div className="flex items-start gap-1.5">
                          <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                          <span className="text-xs text-slate-600">{rc.resolution}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <XCircle size={14} className="text-slate-300" />
                          <span className="text-xs text-slate-400">Advisory</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isTechnical && (
            <p className="text-xs text-slate-400 mt-2">
              BELOW_MOQ and QUANTITY_INCREMENT_MISMATCH were previously surfaced as UI message strings in cartValidation.ts. As of v1.0.0 they are lifted to ReasonEntry codes; the UI messages are derived from the reason entry&apos;s message field for backward compat.
            </p>
          )}
        </section>

        {/* Algorithm */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '7. Evaluation algorithm' : 'How the price is computed'}
          </h2>
          {isTechnical ? (
            <>
              <p className="text-sm text-slate-600 mb-4">Deterministic. Same (variant, quantity, context) → same result. No model in the loop.</p>
              <ol className="space-y-3">
                {[
                  'Reject quantity ≤ 0: emit BELOW_MOQ (BLOCK), return unitPrice=0.',
                  'If callForPrice === true: emit CALL_FOR_PRICE (CONDITION), return unitPrice=0. basePrice=0 does NOT trigger this.',
                  'Start with unitPrice = roundHalfUp(basePrice), priceSource = \'base\'.',
                  'Member pricing (priority 10): if buyer qualifies (non-guest, tier ≥ requiredTier), apply memberPrice. Emit MEMBER_PRICE_APPLIED. Check purchaseLimit. Else if teaserPrice set: emit TEASER_LOCKED (does not change unitPrice).',
                  'Bulk pricing (priority 20): validate MOQ → BELOW_MOQ; validate increment → QUANTITY_INCREMENT_MISMATCH; validate purchaseLimit → PURCHASE_LIMIT_EXCEEDED. Find highest applicable tier (quantity >= minQuantity, inclusive). If found: suppress prior AppliedOffer, apply tier price, emit BULK_TIER_APPLIED.',
                  'Promo pricing (priority 30, back-compat): if salePrice or promo tiers apply, suppress prior offer, apply promo price. RAOS-0006 takes over this phase.',
                  'All prices rounded via roundHalfUp: Math.round((price + Number.EPSILON) * 100) / 100 (half-up, IEEE-754-safe).',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="text-slate-700 leading-relaxed text-sm">
              Start with the base price. Apply member pricing first (priority 10), then bulk tier pricing (priority 20) — bulk overrides member when the quantity threshold is met. Promo pricing (priority 30) overrides all. Each override records the previous price as a suppressed offer so agents can always explain the price history.
            </p>
          )}
        </section>

        {/* Worked examples */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            {isTechnical ? '8. Worked examples' : 'Real merchant scenarios'}
          </h2>
          <div className="space-y-6">

            {/* Boutique: teaser */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-800">Sara&apos;s Boutique — member teaser (DTC)</p>
                {isTechnical && <p className="text-xs font-mono text-slate-500 mt-0.5">Exclusive Member Tote · basePrice: $42 · memberPrice: $28 · requiredTier: gold</p>}
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { buyer: 'Guest', price: '$42.00', source: 'base', outcome: 'TEASER_LOCKED (CONDITION) — shows $28 teaser, cannot add', type: 'conditional' },
                  { buyer: 'Member tier: gold', price: '$28.00', source: 'member', outcome: 'MEMBER_PRICE_APPLIED (INFO) — proceeds', type: 'eligible' },
                  { buyer: 'Member tier: none', price: '$42.00', source: 'base', outcome: 'TEASER_LOCKED — tier not met', type: 'conditional' },
                ].map((row) => (
                  <div key={row.buyer} className="px-4 py-3 flex items-start gap-3">
                    <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${row.type === 'eligible' ? 'bg-emerald-400' : row.type === 'conditional' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{row.buyer}</p>
                      {isTechnical && <p className="text-xs font-mono text-slate-500">{row.price} · {row.source}</p>}
                      <p className="text-xs text-slate-500 italic mt-0.5">{row.outcome}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Wholesale: MOQ + tiers */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-800">Atlas Wholesale — MOQ + tier boundary (B2B)</p>
                {isTechnical && <p className="text-xs font-mono text-slate-500 mt-0.5">Coffee Beans · MOQ=10 · increment=5 · tiers: 10→$380, 50→$350, 100→$310</p>}
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { qty: 'qty 5', price: '$400.00', outcome: 'BELOW_MOQ (BLOCK, min=10)', type: 'blocked' },
                  { qty: 'qty 7', price: '$400.00', outcome: 'BELOW_MOQ + QUANTITY_INCREMENT_MISMATCH (both BLOCK)', type: 'blocked' },
                  { qty: 'qty 10 (exact MOQ)', price: '$380.00', outcome: 'BULK_TIER_APPLIED — tier boundary exactly met (>=)', type: 'eligible' },
                  { qty: 'qty 50 (next boundary)', price: '$350.00', outcome: 'BULK_TIER_APPLIED — higher tier', type: 'eligible' },
                  { qty: 'qty 100', price: '$310.00', outcome: 'BULK_TIER_APPLIED — max volume tier', type: 'eligible' },
                ].map((row) => (
                  <div key={row.qty} className="px-4 py-3 flex items-start gap-3">
                    <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${row.type === 'eligible' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{row.qty}</p>
                      {isTechnical && <p className="text-xs font-mono text-slate-500">{row.price}</p>}
                      <p className="text-xs text-slate-500 italic mt-0.5">{row.outcome}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Grocery: member price + rounding */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-800">Fresh Corner Market — member price + rounding (Grocery)</p>
                {isTechnical && <p className="text-xs font-mono text-slate-500 mt-0.5">Organic Milk · basePrice: $4.99 · memberPrice: $3.995 · requiredTier: gold</p>}
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { buyer: 'Guest', price: '$4.99', outcome: 'Base price — no rounding needed', type: 'eligible' },
                  { buyer: 'Member / gold', price: '$4.00', outcome: 'MEMBER_PRICE_APPLIED — $3.995 rounds to $4.00 (half-up)', type: 'eligible' },
                ].map((row) => (
                  <div key={row.buyer} className="px-4 py-3 flex items-start gap-3">
                    <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-2 bg-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{row.buyer}</p>
                      {isTechnical && <p className="text-xs font-mono text-slate-500">{row.price}</p>}
                      <p className="text-xs text-slate-500 italic mt-0.5">{row.outcome}</p>
                    </div>
                  </div>
                ))}
              </div>
              {isTechnical && (
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    Rounding: <code className="font-mono">Math.round((3.995 + Number.EPSILON) * 100) / 100 = 4.00</code>. The IEEE-754-safe formula avoids the <code className="font-mono">1.005 * 100 = 100.4999...</code> binary representation trap.
                  </p>
                </div>
              )}
            </div>

            {/* Free sample vs call-for-price */}
            {isTechnical && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-800">Free sample vs call-for-price (Boutique)</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { item: 'Welcome Sample Card', desc: 'basePrice: 0, callForPrice: undefined', outcome: 'unitPrice: 0, priceSource: base, no reason codes. Agent displays "$0.00". Valid free price.', type: 'eligible' },
                    { item: 'Bespoke Commission Print', desc: 'callForPrice: true, basePrice: 0', outcome: 'CALL_FOR_PRICE (CONDITION). Agent displays "Price on request" — NOT "$0". Routes to intent capture (RAOS-0013).', type: 'conditional' },
                  ].map((row) => (
                    <div key={row.item} className="px-4 py-3 flex items-start gap-3">
                      <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${row.type === 'eligible' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{row.item}</p>
                        <p className="text-xs font-mono text-slate-500">{row.desc}</p>
                        <p className="text-xs text-slate-500 italic mt-0.5">{row.outcome}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4">
            <Link href="/demo" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
              Try these scenarios in the Playground
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Open questions */}
        <section id="open-questions" className="mb-12 scroll-mt-8">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {isTechnical ? '9. Open questions — Request for Comment' : 'Open questions'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">These are genuine forks. Tell me I&apos;m wrong.</p>

          <div className="space-y-4">
            {openQuestions.map((q) => (
              <div key={q.number} className={`rounded-xl border p-5 ${q.resolved ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start gap-3">
                  {q.resolved
                    ? <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-500" />
                    : <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                  }
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-1">
                      <span className="text-slate-400 mr-1.5">#{q.number}</span>
                      {q.question}
                      {q.resolved && (
                        <span className="ml-2 text-xs font-normal text-emerald-600">
                          RESOLVED {q.resolvedDate}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-600 mb-2">{q.body}</p>
                    {q.proposed && (
                      <p className={`text-sm italic ${q.resolved ? 'text-emerald-700' : 'text-slate-500'}`}>{q.proposed}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl bg-slate-50 border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-700 mb-1">Have a view on any of these?</p>
            <p className="text-sm text-slate-600 mb-3">
              The member-vs-bulk precedence question (§9.1) matters most if you run a wholesale
              or grocery operation. Email me or reply on the build-log post.
            </p>
            <a
              href="mailto:rikbanerjee007@gmail.com"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <Mail size={14} />
              rikbanerjee007@gmail.com
            </a>
          </div>
        </section>

        {/* Why this spec */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '10. Why this spec now' : 'Why start here'}
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm">
            Pricing is the most visible merchant-reasoning gap after eligibility. An agent that
            can&apos;t explain &ldquo;why $X&rdquo; is not useful for wholesale buyers negotiating or loyalty
            members expecting their discount. More importantly, RAOS-0007 (Quote Integrity)
            requires a stable <code className="font-mono text-xs">AppliedOffer</code> shape to bind in the quote token — shipping
            that shape here, before 0007, ensures those specs are additive evolutions rather than
            breaking changes.
          </p>
        </section>

        {/* Footer nav */}
        <div className="border-t border-slate-100 pt-8 flex items-center justify-between">
          <Link href="/specs/0001-eligibility" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
            <ArrowLeft size={14} />
            0001 · Eligibility
          </Link>
          <Link href="/demo" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            Try it in the Playground
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
