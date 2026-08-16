'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { useView } from '@/lib/context/ViewContext';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { TierBadge } from '../TierBadge';

const reasonCodes = [
  {
    code: 'FULFILLMENT_MODE_UNAVAILABLE',
    meaning: 'Not available for the requested fulfillment mode',
    severity: 'BLOCK',
    resolvable: false,
  },
  {
    code: 'REGION_NOT_SERVED',
    meaning: "This specific item can't reach the buyer's region, though the merchant generally serves it",
    severity: 'BLOCK',
    resolvable: false,
  },
  {
    code: 'HAZMAT_RESTRICTION',
    meaning: 'Hazmat-classified item, not shippable by parcel carrier',
    severity: 'BLOCK',
    resolvable: false,
  },
  {
    code: 'OVERSIZE_RESTRICTION',
    meaning: 'Exceeds standard parcel dimensions, not shippable by parcel carrier',
    severity: 'BLOCK',
    resolvable: false,
  },
  {
    code: 'LEAD_TIME_EXCEEDS_NEED_BY',
    meaning: "Can't be fulfilled by the buyer's stated deadline given the declared lead time",
    severity: 'BLOCK',
    resolvable: false,
  },
  {
    code: 'CUTOFF_PASSED',
    meaning: 'The merchant-local same-day cutoff has passed for a same-day-capable mode',
    severity: 'BLOCK',
    resolvable: false,
  },
  {
    code: 'STORE_CLOSED',
    meaning: 'v1.1 — the store is not open at the requested time (weekly hours + exceptions)',
    severity: 'BLOCK',
    resolvable: false,
  },
  {
    code: 'ORDER_ACCEPTANCE_ENDED',
    meaning: 'v1.1 — still open, but past the declared order-acceptance buffer before close',
    severity: 'BLOCK',
    resolvable: false,
  },
  {
    code: 'PREPARATION_EXCEEDS_NEED_BY',
    meaning: "v1.1 — item preparation time would finish after the buyer's exact need-by timestamp",
    severity: 'BLOCK',
    resolvable: false,
  },
  {
    code: 'INSUFFICIENT_TIME_BEFORE_CLOSE',
    meaning: 'v1.1 — item preparation time would finish after the store closes',
    severity: 'BLOCK',
    resolvable: false,
  },
];

const openQuestions = [
  {
    number: 1,
    question: 'The provider-delegation extension point — designed, not built',
    resolved: false,
    body: 'v1 ships merchant-owned feasibility only. For a real fulfillment network (Instacart, DoorDash, Uber), feasibility is not merchant data — the merchant says "I stock milk," the network says "I can deliver it in two hours." RAOS has no third-party fulfillment-provider actor today.',
    proposed: 'Designed in §9.1 of the spec: a manifest field naming which provider asserts feasibility for a mode, a requirement that the assertion be signed (trustMode: \'signed\', not \'asserted\' — the stakes are higher than a buyer\'s own claim), a shorter provider-declared freshness TTL riding in the same RAOS-0000 §9 envelope shape, and a rule that a merchant\'s own declared restriction always wins over a provider\'s optimism (never the reverse). Nothing here is built. If you operate a fulfillment network, this is written for you — tell me I\'m wrong.',
  },
  {
    number: 2,
    question: 'Should HAZMAT_RESTRICTION / OVERSIZE_RESTRICTION ever be resolvable?',
    resolved: false,
    body: 'v1 treats both as unconditionally non-resolvable in shipping mode. Does a merchant sometimes offer a hazmat-rated carrier upcharge that would make shipping possible for a fee? RAOS-0000\'s Requirement.type registry has no entry for "pay a surcharge."',
    proposed: null,
  },
  {
    number: 3,
    question: 'Is calendar-date lead time granular enough?',
    resolved: false,
    body: 'leadTimeDays compares whole merchant-local calendar dates, not hours — an order at 11:58pm and one two minutes later on the same lead-time-day get the same earliest date. Should this compose with cutoffHourLocal (treat "past cutoff" as consuming a lead-time day)? Not composed in v1.',
    proposed: null,
  },
  {
    number: 4,
    question: 'Precedence when eligibility AND feasibility both block',
    resolved: true,
    resolvedDate: '2026-08-12',
    body: 'When an item is both ineligible (RAOS-0001) and unreachable (RAOS-0003) for the same buyer, which reason governs the buyer-facing explanation?',
    proposed: 'RESOLVED: first-blocking-stage governs. STAGE_ORDER runs ELIGIBILITY before the new FEASIBILITY stage, so "who is allowed to buy this at all" governs over "can we physically get it to this buyer" when both are true — the more fundamental blocker, surfaced first. Both reasons still fire and both appear in the trace; only which one is the headline explanation changes.',
  },
];

const fulfillmentConstraintsSchema = `{
  "fulfillmentConstraints": {
    "availableModes": ["pickup", "local_delivery"], // optional
    "restrictedRegions": ["HI", "AK"],                // optional — THIS variant's reach
    "hazmat": true,                                   // optional
    "oversize": true,                                 // optional
    "leadTimeDays": 3,                                 // optional
    "cutoffHourLocal": 14                              // optional — merchant-local hour, 0-23
  }
}`;

const buyerContextSchema = `// BuyerContext — RAOS-0000 §4, shared by all extensions.
// RAOS-0003 reads: fulfillmentMode, marketRegion, needByDate.
{
  "fulfillmentMode": "shipping | pickup | local_delivery",
  "marketRegion": "US | CA | NY | HI | ...",
  "needByDate": "2026-08-20",  // optional, 'YYYY-MM-DD' — absent NEVER blocks (§4.3.1)
  // ...the rest of BuyerContext (RAOS-0001 fields), unread by this spec
}`;

const feasibilityOutputSchema = `{
  "status": "FEASIBLE | BLOCKED",
  "reasons": [
    {
      "code": "FULFILLMENT_MODE_UNAVAILABLE",
      "message": "This product is not available for shipping.",
      "severity": "BLOCK",
      "source": "com.os.retailagent.shopping.fulfillment_constraints",
      "blocking": true
    }
  ]
}`;

export default function Spec0003Page() {
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
            <span className="text-xs font-mono font-semibold text-slate-400">RAOS-0003</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Draft · RFC
            </span>
            <span className="text-xs text-slate-400">v1.1.0</span>
            <span className="text-xs text-slate-400">August 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            Fulfillment Feasibility
          </h1>
          <p className="text-sm font-mono text-emerald-700 mb-4">
            com.os.retailagent.shopping.fulfillment_constraints
          </p>
          <p className="text-sm text-slate-500">
            Layer: RetailAgentOS extension on top of UCP (Universal Commerce Protocol) ·{' '}
            <Link href="/demo" className="text-emerald-600 hover:underline">Reference implementation in Playground</Link>
            {' '}·{' '}
            <Link href="/guided/platform" className="text-emerald-600 hover:underline">See it in the late-night pizza demo</Link>
          </p>
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            <strong>v1.1.0 (quick commerce)</strong> adds an optional merchant operating schedule
            (<code className="font-mono text-xs">MerchantProfile.serviceSchedule</code>), per-item preparation time
            (<code className="font-mono text-xs">preparationTimeMinutes</code>), and an exact deadline
            (<code className="font-mono text-xs">BuyerContext.needByAt</code>) — four new reason codes below, all
            additive, all optional, byte-identical v1.0 behavior when unset. See{' '}
            <Link href="/guided/platform" className="underline font-medium">the late-night pizza demo</Link>{' '}
            — and see <code className="font-mono text-xs">specs/work-packages/RAOS-0003-quick-commerce-provider-signals.md</code>{' '}
            for the live courier/routing extension point this deliberately does NOT build.
          </div>

          {/* RFC callout */}
          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            This is an open draft, and §9.1 is written specifically for people who operate real fulfillment networks. If a fork there is wrong, that&apos;s the most useful thing you can tell me.{' '}
            <a href="#open-questions" className="underline font-medium">See the open questions →</a>
          </div>

          <TierBadge tier="Tier 1" tierName="Qualified" version="1.0.0" adoptAnchor="tier-1" />
          <p className="mt-3 text-xs text-slate-400">
            Promoted from Tier 4 (Assisted) on 2026-08-12 — see §2 below for why &quot;can this reach this buyer at all&quot; is a Tier 1, not Tier 4, question.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex justify-end mb-10">
          <ViewToggle />
        </div>

        {/* Abstract */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Abstract</h2>
          <p className="text-slate-700 leading-relaxed">
            This spec defines a machine-readable way for a merchant to declare <strong>whether an item can actually reach a given buyer</strong> — evaluated at catalog time, before a cart is ever built. It produces one computed output an AI agent can act on: <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">ComputedFulfillmentFeasibility</code> — feasible, or blocked with a structured, non-resolvable reason.
          </p>
          <p className="mt-3 text-slate-700 leading-relaxed">
            Feasibility is deliberately narrower than &quot;fulfillment&quot; in general: mode, region, carrier restrictions, lead time, and same-day cutoff — everything answerable <strong>deterministically, from data already on hand</strong>. It does not answer &quot;is there capacity right now&quot; — see Scope below for why that line is drawn where it is.
          </p>
        </section>

        {/* Motivation */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '2. Motivation — the gap this closes, and why it moved to Tier 1' : 'The problem this solves'}
          </h2>
          <p className="text-slate-700 leading-relaxed">
            An agent confirms shipping to Hawaii for a local-delivery-only item, or promises same-day pickup after the cutoff has passed — because nothing at catalog time carries fulfillment <em>feasibility</em>, only fulfillment <em>intent</em>.
          </p>
          <p className="mt-3 text-slate-700 leading-relaxed text-sm">
            This spec originally shipped as Tier 4 (&quot;Assisted&quot;), alongside cart handoff and returns — a late-stage nicety. For a last-mile network, reachability is the opposite of a nicety: it is not an enhancement to commerce, it is a precondition for it. An item can be perfectly eligible (RAOS-0001) and perfectly in stock (RAOS-0005) and still be a dead-end cart if it cannot reach the buyer. Tier 1 — &quot;no dead-end carts&quot; — now names all three failure modes explicitly: eligible, in stock, <strong>reachable</strong>.
          </p>
        </section>

        {/* Scope */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '3. Scope' : 'What this covers, and what it deliberately doesn\'t'}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-4">
              <p className="text-sm font-semibold text-emerald-800 mb-2">In scope — deterministic, from injected inputs</p>
              <ul className="text-sm text-slate-700 space-y-1 list-disc list-inside">
                <li>Mode feasibility</li>
                <li>Variant-level region reach</li>
                <li>Hazmat / oversize carrier restrictions</li>
                <li>Lead time vs. need-by</li>
                <li>Same-day cutoff</li>
              </ul>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Explicitly OUT for v1</p>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                <li><strong>Live slot capacity</strong> (DELIVERY_WINDOW_FULL) — not deterministic, cannot pass &quot;same inputs → same answer.&quot;</li>
                <li><strong>Split-shipment planning</strong> — a cart-level problem (RAOS-0012), not a single-variant one.</li>
                <li>Pickup/delivery-window selection UI — presentation, not feasibility.</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Do not ship a reason code you cannot test. The two codes that can&apos;t be produced from the static mock catalog (<code className="font-mono">LEAD_TIME_EXCEEDS_NEED_BY</code>, <code className="font-mono">CUTOFF_PASSED</code>) have dedicated synthetic-input tests instead.
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
                <p className="text-sm font-semibold text-slate-600 mb-2">4.1 Fulfillment constraints (merchant-declared, attached to a variant)</p>
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{fulfillmentConstraintsSchema}</pre>
                <p className="text-xs text-slate-500 mt-2">All fields optional and independent. A variant with no <code className="font-mono">fulfillmentConstraints</code> is FEASIBLE for every buyer.</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.2 Buyer context</p>
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{buyerContextSchema}</pre>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.3 Merchant timezone (new, required)</p>
                <p className="text-xs text-slate-500">
                  <code className="font-mono">MerchantProfile.timezone: string</code> (IANA identifier) is now required — the same call RAOS-0001 §9.6 made for <code className="font-mono">servesRegions</code>, and for the same reason: a same-day cutoff is meaningless without a clock to evaluate it against, and a silent UTC default would be exactly the wrong-but-quiet failure this spec exists to fix.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">Merchant declares on the product</p>
                <p className="text-sm text-slate-600">Modes, regions it can&apos;t reach, hazmat/oversize flags, lead time, and same-day cutoff hour — attached to each variant.</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">Agent supplies buyer context</p>
                <p className="text-sm text-slate-600">Fulfillment mode, region, and (optionally) a need-by date — the agent knows when and where the buyer needs it.</p>
              </div>
            </div>
          )}
        </section>

        {/* Outputs */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '5. Outputs' : 'What comes out'}
          </h2>
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-sm font-mono font-semibold text-emerald-700 mb-1">ComputedFulfillmentFeasibility</p>
            <p className="text-sm text-slate-600">
              <strong>FEASIBLE</strong> — proceed freely.<br />
              <strong>BLOCKED</strong> — cannot reach this buyer. No resolution path — explain and stop.
            </p>
            {isTechnical && (
              <pre className="mt-3 bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto leading-relaxed">{feasibilityOutputSchema}</pre>
            )}
          </div>
          {isTechnical && (
            <p className="mt-3 text-xs text-slate-500">
              Deliberately two-state, unlike <code className="font-mono">ComputedEligibility</code>&apos;s three — every v1 reason code is BLOCK severity with no <code className="font-mono">requirements[]</code> path. There is no buyer-side action that resolves &quot;this item cannot physically reach you.&quot;
            </p>
          )}
        </section>

        {/* Reason Code Registry */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {isTechnical ? '6. Reason code registry' : 'Reason code registry'}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Two systems agree on codes, not on prose. Messages are localizable; codes are stable.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Meaning</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolvable</th>
                </tr>
              </thead>
              <tbody>
                {reasonCodes.map((r) => (
                  <tr key={r.code} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-slate-800 whitespace-nowrap">{r.code}</td>
                    <td className="px-4 py-3 text-slate-600">{r.meaning}</td>
                    <td className="px-4 py-3">
                      {r.resolvable
                        ? <span className="text-emerald-600 font-medium">Yes</span>
                        : <span className="text-slate-400">No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600">
            <p className="mb-2"><strong>FULFILLMENT_MODE_UNAVAILABLE</strong> is a rename, not a new concept — it replaces RAOS-0001&apos;s deprecated <code className="font-mono">FULFILLMENT_UNAVAILABLE</code> (not re-emitted; see the 0001 changelog).</p>
            <p><strong>REGION_NOT_SERVED</strong> is a deliberately <em>distinct</em> code from RAOS-0001&apos;s <code className="font-mono">REGION_RESTRICTED</code>, not a rename: &quot;we don&apos;t do business here at all&quot; (merchant-level) vs. &quot;this one item can&apos;t reach you, everything else in your cart can&quot; (item-level) are different buyer conversations.</p>
          </div>
        </section>

        {/* Algorithm */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '7. Evaluation algorithm' : 'How it decides'}
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm mb-3">
            Deterministic. Same <code className="font-mono text-xs bg-slate-100 px-1 rounded">(variant, context, now, merchantTimezone)</code> → same result, every time. No model in the loop. Every configured check runs and accumulates — an agent sees every blocker in one pass, not one at a time.
          </p>
          {isTechnical && (
            <p className="text-xs text-slate-500">
              Timezone conversion never constructs a <code className="font-mono">Date</code> object — <code className="font-mono">Intl.DateTimeFormat</code> is fed the raw injected epoch number directly, and calendar-date arithmetic uses a pure, allocation-free Gregorian civil-calendar↔epoch-day algorithm. See <code className="font-mono">src/lib/rules/fulfillment.ts</code>.
            </p>
          )}
        </section>

        {/* Worked examples */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            {isTechnical ? '8. Worked examples' : 'Worked examples'}
          </h2>
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-800 mb-2">Fresh Corner Market — mode, region, lead time, cutoff (grocery)</p>
              <ul className="text-sm text-slate-600 space-y-1.5">
                <li>Bananas, buyer requests <code className="font-mono text-xs">shipping</code> → <code className="font-mono text-xs">BLOCKED [FULFILLMENT_MODE_UNAVAILABLE]</code>.</li>
                <li>Bananas, buyer in HI → <code className="font-mono text-xs">BLOCKED [REGION_NOT_SERVED]</code> — even though the merchant generally serves HI.</li>
                <li>Custom cake (3-day lead time), buyer needs it in 2 days → <code className="font-mono text-xs">BLOCKED [LEAD_TIME_EXCEEDS_NEED_BY]</code>. No stated deadline → never blocks.</li>
                <li>Hot deli tray (2pm cutoff), ordered at 3pm local for pickup → <code className="font-mono text-xs">BLOCKED [CUTOFF_PASSED]</code>.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-800 mb-2">Atlas Wholesale — carrier restrictions</p>
              <ul className="text-sm text-slate-600 space-y-1.5">
                <li>Industrial solvent (hazmat), shipping request → <code className="font-mono text-xs">BLOCKED [HAZMAT_RESTRICTION]</code>; pickup → FEASIBLE.</li>
                <li>Commercial oven (oversize), shipping request → <code className="font-mono text-xs">BLOCKED [OVERSIZE_RESTRICTION]</code>; pickup → FEASIBLE.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-800 mb-2">Sara&apos;s Boutique — discovery-led, open DTC</p>
              <p className="text-sm text-slate-600">No <code className="font-mono text-xs">fulfillmentConstraints</code> on any variant. Every buyer, every mode → FEASIBLE, no reasons.</p>
            </div>
          </div>
        </section>

        {/* Open Questions */}
        <section id="open-questions" className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {isTechnical ? '9. Open questions — Request for Comment' : 'Open questions'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">These are genuine forks — §1 especially is written for fulfillment-network operators. Tell me I&apos;m wrong.</p>

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
            <p className="text-sm font-semibold text-slate-700 mb-1">Run a fulfillment network? Have a view on any of these?</p>
            <p className="text-sm text-slate-600 mb-3">
              §9.1 (provider delegation) is written to get a real reaction from someone who operates real fulfillment logistics. Email me or reply on the build-log post.
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
            {isTechnical ? '10. Why this spec' : 'Why this matters'}
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm">
            Fulfillment feasibility is the other half of &quot;no dead-end carts.&quot; RAOS-0001 proved a buyer can be ineligible; RAOS-0005 proved an item can be out of stock; this spec proves an item can be unreachable — three independent, composable ways the same cart line can be a dead end, each with its own reason code an agent can explain rather than silently drop.
          </p>
          <p className="mt-3 text-slate-700 leading-relaxed text-sm">
            The day a fulfillment network is willing to sign a feasibility assertion, §9.1 has a documented seam ready for it.
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
