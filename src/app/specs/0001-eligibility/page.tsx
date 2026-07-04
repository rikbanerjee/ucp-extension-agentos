'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, AlertCircle, Mail } from 'lucide-react';
import { useView } from '@/lib/context/ViewContext';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { TierBadge } from '../TierBadge';

const reasonCodes = [
  {
    code: 'HIDDEN_PRODUCT',
    meaning: 'Item is not visible in this context (guest visibility gate)',
    severity: 'BLOCK',
    source: '…eligibility',
    defaultStatus: 'BLOCKED',
    blockingDeprecated: true,
    resolvable: false,
    resolution: null,
  },
  {
    code: 'REGION_RESTRICTED',
    meaning: 'Not available in the buyer\'s market region',
    severity: 'BLOCK',
    source: '…eligibility',
    defaultStatus: 'BLOCKED',
    blockingDeprecated: true,
    resolvable: false,
    resolution: null,
  },
  {
    code: 'WHOLESALE_ONLY',
    meaning: 'Requires a wholesale or B2B account',
    severity: 'BLOCK',
    source: '…eligibility',
    defaultStatus: 'BLOCKED',
    blockingDeprecated: true,
    resolvable: true,
    resolution: 'Become a wholesale account',
  },
  {
    code: 'RESALE_CERTIFICATE_REQUIRED',
    meaning: 'Resale certificate must be on file',
    severity: 'BLOCK',
    source: '…eligibility',
    defaultStatus: 'BLOCKED',
    blockingDeprecated: true,
    resolvable: true,
    resolution: 'Upload a resale certificate',
  },
  {
    code: 'TIER_RESTRICTION',
    meaning: 'Requires a higher membership tier (BLOCK + requirements[] → status: CONDITIONAL)',
    severity: 'BLOCK',
    source: '…eligibility',
    defaultStatus: 'CONDITIONAL',
    blockingDeprecated: true,
    resolvable: true,
    resolution: 'Upgrade membership tier',
  },
  {
    code: 'FULFILLMENT_UNAVAILABLE',
    meaning: 'Not available for the requested fulfillment mode',
    severity: 'BLOCK',
    source: '…eligibility',
    defaultStatus: 'BLOCKED',
    blockingDeprecated: true,
    resolvable: false,
    resolution: null,
  },
];

const openQuestions = [
  {
    number: 1,
    question: '`blocking` vs. status coherence',
    resolved: true,
    resolvedDate: '2026-06-10',
    body: 'The reference implementation emitted `TIER_RESTRICTION` with `blocking: true` while resolving status to `CONDITIONAL`. Incoherent: if a reason is resolvable (upgrade tier), is it really "blocking"?',
    proposed: 'RESOLVED: `blocking` is now a derived boolean (`severity !== \'INFO\'`), not an authored field. Status is derived from severity + requirements[]: BLOCK + requirements[] → CONDITIONAL; BLOCK + no requirements[] → BLOCKED. The `blocking` field is deprecated (supersededBy: severity, RAOS-0000 §7.4).',
  },
  {
    number: 2,
    question: 'Is `CONDITIONAL` worth keeping as a distinct status?',
    resolved: true,
    resolvedDate: '2026-06-10',
    body: 'Or should agents just read `BLOCKED` + the presence of `requirements[]`? Three states is more expressive; two is simpler to implement.',
    proposed: 'RESOLVED: Three states are kept (ELIGIBLE | CONDITIONAL | BLOCKED). CONDITIONAL signals an actionable resolution path the agent can surface; BLOCKED means stop with no path. Collapsing to two states would push the distinction into the agent\'s requirements[] inspection — three states is more expressive and the derivation is deterministic.',
  },
  {
    number: 3,
    question: '`REGION_RESTRICTED` placement',
    resolved: false,
    resolvedDate: null,
    body: 'Region restriction surfaces as a visibility `HIDDEN` result (the item disappears) and as the eligibility reason code `REGION_RESTRICTED` (so agents can explain it). Is a region-restricted item correctly `HIDDEN`, or should it be `VISIBLE` with `BLOCKED` eligibility?',
    proposed: 'Hidden means the agent never surfaces it; blocked means the agent sees it but can\'t transact. Which is more useful for agent behavior? Open for comment.',
  },
  {
    number: 4,
    question: 'Unknown-context defaulting for transaction-gating stages',
    resolved: true,
    resolvedDate: '2026-06-10',
    body: 'Spec says "default to most restrictive." Is that right for discovery (you\'d under-surface), or should visibility default open and eligibility default strict?',
    proposed: 'RESOLVED for transaction-gating stages (Eligibility, Price, Quote): default to most-restrictive per RAOS-0000 §7.2. Asserted privilege claims are downgraded. The discovery-side default (visibility) remains open — comment welcome.',
  },
  {
    number: 5,
    question: 'Tier hierarchy',
    resolved: false,
    resolvedDate: null,
    body: 'Currently an ordered list (`none < gold < reseller_plus < distributor`). Should tiers be a partial order / capability set instead of a strict ladder?',
    proposed: null,
  },
];

const eligibilityRulesSchema = `{
  "eligibilityRules": {
    "hideFromGuests": true,           // hide entirely from guest buyers
    "requireWholesale": true,         // requires wholesale/B2B account
    "requiredTier": "reseller_plus",  // minimum membership tier
    "requireResaleCertificate": true  // resale cert must be on file
  }
}`;

const buyerContextSchema = `// BuyerContext — defined in RAOS-0000 §4, shared by all extensions.
// RAOS-0001 reads: customerType, membershipTier, marketRegion,
// fulfillmentMode, resaleCertificateOnFile, trust.mode.
{
  "customerType": "guest | member | wholesale | b2b",
  "loyaltyTier": "guest | silver | gold",      // RAOS-0009 (not read by this spec)
  "membershipTier": "none | gold | reseller_plus | distributor",
  "marketRegion": "US | CA | NY | HI | ...",
  "fulfillmentMode": "shipping | pickup | local_delivery",
  "accountLinked": false,
  "taxExempt": false,
  "resaleCertificateOnFile": false,
  "trust": {
    "mode": "asserted | signed",               // asserted downgrades privilege claims
    "issuer": "https://id.example.test",       // present when signed
    "keyId": "k1",
    "signature": "base64…"
  }
}`;

const visibilityOutputSchema = `{
  "status": "VISIBLE | HIDDEN",
  "reason": "This product is not visible to guests."
  // reason is present when HIDDEN
}`;

const eligibilityOutputSchema = `{
  "status": "ELIGIBLE | CONDITIONAL | BLOCKED",
  "reasons": [
    {
      "code": "WHOLESALE_ONLY",
      "message": "This product requires a wholesale account.",
      "severity": "BLOCK",                              // RAOS-0000 §8.1
      "source": "com.os.retailagent.shopping.eligibility",
      "blocking": true,                                 // @deprecated — derived: severity !== 'INFO'
      "requirements": [
        { "type": "customer_type", "value": "wholesale" }
      ]
    }
  ]
}`;

export default function Spec0001Page() {
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
            <span className="text-xs font-mono font-semibold text-slate-400">RAOS-0001</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Draft · RFC
            </span>
            <span className="text-xs text-slate-400">v1.1.0</span>
            <span className="text-xs text-slate-400">June 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            Eligibility &amp; Visibility Semantics
          </h1>
          <p className="text-sm font-mono text-emerald-700 mb-4">
            com.os.retailagent.shopping.eligibility
          </p>
          <p className="text-sm text-slate-500">
            Layer: RetailAgentOS extension on top of UCP (Universal Commerce Protocol) ·{' '}
            <Link href="/demo" className="text-emerald-600 hover:underline">Reference implementation in Playground</Link>
          </p>

          {/* RFC callout */}
          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            This is an open draft. The point is to be argued with. If a reason code, a status, or a field is wrong, that&apos;s the most useful thing you can tell me.{' '}
            <a href="#open-questions" className="underline font-medium">See the open questions →</a>
          </div>

          <TierBadge tier="Tier 1" tierName="Qualified" version="1.1.0" adoptAnchor="tier-1" />
        </div>

        {/* View toggle */}
        <div className="flex justify-end mb-10">
          <ViewToggle />
        </div>

        {/* Abstract */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Abstract</h2>
          <p className="text-slate-700 leading-relaxed">
            This spec defines a machine-readable way for a merchant to declare <strong>who may see a product</strong> and <strong>who may buy it, and why</strong> — evaluated against a buyer&apos;s context at catalog time, before a cart is ever built. It produces two computed outputs an AI agent (or any UI) can act on: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">Visibility</code> (surface it or not) and <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">Eligibility</code> (can this buyer purchase, and if not, what would fix it).
          </p>
          <p className="mt-3 text-slate-700 leading-relaxed">
            The defining feature is <strong>reasons</strong>. Eligibility is not a boolean. Every decision carries a structured reason code, a human message, and — where a path exists — the requirement that would resolve it. An agent can therefore <em>explain</em> a block and <em>guide</em> a buyer toward qualifying, instead of failing silently at checkout.
          </p>
        </section>

        {/* The gap */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '2. Motivation — the gap this closes' : 'The problem this solves'}
          </h2>
          {isTechnical ? (
            <p className="text-slate-700 leading-relaxed">
              UCP standardizes the rails: discovery, catalog, cart, checkout handoff. It does not carry the merchant&apos;s <strong>reasoning</strong> about who is allowed to buy what. Today that logic lives deep in the commerce backend and only fires at checkout. The result, when an AI agent is the one shopping:
            </p>
          ) : (
            <p className="text-slate-700 leading-relaxed">
              Right now, a merchant&apos;s rules about who can buy what live deep in the checkout flow — invisible to any AI agent doing discovery. The result:
            </p>
          )}
          <ul className="mt-3 space-y-2">
            {[
              'A wholesale-only SKU is surfaced to a guest, who hits a wall at checkout.',
              'An agent builds a cart for a buyer who was never eligible — dead end.',
              'A buyer who could qualify (link an account, upload a resale certificate) is simply blocked, with no path shown.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-slate-700">
                <XCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-slate-700 leading-relaxed text-sm">
            The core idea: <strong>move merchant reasoning from checkout-time to catalog-time, with machine-readable reasons attached.</strong>
          </p>
        </section>

        {/* Inputs */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '4. Inputs' : 'What goes in'}
          </h2>
          {isTechnical ? (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.1 Eligibility rules (merchant-declared, attached to a variant)</p>
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{eligibilityRulesSchema}</pre>
                <p className="text-xs text-slate-500 mt-2">All fields are optional. A variant with no <code className="font-mono">eligibilityRules</code> is VISIBLE and ELIGIBLE to everyone.</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.2 Buyer context (the evaluation environment)</p>
                <p className="text-xs text-slate-500 mb-2">
                  This spec consumes the <code className="font-mono">BuyerContext</code> defined in <strong>RAOS-0000 §4</strong> — the single shared evaluation environment all extensions receive. RAOS-0001 reads: <code className="font-mono">customerType</code>, <code className="font-mono">membershipTier</code>, <code className="font-mono">marketRegion</code>, <code className="font-mono">fulfillmentMode</code>, <code className="font-mono">resaleCertificateOnFile</code>, and <code className="font-mono">trust.mode</code>.
                </p>
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{buyerContextSchema}</pre>
                <p className="text-xs text-slate-500 mt-2">Context is supplied by the agent on behalf of the buyer. Fields an agent doesn&apos;t know default to the most restrictive interpretation (<code className="font-mono">normalizeBuyerContext</code>, RAOS-0000 §4.3). When <code className="font-mono">trust.mode === &apos;asserted&apos;</code>, privilege-granting claims are downgraded for transaction-gating stages (RAOS-0000 §7.2).</p>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">Merchant declares on the product</p>
                <p className="text-sm text-slate-600">Visibility gates, account requirements, tier restrictions — attached to each variant at catalog time.</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">Agent supplies buyer context</p>
                <p className="text-sm text-slate-600">Customer type, membership tier, region, fulfillment mode — the agent knows who it&apos;s shopping for.</p>
              </div>
            </div>
          )}
        </section>

        {/* Outputs */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '5. Outputs (the contracts agents consume)' : 'What comes out'}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-mono font-semibold text-emerald-700 mb-1">ComputedVisibility</p>
              <p className="text-sm text-slate-600"><strong>VISIBLE</strong> — surface and recommend freely.<br /><strong>HIDDEN</strong> — do not surface at all. Never quote or add to a cart.</p>
              {isTechnical && (
                <pre className="mt-3 bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto leading-relaxed">{visibilityOutputSchema}</pre>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-mono font-semibold text-emerald-700 mb-1">ComputedEligibility</p>
              <p className="text-sm text-slate-600">
                <strong>ELIGIBLE</strong> — proceed freely.<br />
                <strong>CONDITIONAL</strong> — blocked now, but a resolvable path exists.<br />
                <strong>BLOCKED</strong> — no path. Explain and stop.
              </p>
              {isTechnical && (
                <pre className="mt-3 bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto leading-relaxed">{eligibilityOutputSchema}</pre>
              )}
            </div>
          </div>
          {isTechnical && (
            <p className="text-xs text-slate-500">
              <code className="font-mono">requirements[]</code> types: <code className="font-mono">customer_type</code>, <code className="font-mono">membership_tier</code>, <code className="font-mono">tax_exempt</code>, <code className="font-mono">resale_certificate</code>, <code className="font-mono">moq</code>, <code className="font-mono">quantity_increment</code>.
            </p>
          )}
        </section>

        {/* Reason Code Registry — always shown, this is the key artifact */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {isTechnical ? '6. Reason code registry' : 'Reason code registry'}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            The registry is the heart of interoperability — two systems agree on codes, not on prose. Messages are localizable; codes are stable.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Meaning</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
                  {isTechnical && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    blocking
                    {isTechnical && <span className="ml-1 text-slate-400 normal-case font-normal">(deprecated)</span>}
                  </th>
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
                    <td className="px-4 py-3 text-slate-700">{rc.meaning}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        {rc.severity}
                      </span>
                    </td>
                    {isTechnical && (
                      <td className="px-4 py-3">
                        <code className="text-xs font-mono text-slate-500">{rc.source}</code>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-400 line-through" title="deprecated — use severity instead">
                        {rc.blockingDeprecated ? 'true' : 'false'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {rc.resolvable ? (
                        <div className="flex items-start gap-1.5">
                          <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                          <span className="text-xs text-slate-600">{rc.resolution}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <XCircle size={14} className="text-slate-300" />
                          <span className="text-xs text-slate-400">No</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isTechnical && (
            <div className="mt-2 space-y-1">
              <p className="text-xs text-slate-400">
                Codes are namespaced under <code className="font-mono">com.os.retailagent.shopping.eligibility</code>. New codes should be additive; never repurpose an existing code&apos;s meaning.
              </p>
              <p className="text-xs text-slate-400">
                <code className="font-mono">blocking</code> is deprecated as of v1.1.0 — derived from <code className="font-mono">severity !== &apos;INFO&apos;</code>. Use <code className="font-mono">severity</code> instead. Removed in the next major version per RAOS-0000 §7.4.
              </p>
            </div>
          )}
        </section>

        {/* Algorithm — technical only, simplified business view */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '7. Evaluation algorithm' : 'How the decision is made'}
          </h2>
          {isTechnical ? (
            <>
              <p className="text-sm text-slate-600 mb-4">Deterministic. Same context + same rules → same result, every time. No model in the loop.</p>
              <ol className="space-y-3">
                {[
                  'Visibility first. If hideFromGuests and customerType == guest → HIDDEN. If the variant\'s restrictedRegions includes the buyer\'s region → HIDDEN. Otherwise VISIBLE.',
                  'If HIDDEN due to guest gate → eligibility is BLOCKED with HIDDEN_PRODUCT reason. Stop.',
                  'If HIDDEN due to region → eligibility is BLOCKED with REGION_RESTRICTED reason. Stop.',
                  'Otherwise evaluate each rule, accumulating reasons: requireWholesale → WHOLESALE_ONLY; requireResaleCertificate → RESALE_CERTIFICATE_REQUIRED; requiredTier not met → TIER_RESTRICTION; fulfillment mode not available → FULFILLMENT_UNAVAILABLE.',
                  'Resolve final status: BLOCKED if any unresolvable blocking reason; CONDITIONAL if any reasons remain; ELIGIBLE otherwise.',
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
              Visibility is checked first. If an item is hidden (guest gate or region restriction), eligibility stops immediately with a clear reason code. For visible items, each merchant rule is evaluated in turn, accumulating reason codes. The final status is BLOCKED if any unresolvable block exists, CONDITIONAL if a buyer could qualify with action, or ELIGIBLE if nothing blocks.
            </p>
          )}
        </section>

        {/* Worked examples */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            {isTechnical ? '8. Worked examples' : 'Real merchant scenarios'}
          </h2>
          <div className="space-y-6">

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-800">B&amp;T Wholesale — gated, qualification-first</p>
                {isTechnical && <p className="text-xs font-mono text-slate-500 mt-0.5">Rules: {'{ hideFromGuests: true, requireWholesale: true, requireResaleCertificate: true }'}</p>}
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  {
                    buyer: 'Guest buyer',
                    outcome: 'HIDDEN → BLOCKED [HIDDEN_PRODUCT]',
                    note: 'Agent never surfaces it.',
                    type: 'blocked',
                  },
                  {
                    buyer: 'Wholesale buyer, no resale cert',
                    outcome: 'BLOCKED [RESALE_CERTIFICATE_REQUIRED]',
                    note: '"I can show this, but you\'ll need a resale certificate on file. Want to upload one?"',
                    type: 'conditional',
                  },
                  {
                    buyer: 'Wholesale buyer, resale cert on file',
                    outcome: 'VISIBLE → ELIGIBLE',
                    note: 'Agent proceeds.',
                    type: 'eligible',
                  },
                ].map((row) => (
                  <div key={row.buyer} className="px-4 py-3 flex items-start gap-3">
                    <div className={`shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full mt-2 ${
                      row.type === 'eligible' ? 'bg-emerald-400' : row.type === 'conditional' ? 'bg-amber-400' : 'bg-red-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{row.buyer}</p>
                      {isTechnical && <p className="text-xs font-mono text-slate-500">{row.outcome}</p>}
                      <p className="text-xs text-slate-500 italic mt-0.5">{row.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-800">Fresh Corner Market — region &amp; fulfillment sensitive</p>
                {isTechnical && <p className="text-xs font-mono text-slate-500 mt-0.5">Variant restricted in HI, available only via pickup / local_delivery</p>}
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  {
                    buyer: 'Buyer in HI',
                    outcome: 'HIDDEN → BLOCKED [REGION_RESTRICTED]',
                    note: 'Item not available in this market. Agent explains — doesn\'t silently drop.',
                    type: 'blocked',
                  },
                  {
                    buyer: 'Buyer requesting shipping',
                    outcome: 'VISIBLE → BLOCKED [FULFILLMENT_UNAVAILABLE]',
                    note: 'Agent doesn\'t promise shipping it can\'t deliver.',
                    type: 'blocked',
                  },
                ].map((row) => (
                  <div key={row.buyer} className="px-4 py-3 flex items-start gap-3">
                    <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-2 bg-red-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{row.buyer}</p>
                      {isTechnical && <p className="text-xs font-mono text-slate-500">{row.outcome}</p>}
                      <p className="text-xs text-slate-500 italic mt-0.5">{row.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-800">Sara&apos;s Boutique — open DTC, discovery-led</p>
                {isTechnical && <p className="text-xs font-mono text-slate-500 mt-0.5">No eligibilityRules declared</p>}
              </div>
              <div className="px-4 py-3 flex items-start gap-3">
                <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-2 bg-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-slate-800">Any buyer</p>
                  {isTechnical && <p className="text-xs font-mono text-slate-500">VISIBLE → ELIGIBLE</p>}
                  <p className="text-xs text-slate-500 italic mt-0.5">Clean payload, no gates — an agent recommends freely. This archetype&apos;s gap is discoverability, addressed by a future spec.</p>
                </div>
              </div>
            </div>
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
              This is being built in the open precisely so the answers come from people who run real catalogs. Email me or reply on the build-log post.
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

        {/* Why this spec first */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '10. Why this is the first spec' : 'Why start here'}
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm">
            Of all the merchant-reasoning gaps, eligibility-with-reasons is the most reusable — it applies to wholesale gating, age restriction, region rules, membership, regulated goods, and more. Prove it cleanly here, on real archetypes, and it becomes a candidate to propose upstream into UCP itself.
          </p>
          <p className="mt-3 text-slate-700 leading-relaxed text-sm">
            The mission: a small retailer can&apos;t build this. But if the spec exists and is open, the platform they already use can implement it once — and every merchant on that platform inherits agent-readiness for free. <strong>The spec is the leverage.</strong>
          </p>
        </section>

        {/* Footer nav */}
        <div className="border-t border-slate-100 pt-8 flex items-center justify-between">
          <Link href="/specs" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
            <ArrowLeft size={14} />
            All Specs
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
