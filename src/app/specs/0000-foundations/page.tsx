'use client';

import Link from 'next/link';
import { TierBadge } from '../TierBadge';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, AlertCircle, Mail, Layers, ShieldCheck } from 'lucide-react';
import { useView } from '@/lib/context/ViewContext';
import { ViewToggle } from '@/components/ui/ViewToggle';

const severityLevels = [
  {
    severity: 'BLOCK',
    meaning: 'Purchase is blocked in this context. If a requirements[] path exists it is CONDITIONAL; otherwise BLOCKED.',
    gates: true,
    note: 'Replaces the ambiguous `blocking` boolean.',
  },
  {
    severity: 'CONDITION',
    meaning: 'A resolvable path exists (link account, upgrade tier, upload certificate). Surface the path, never dead-end.',
    gates: true,
    note: 'BLOCKED vs CONDITIONAL is derived from requirements[] presence.',
  },
  {
    severity: 'INFO',
    meaning: 'Advisory only — a loyalty earn preview, a freshness note. Never gates a transaction.',
    gates: false,
    note: 'Degraded/absent advisory stages collapse to INFO or omit.',
  },
];

const rulesOfTheGame = [
  {
    title: 'Determinism',
    body: 'Same (BuyerContext, manifest, catalog) → identical output, always. No model in the loop, no clock or randomness inside an evaluator. Time is injected so TTL/quote logic stays testable.',
  },
  {
    title: 'Most-restrictive default',
    body: 'Unknown, missing, or untrusted context defaults to the most-restrictive interpretation for any transaction-gating stage. An untrusted "I\'m a gold member" never grants member pricing.',
  },
  {
    title: 'Fail-degraded — never fail-open, never crash',
    body: 'A throwing, timing-out, or absent extension yields a documented degraded result: BLOCK for safety-critical stages (Eligibility), INFO/omit for advisory ones (Loyalty). Unknown reason codes are treated as BLOCK.',
  },
  {
    title: 'Versioning & deprecation',
    body: 'semver per namespace; minor/patch additive-only; reason codes never repurposed. A deprecated code stays emitted for ≥1 major with a supersededBy pointer.',
  },
];

const openQuestions = [
  {
    number: 1,
    question: 'Three-axis buyer identity',
    body: 'BuyerContext keeps both loyaltyTier (consumer loyalty, RAOS-0009) and membershipTier (B2B account standing, RAOS-0001) as two distinct, orthogonal fields. With the conformance tier, that is a deliberate three-axis identity model — neither field subsumes the other.',
    proposed: 'RESOLVED (2026-06-07): keep separate. They answer different questions, are owned by different specs, and are not collapsed into one capability-set claim.',
    resolved: true,
  },
  {
    number: 2,
    question: '`severity` three-state vs two-state',
    body: 'RAOS-0000 standardizes BLOCK | CONDITION | INFO and derives BLOCKED/CONDITIONAL from requirements[]. Is CONDITION worth keeping as a distinct severity, or should agents just read BLOCK + presence of requirements[]?',
    proposed: 'Mirrors RAOS-0001 OQ#2 at the platform level.',
  },
  {
    number: 3,
    question: 'Headline `tier` — keep it at all?',
    body: 'If agents must negotiate on capabilities[] and the headline is purely advisory, does publishing a tier number add value or invite the exact conformance-vs-loyalty conflation we are trying to kill?',
    proposed: 'Leaning: keep it as a human/marketing summary, clearly labeled advisory.',
  },
  {
    number: 4,
    question: 'Most-restrictive default for discovery',
    body: 'Transaction stages default strict. Should discovery default open (risking surfacing something a buyer can\'t buy) or strict (risking under-surfacing)?',
    proposed: 'Mirrors RAOS-0001 OQ#4.',
  },
  {
    number: 5,
    question: 'Where does `trust.mode` live — context or envelope?',
    body: 'The trust signal appears on both BuyerContext.trust and the provenance envelope. Is one canonical and the other a view, or are they genuinely different (buyer-claim trust vs data-payload trust)?',
    proposed: 'Leaning: genuinely different — keep both.',
  },
];

const buyerContextSchema = `{
  "customerType": "guest | member | wholesale | b2b",
  "loyaltyTier": "guest | silver | gold",     // consumer loyalty — RAOS-0009 (orthogonal axis)
  "membershipTier": "none | gold | reseller_plus | distributor", // B2B account standing — RAOS-0001 (orthogonal axis)
  "marketRegion": "US | CA | NY | HI | ...",
  "fulfillmentMode": "shipping | pickup | local_delivery",
  "accountLinked": false,
  "taxExempt": false,
  "resaleCertificateOnFile": false,
  "trust": {
    "mode": "asserted | signed",   // B6: simulated as 'asserted' now
    "issuer": "https://id.example.test",
    "keyId": "k1",
    "signature": "base64…"
  }
}`;

const manifestSchema = `// GET /.well-known/ucp  (Fresh Corner Market — grocery archetype)
{
  "protocol": "1.0",
  "tier": 4,                    // headline maturity summary — ADVISORY
  "capabilities": [             // AUTHORITATIVE — agents negotiate on THIS
    { "namespace": "com.os.retailagent.shopping.eligibility",   "version": "1.1.0" },
    { "namespace": "com.os.retailagent.shopping.promo_pricing", "version": "1.0.0" },
    { "namespace": "com.os.retailagent.shopping.fulfillment_constraints", "version": "1.0.0" }
    // a Tier-2 merchant MAY list a Tier-3 capability here without raising the tier
  ]
}`;

const reasonEntrySchema = `{
  "code": "TIER_RESTRICTION",   // namespaced-stable, from the owning registry
  "message": "Requires gold membership tier.",  // localizable, never the contract
  "severity": "BLOCK | CONDITION | INFO",        // replaces the blocking boolean
  "requirements": [
    { "type": "membership_tier", "value": "gold" }
  ],
  "source": "com.os.retailagent.shopping.eligibility"
}`;

const envelopeSchema = `{
  "provenance": {
    "issuer": "https://api.grocery-c.test",
    "keyId": "k1",
    "signature": "base64…",          // crypto SIMULATED now (B3/D2)
    "trustMode": "asserted | signed" // label loudly: simulated ≠ real security
  },
  "freshness": {
    "computedAt": 1717718400,        // injected now, not Date.now()
    "ttlSeconds": 300                // past this → degrade or re-fetch
  }
}`;

const conformanceLadder = [
  { tier: '0', name: 'Discoverable', promise: 'An agent can find and correctly read my catalog.', example: 'Any store' },
  { tier: '1', name: 'Qualified', promise: 'No dead-end carts — only eligible, in-stock items surface.', example: 'Boutique' },
  { tier: '2', name: 'Priced', promise: 'The right price per buyer, honored at checkout.', example: 'Wholesale' },
  { tier: '3', name: 'Member-aware', promise: 'Supports member-aware pricing, earn preview, subscriptions.', example: 'Grocery' },
  { tier: '4', name: 'Assisted', promise: 'Full commerce — fulfillment, handoff, intent, returns.', example: 'Grocery chain' },
];

export default function Spec0000Page() {
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
            <span className="text-xs font-mono font-semibold text-slate-400">RAOS-0000</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Draft · RFC
            </span>
            <span className="text-xs text-slate-400">v0.1.0</span>
            <span className="text-xs text-slate-400">June 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            Protocol Foundations, Context &amp; Conformance
          </h1>
          <p className="text-sm font-mono text-emerald-700 mb-4">
            com.os.retailagent.shopping.core
          </p>
          <p className="text-sm text-slate-500">
            The meta-spec every other RAOS spec imports ·{' '}
            <Link href="/profile" className="text-emerald-600 hover:underline">See the manifest in the Profile viewer</Link>
          </p>

          {/* RFC callout */}
          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            This is the shared substrate — the context object, the conformance ladder, the manifest, versioning, reasons, and degradation. It is an open draft. If a rule here is wrong, that&apos;s the most useful thing you can tell me.{' '}
            <a href="#open-questions" className="underline font-medium">See the open questions →</a>
          </div>

          <TierBadge tier="Foundation" version="0.1.0" adoptAnchor="tier-0" />
        </div>

        {/* View toggle */}
        <div className="flex justify-end mb-10">
          <ViewToggle />
        </div>

        {/* Abstract */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Abstract</h2>
          <p className="text-slate-700 leading-relaxed">
            RAOS-0000 defines the <strong>shared substrate</strong> every other RetailAgentOS spec builds on. It is deliberately small and deliberately load-bearing. Five things live here and nowhere else: the <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">BuyerContext</code> object, the conformance-tier ladder and <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">/.well-known/ucp</code> manifest, the versioning contract, the unified <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">ReasonEntry</code> envelope, and the provenance &amp; freshness envelope.
          </p>
          <p className="mt-3 text-slate-700 leading-relaxed">
            It does <em>not</em> redesign the extension evaluator contract or the staged pipeline (Visibility → Eligibility → Price → Fulfillment → Quote) — those are owned by the{' '}
            <Link href="/architecture" className="text-emerald-600 hover:underline">architecture doc</Link> and referenced here. This spec defines the <strong>nouns and rules</strong>; the architecture defines the <strong>machine that runs them</strong>.
          </p>
        </section>

        {/* The gap */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '2. Motivation — why a foundation spec exists' : 'Why a foundation spec exists'}
          </h2>
          <p className="text-slate-700 leading-relaxed">
            Every RAOS spec answers one merchant-reasoning question — but each needs the <em>same</em> primitives: a buyer to evaluate against, a way to declare which contracts a merchant supports, a shared vocabulary of reasons, a rule for missing or stale data, and a promise the contract won&apos;t shift under a consumer&apos;s feet.
          </p>
          <ul className="mt-3 space-y-2">
            {[
              'If each spec invents its own copy of these primitives, the series is a pile of incompatible extensions, not a platform.',
              'The whole leverage is that a platform implements the substrate once — and every merchant inherits agent-readiness.',
              'Every other spec\'s "Inputs" section references the BuyerContext defined here, not its own copy.',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-slate-700">
                <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* BuyerContext */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '4. The BuyerContext object' : 'The buyer context'}
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm mb-4">
            <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">BuyerContext</code> is the evaluation environment — <strong>buyer-scoped facts only</strong>: who is shopping, on what terms. Merchant facts (which extensions are active) do <em>not</em> live here; they live in the negotiated session manifest.
          </p>

          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-900 mb-4">
            <strong>loyaltyTier is not a conformance tier.</strong> The buyer&apos;s gold/silver/guest standing answers <em>who is shopping</em> and is a claim owned by RAOS-0009. It is never a rung on the conformance ladder, which answers <em>what the merchant can do</em>. A guest can shop a Member-aware merchant. <code className="font-mono text-xs">loyaltyTier</code> (consumer loyalty, RAOS-0009) and <code className="font-mono text-xs">membershipTier</code> (B2B account standing, RAOS-0001) are themselves two <strong>orthogonal</strong> fields — neither subsumes the other — making three distinct identity axes in all.
          </div>

          {isTechnical && (
            <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{buyerContextSchema}</pre>
          )}

          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-500" /> Trust model (B6)</p>
              <p className="text-sm text-slate-600">Claims arrive <span className="font-mono text-xs">signed</span> (verified envelope → trusted) or <span className="font-mono text-xs">asserted</span> (agent&apos;s word — simulated default). An untrusted privilege-granting claim falls back to guest / most-restrictive. The merchant trusts the signature, not the agent.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-1">Unknown → most-restrictive</p>
              <p className="text-sm text-slate-600">Any field the agent doesn&apos;t supply defaults to its most-restrictive interpretation: unknown customer type → guest, unknown region → region-gated items restricted.</p>
            </div>
          </div>
        </section>

        {/* Conformance ladder */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {isTechnical ? '5. Conformance tiers (the split axis)' : 'Conformance tiers'}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            A conformance tier describes a <strong>merchant&apos;s implementation maturity</strong> — cumulative, nested. It is <em>orthogonal</em> to a buyer&apos;s loyalty tier. <strong>Conformance ≠ buyer loyalty</strong> is the single most important rule in this spec.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">What the merchant can do</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Archetype</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {conformanceLadder.map((row) => (
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
        </section>

        {/* Manifest */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '6. The /.well-known/ucp manifest & negotiation' : 'How a merchant declares what it supports'}
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm mb-4">
            A merchant publishes a <strong>headline <code className="font-mono text-xs">tier</code> number</strong> (a maturity summary) <strong>backed by an authoritative <code className="font-mono text-xs">capabilities[]</code> list</strong> of the extensions it actually supports. Agents <strong>negotiate on <code className="font-mono text-xs">capabilities[]</code>, never on the ladder</strong> — so a Tier-2 merchant can list an individual Tier-3 capability without claiming the full nested tier.
          </p>
          {isTechnical && (
            <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed mb-4">{manifestSchema}</pre>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5"><Layers size={14} className="text-emerald-500" /> Headline tier is advisory</p>
              <p className="text-sm text-slate-600">If the headline outruns capabilities[], the agent negotiates on capabilities[] and treats the number as advisory. No capability = not supported, regardless of the tier.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-1">Version skew</p>
              <p className="text-sm text-slate-600">Same major → compatible (additive minor/patch). Different major → fall back to highest shared major, or treat the capability as absent and degrade.</p>
            </div>
          </div>
        </section>

        {/* Rules of the game */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '7. The rules of the game' : 'The rules every spec inherits'}
          </h2>
          <div className="space-y-3">
            {rulesOfTheGame.map((rule, i) => (
              <div key={rule.title} className="flex gap-3 rounded-xl border border-slate-200 p-4">
                <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{rule.title}</p>
                  <p className="text-sm text-slate-600 mt-0.5">{rule.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reason envelope — the key cross-cutting artifact */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {isTechnical ? '8. The unified reason envelope' : 'One reason vocabulary'}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Every stage emits one <code className="font-mono text-xs">ReasonEntry</code> shape, so an agent parses one vocabulary. <code className="font-mono text-xs">severity</code> replaces the ambiguous <code className="font-mono text-xs">blocking</code> boolean; <code className="font-mono text-xs">BLOCKED</code> vs <code className="font-mono text-xs">CONDITIONAL</code> is derived from whether a <code className="font-mono text-xs">requirements[]</code> path exists.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Meaning</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gates a sale?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {severityLevels.map((s) => (
                  <tr key={s.severity} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 align-top">
                      <code className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                        s.severity === 'INFO' ? 'text-slate-600 bg-slate-100' : 'text-emerald-700 bg-emerald-50'
                      }`}>
                        {s.severity}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {s.meaning}
                      {isTechnical && <span className="block text-xs text-slate-400 mt-1">{s.note}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {s.gates ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Yes</span>
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
            <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{reasonEntrySchema}</pre>
          )}
          <p className="text-xs text-slate-400 mt-2">
            Every reason code is owned by exactly one namespace and declared in that spec&apos;s registry. Codes are additive-only — never repurposed. Unknown codes degrade to BLOCK.
          </p>
        </section>

        {/* Provenance & freshness */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '9. Provenance & freshness envelope' : 'Trust & freshness (the envelope)'}
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm mb-4">
            Every computed contract may carry a provenance + freshness envelope so an agent (and a buyer) can trust that data is authentic and current. RAOS-0000 fixes the <strong>shape</strong>; <strong>RAOS-0008 owns the depth</strong> (real signing, key rotation, clock-skew, per-field freshness). Crypto is simulated for now — labeled loudly so simulated is never mistaken for real security.
          </p>
          {isTechnical && (
            <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{envelopeSchema}</pre>
          )}
        </section>

        {/* Worked examples — the three archetypes' manifests */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            {isTechnical ? '10. Worked examples — the three archetypes' : 'Real merchant manifests'}
          </h2>
          <div className="space-y-6">

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Sara&apos;s Boutique — open DTC</p>
                <span className="text-xs font-mono font-semibold text-slate-400">headline tier 1</span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-slate-700">Declares <span className="font-mono text-xs">pricing_context</span> + <span className="font-mono text-xs">eligibility</span> — nothing more. A Qualified merchant: an agent gets no dead-end carts, but no per-buyer pricing.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">B&amp;T Wholesale — B2B, bulk-priced</p>
                <span className="text-xs font-mono font-semibold text-slate-400">headline tier 2</span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-slate-700">Adds <span className="font-mono text-xs">member_pricing</span> + <span className="font-mono text-xs">bulk_pricing</span> on the eligibility floor. A Priced merchant: the right price per buyer, negotiated on capabilities[].</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Fresh Corner Market — offers + fulfillment</p>
                <span className="text-xs font-mono font-semibold text-slate-400">headline tier 4</span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-slate-700">The richest archetype: <span className="font-mono text-xs">promo_pricing</span>, <span className="font-mono text-xs">fulfillment_constraints</span>, <span className="font-mono text-xs">intent_capture</span>. An Assisted merchant exercising the most edge cases.</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
              Inspect these manifests in the Profile viewer
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Gated callout */}
        <section className="mb-12">
          <div className="rounded-xl bg-slate-900 text-slate-100 p-5">
            <p className="text-sm font-semibold mb-1 flex items-center gap-2"><AlertCircle size={16} className="text-amber-400" /> Gated — not designed here</p>
            <p className="text-sm text-slate-300 leading-relaxed">
              The agent-reasoning / explainability <strong>trace</strong> format (audience, narration style, schema) is deliberately not designed in this spec. RAOS-0000 provides only the substrate a trace would draw on — the ordered list of <code className="font-mono text-xs bg-slate-800 px-1 py-0.5 rounded">ReasonEntry</code> values with <code className="font-mono text-xs bg-slate-800 px-1 py-0.5 rounded">source</code> namespaces. The trace format awaits a dedicated decision.
            </p>
          </div>
        </section>

        {/* Open questions */}
        <section id="open-questions" className="mb-12 scroll-mt-8">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {isTechnical ? '11. Open questions — Request for Comment' : 'Open questions'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">These are genuine forks. Tell me I&apos;m wrong.</p>

          <div className="space-y-4">
            {openQuestions.map((q) => (
              <div key={q.number} className={`rounded-xl border p-5 ${q.resolved ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'}`}>
                <div className="flex items-start gap-3">
                  {q.resolved ? (
                    <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-500" />
                  ) : (
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-1 flex flex-wrap items-center gap-2">
                      <span>
                        <span className="text-slate-400 mr-1.5">#{q.number}</span>
                        {q.question}
                      </span>
                      {q.resolved && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Resolved</span>
                      )}
                    </p>
                    <p className="text-sm text-slate-600 mb-2">{q.body}</p>
                    {q.proposed && (
                      <p className={`text-sm ${q.resolved ? 'text-emerald-700 font-medium' : 'text-slate-500 italic'}`}>{q.proposed}</p>
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

        {/* Why this spec */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '12. Why this is spec 0000' : 'Why start here'}
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm">
            Everything else imports this. The leverage of RetailAgentOS is that the substrate is implemented <strong>once</strong> and every merchant inherits it. If the BuyerContext is clean, the manifest negotiates on the right axis, reasons share one vocabulary, and versioning never breaks a consumer silently — then every spec above this one is a small, safe addition rather than a fresh negotiation of first principles.
          </p>
          <p className="mt-3 text-slate-700 leading-relaxed text-sm">
            A foundation you can&apos;t see is doing its job. <strong>This spec is that foundation.</strong>
          </p>
        </section>

        {/* Footer nav */}
        <div className="border-t border-slate-100 pt-8 flex items-center justify-between">
          <Link href="/specs" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
            <ArrowLeft size={14} />
            All Specs
          </Link>
          <Link href="/specs/0001-eligibility" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            Next: Eligibility &amp; Visibility (RAOS-0001)
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
