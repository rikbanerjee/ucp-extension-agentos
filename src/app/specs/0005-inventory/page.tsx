'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, AlertCircle, Mail, Package, MapPin } from 'lucide-react';
import { useView } from '@/lib/context/ViewContext';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { TierBadge } from '../TierBadge';

const reasonCodes = [
  {
    code: 'OUT_OF_STOCK',
    namespace: '…inventory',
    meaning: 'Item is out of stock. Cannot be added to cart. Resolution: notify-me (RAOS-0013 intent capture forward-ref).',
    severity: 'BLOCK',
    resolvable: true,
    resolution: 'Request notify-me alert (RAOS-0013)',
  },
  {
    code: 'LOW_STOCK',
    namespace: '…inventory',
    meaning: 'Item is in stock but quantity is at or below the low-stock threshold. Agent should surface urgency ("Only 3 left").',
    severity: 'INFO',
    resolvable: false,
    resolution: null,
  },
  {
    code: 'BACKORDER_AVAILABLE',
    namespace: '…inventory',
    meaning: 'Item is on backorder but orderable. ETA is carried in requirements[]. Agent should surface the ETA to the buyer.',
    severity: 'CONDITION',
    resolvable: true,
    resolution: 'Acknowledge backorder ETA before ordering',
  },
  {
    code: 'PREORDER_NOT_YET_BUYABLE',
    namespace: '…inventory',
    meaning: 'Item is visible for preorder but cannot be added to cart until release date. Release date in requirements[].',
    severity: 'CONDITION',
    resolvable: true,
    resolution: 'Wait for release date',
  },
  {
    code: 'STOCK_STALE',
    namespace: '…inventory',
    meaning: 'Inventory data has expired its TTL. The agent must re-fetch before acting. Does not block the item — signals a re-fetch requirement.',
    severity: 'CONDITION',
    resolvable: true,
    resolution: 'Re-fetch inventory data',
  },
  {
    code: 'LOCATION_OUT_OF_STOCK',
    namespace: '…inventory',
    meaning: 'At least one pickup location has stock, but the buyer\'s selected/preferred location does not. Available locations listed in requirements[].',
    severity: 'CONDITION',
    resolvable: true,
    resolution: 'Select a pickup location with available stock',
  },
  {
    code: 'RESERVATION_EXPIRED',
    namespace: '…inventory',
    meaning: 'A soft hold placed at add-to-cart has expired. The buyer must re-evaluate availability before checkout.',
    severity: 'BLOCK',
    resolvable: true,
    resolution: 'Re-evaluate availability; re-add to cart if still in stock',
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
    question: 'Per-location vs buyer-location mapping: should RAOS-0005 know which locationId maps to the buyer\'s region?',
    resolved: false,
    resolvedDate: null,
    body: 'Currently the spec surfaces the full perLocation[] array and emits LOCATION_OUT_OF_STOCK when the buyer is in pickup mode and some locations have zero stock. But the spec does not know which locationId corresponds to the buyer\'s physical location — that mapping is RAOS-0003\'s (Fulfillment Feasibility) concern. Should RAOS-0005 emit LOCATION_OUT_OF_STOCK more specifically (only for the buyer\'s closest or selected location)?',
    proposed: 'Defer precise location-to-region mapping to RAOS-0003. RAOS-0005 surfaces the full perLocation array and the CONDITION code; 0003 refines it with location feasibility. This keeps 0005 independent of fulfillment logic.',
  },
  {
    number: 2,
    question: 'Reservation state as pipeline input vs external hold-tracker: is the module-level holds slot the right shim?',
    resolved: false,
    resolvedDate: null,
    body: 'The evaluator uses setInventoryHolds() to inject hold state before evaluateOffer(). This works but is an awkward shim. Should the pipeline support an "evaluation context" bag that extensions can read without needing module-level state?',
    proposed: 'The shim is intentional and documented. The pipeline could grow a `sideInputs` slot in a future RAOS-0000 revision. Until then, the holds-slot pattern is the minimal approach. The determinism invariant is preserved: the holds are set immediately before evaluateOffer() and cleared after use.',
  },
  {
    number: 3,
    question: 'Should preorder items be blocked (not addable) or conditionally addable?',
    resolved: false,
    resolvedDate: null,
    body: 'Currently PREORDER_NOT_YET_BUYABLE is CONDITION severity — the item is visible and the reason is surfaced, but it\'s not blocked. A merchant may want to accept preorders (add to cart OK) vs not (block until release). The spec doesn\'t differentiate.',
    proposed: 'The agent interprets CONDITION as "resolvable" — a merchant implementing preorder acceptance would mark it as such via intent-capture (RAOS-0013 forward-ref). Open for comment on whether a more explicit "preorder_enabled" flag belongs in the config.',
  },
  {
    number: 4,
    question: 'Oversell race: should the spec define an atomic reservation protocol?',
    resolved: false,
    resolvedDate: null,
    body: 'Two agents grabbing the last unit is a real problem. The spec documents this as a checkout-time concern with reservation TTL as mitigation. But should RAOS-0005 define a more explicit "claim" step (vs "soft hold") where the checkout system atomically decrements and confirms?',
    proposed: 'The atomic stock decrement is intentionally in the checkout system (RAOS-0012). RAOS-0005 surfaces the re-evaluation signal (RESERVATION_EXPIRED) and the TTL as the agent-facing mitigation. The checkout claim protocol is a RAOS-0012 concern.',
  },
];

const inventoryConfigSchema = `{
  "inventory": {
    "state": "in_stock" | "low_stock" | "out_of_stock" | "backorder" | "preorder",
    "quantityAvailable": 4,           // optional — enables onlyXLeft
    "perLocation": [                   // optional — for BOPIS / pickup
      { "locationId": "store_A", "quantity": 4 },
      { "locationId": "store_B", "quantity": 0 }
    ],
    "backorderEta": "2026-09-01",      // optional — for backorder state
    "preorderReleaseDate": "2027-03-01",// optional — for preorder state
    "lowStockThreshold": 5,            // optional — default 5
    "reservationPolicy": "none" | "soft_hold",
    "reservationTtlSeconds": 900,      // optional — default 900 (15min)
    "dataFetchedAt": 1718000000000,    // Unix ms — optional, defaults to now
    "dataTtlSeconds": 60               // optional — default 60s
  }
}`;

const availabilityOutputSchema = `{
  "state": "in_stock",
  "onlyXLeft": 3,                      // set when qty <= lowStockThreshold
  "perLocation": [                     // passed through from config
    { "locationId": "store_A", "quantity": 4 },
    { "locationId": "store_B", "quantity": 0 }
  ],
  "freshness": {
    "computedAt": 1718000100000,       // from injected now — NEVER Date.now()
    "ttlSeconds": 60
  }
}`;

export default function Spec0005Page() {
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
            <span className="text-xs font-mono font-semibold text-slate-400">RAOS-0005</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Draft · RFC
            </span>
            <span className="text-xs text-slate-400">v1.0.0</span>
            <span className="text-xs text-slate-400">June 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            Inventory &amp; Availability
          </h1>
          <p className="text-sm font-mono text-emerald-700 mb-4">
            com.os.retailagent.shopping.inventory
          </p>
          <p className="text-sm text-slate-500">
            <Link href="/demo" className="text-emerald-600 hover:underline">Reference implementation in Playground</Link>
          </p>

          {/* RFC callout */}
          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            This is an open draft. The oversell race (OQ#4) and the location-mapping question (OQ#1)
            are genuine design forks. If you run a multi-location store or have dealt with agent
            oversell incidents, your input is the most valuable.{' '}
            <a href="#open-questions" className="underline font-medium">See the open questions →</a>
          </div>

          <TierBadge tier="Tier 1" tierName="Qualified" version="1.0.0" adoptAnchor="tier-1" />
        </div>

        {/* View toggle */}
        <div className="flex justify-end mb-10">
          <ViewToggle />
        </div>

        {/* Abstract */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Abstract</h2>
          <p className="text-slate-700 leading-relaxed">
            An AI agent that confidently sells an out-of-stock item is worse than an agent that
            doesn&apos;t sell at all. This spec defines how a merchant declares inventory state
            at catalog time — in-stock, low-stock, out-of-stock, backorder, or preorder — and
            how an agent computes availability before recommending or adding to cart.
          </p>
          <p className="mt-3 text-slate-700 leading-relaxed">
            The spec adds two properties that UCP does not carry: <strong>freshness</strong> (a
            mandatory TTL envelope — inventory is the most time-sensitive data in the pipeline,
            default 60s) and <strong>soft reservation semantics</strong> (an add-to-cart action
            can place a timed hold on stock, and an expired hold triggers a re-evaluation signal
            before checkout).
          </p>
          {isTechnical && (
            <p className="mt-3 text-slate-700 leading-relaxed text-sm">
              The inventory evaluator runs in the ELIGIBILITY stage (priority 20, after the
              RAOS-0001 evaluator at priority 10). An out-of-stock item is <em>visible</em> but
              not <em>addable</em>. The <code className="font-mono text-xs">ComputedAvailability</code>{' '}
              output rides on the <code className="font-mono text-xs">DecisionRecord</code> for
              RAOS-0007 (quote integrity) and RAOS-0003 (fulfillment feasibility) to read.
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
              'An agent recommends an item; the buyer adds it; checkout rejects with "out of stock." The agent had no way to know.',
              'Two agents race for the last unit — the first checkout wins, the second fails. The agent can\'t explain why.',
              'A backorder item shows as "unavailable" with no ETA — the agent can\'t tell the buyer when to expect it.',
              'A buyer wants store pickup; the item is available at store A but not store B. The agent has no location-level signal.',
              'Stale inventory data (cached at recommending time) is served at checkout — prices are fresh but stock figures are 10 minutes old.',
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
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.1 Variant inventory config (merchant-declared)</p>
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{inventoryConfigSchema}</pre>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.2 BuyerContext (RAOS-0000 §4)</p>
                <p className="text-xs text-slate-500">
                  This spec reads <code className="font-mono">fulfillmentMode</code> from the shared{' '}
                  <code className="font-mono">BuyerContext</code> to determine whether to apply
                  per-location stock filtering (pickup mode only). Full BuyerContext shape: RAOS-0000 §4.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.3 Reservation holds (injected)</p>
                <p className="text-xs text-slate-500">
                  Active <code className="font-mono">InventoryHold[]</code> for this variant —
                  injected by the caller before pipeline execution via{' '}
                  <code className="font-mono">setInventoryHolds()</code>. Empty array when no
                  holds are in effect. The pipeline never reads holds from module state between
                  calls — this preserves the determinism invariant.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.4 Injected now (Unix ms)</p>
                <p className="text-xs text-slate-500">
                  Time is always the injected <code className="font-mono">now</code> parameter
                  from the pipeline. <code className="font-mono">Date.now()</code> and{' '}
                  <code className="font-mono">new Date()</code> are forbidden inside{' '}
                  <code className="font-mono">src/lib/rules/**</code> and{' '}
                  <code className="font-mono">src/lib/extensions/**</code>.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package size={14} className="text-emerald-500" />
                  <p className="text-sm font-semibold text-slate-800">Merchant declares on the variant</p>
                </div>
                <p className="text-sm text-slate-600">Stock state, quantity, per-location breakdown, backorder ETA, preorder release date, TTL, and reservation policy.</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin size={14} className="text-emerald-500" />
                  <p className="text-sm font-semibold text-slate-800">Agent supplies buyer context</p>
                </div>
                <p className="text-sm text-slate-600">Fulfillment mode (shipping vs pickup) determines whether per-location filtering applies.</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">Pipeline injects time</p>
                <p className="text-sm text-slate-600">The injected <code className="font-mono text-xs">now</code> timestamp drives freshness checks and reservation expiry — never Date.now().</p>
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
                <p className="text-sm font-mono font-semibold text-emerald-700 mb-2">ComputedAvailability</p>
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{availabilityOutputSchema}</pre>
                <p className="text-xs text-slate-500 mt-2">
                  <code className="font-mono">freshness.computedAt</code> is set from the injected{' '}
                  <code className="font-mono">now</code> — never from{' '}
                  <code className="font-mono">Date.now()</code>. This is mandatory: inventory is
                  the most time-sensitive data in the pipeline (default TTL 60s vs pricing 300s vs
                  eligibility 3600s per RAOS-0008 guidance).
                </p>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">Availability state</p>
                <p className="text-sm text-slate-600">in-stock / low-stock / out-of-stock / backorder / preorder — with optional onlyXLeft count and per-location breakdown.</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-1">Freshness envelope</p>
                <p className="text-sm text-slate-600">computedAt + TTL in seconds. Mandatory for inventory. After TTL expires, STOCK_STALE signals the agent to re-fetch before acting.</p>
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
            One namespace, seven codes. Every availability decision is machine-readable.
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Meaning</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
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
        </section>

        {/* Algorithm */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '7. Evaluation algorithm' : 'How availability is computed'}
          </h2>
          {isTechnical ? (
            <>
              <p className="text-sm text-slate-600 mb-4">Deterministic. Same (config, context, holds, now) → same result. No model in the loop.</p>
              <ol className="space-y-3">
                {[
                  'No inventory config → return in_stock with no reasons. Preserves implicit behavior of pre-RAOS-0005 variants.',
                  'Freshness check: if dataFetchedAt + dataTtlSeconds * 1000 < now → emit STOCK_STALE (CONDITION). Continue evaluation (staleness does not block).',
                  'Reservation expiry check: for each hold in holds[] where heldAt + ttlSeconds * 1000 < now → emit RESERVATION_EXPIRED (BLOCK). Return early — expired hold is always a block.',
                  'State dispatch:',
                  '  out_of_stock → emit OUT_OF_STOCK (BLOCK, resolution=notify-me).',
                  '  backorder → emit BACKORDER_AVAILABLE (CONDITION, ETA in requirements if set).',
                  '  preorder → emit PREORDER_NOT_YET_BUYABLE (CONDITION, release date in requirements if set).',
                  '  in_stock / low_stock → check qty vs lowStockThreshold; if at or below → emit LOW_STOCK (INFO), set onlyXLeft.',
                  'Per-location check (pickup mode only): if perLocation set and buyer fulfillmentMode=pickup: if all locations have qty=0 → emit OUT_OF_STOCK (BLOCK); if some have qty=0 → emit LOCATION_OUT_OF_STOCK (CONDITION, available locations in requirements).',
                  'Return ComputedAvailability with freshness envelope. computedAt = injected now.',
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span className="font-mono text-xs">{step}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="text-slate-700 leading-relaxed text-sm">
              Check freshness first. Then check whether any reservation holds have expired. Then
              evaluate the stock state: block on OOS, surface ETA on backorder, surface release
              date on preorder, signal urgency on low-stock. For pickup buyers, filter by
              per-location stock. Return the result with a freshness timestamp — the agent
              knows exactly when to re-fetch.
            </p>
          )}
        </section>

        {/* Worked examples */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            {isTechnical ? '8. Worked examples' : 'Real merchant scenarios'}
          </h2>
          <div className="space-y-6">

            {/* Grocery: per-location BOPIS */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-800">Fresh Corner Market — BOPIS per-location stock (Grocery)</p>
                {isTechnical && <p className="text-xs font-mono text-slate-500 mt-0.5">Artisan Sourdough · perLocation: [store_A: 4, store_B: 0]</p>}
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { buyer: 'Shipping buyer', outcome: 'in_stock — no location filtering; ships from warehouse', code: 'None', type: 'eligible' },
                  { buyer: 'Pickup buyer (any location)', outcome: 'LOCATION_OUT_OF_STOCK (CONDITION) — store A has it, store B doesn\'t. Buyer selects store A.', code: 'LOCATION_OUT_OF_STOCK', type: 'conditional' },
                  { buyer: 'Pickup buyer (all locations zero)', outcome: 'OUT_OF_STOCK (BLOCK) — no locations have stock', code: 'OUT_OF_STOCK', type: 'blocked' },
                ].map((row) => (
                  <div key={row.buyer} className="px-4 py-3 flex items-start gap-3">
                    <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${row.type === 'eligible' ? 'bg-emerald-400' : row.type === 'conditional' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{row.buyer}</p>
                      {isTechnical && <p className="text-xs font-mono text-slate-500">{row.code}</p>}
                      <p className="text-xs text-slate-500 italic mt-0.5">{row.outcome}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Wholesale: backorder */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-800">Atlas Wholesale — backorder with ETA (B2B)</p>
                {isTechnical && <p className="text-xs font-mono text-slate-500 mt-0.5">Paper Napkins · state: backorder · backorderEta: &quot;2026-08-15&quot;</p>}
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { desc: 'Wholesale buyer queries availability', outcome: 'BACKORDER_AVAILABLE (CONDITION) — ETA 2026-08-15. Buyer can order now.', code: 'BACKORDER_AVAILABLE', type: 'conditional' },
                  { desc: 'Hard OOS (no ETA)', outcome: 'OUT_OF_STOCK (BLOCK) — resolution: notify-me. No orderability.', code: 'OUT_OF_STOCK', type: 'blocked' },
                ].map((row) => (
                  <div key={row.desc} className="px-4 py-3 flex items-start gap-3">
                    <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${row.type === 'conditional' ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{row.desc}</p>
                      {isTechnical && <p className="text-xs font-mono text-slate-500">{row.code}</p>}
                      <p className="text-xs text-slate-500 italic mt-0.5">{row.outcome}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Boutique: preorder */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <p className="text-sm font-semibold text-slate-800">Sara&apos;s Boutique — preorder (DTC)</p>
                {isTechnical && <p className="text-xs font-mono text-slate-500 mt-0.5">Spring 2027 Collection Tee · state: preorder · preorderReleaseDate: &quot;2027-03-01&quot;</p>}
              </div>
              <div className="divide-y divide-slate-100">
                {[
                  { desc: 'Any buyer before release', outcome: 'PREORDER_NOT_YET_BUYABLE (CONDITION) — visible but not yet addable. Release date: 2027-03-01.', type: 'conditional' },
                ].map((row) => (
                  <div key={row.desc} className="px-4 py-3 flex items-start gap-3">
                    <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-2 bg-amber-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{row.desc}</p>
                      <p className="text-xs text-slate-500 italic mt-0.5">{row.outcome}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reservation expiry */}
            {isTechnical && (
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <p className="text-sm font-semibold text-slate-800">Reservation expiry — two agents, one unit</p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">Grocery item · soft_hold · TTL 900s · quantityAvailable: 1</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {[
                    { t: 't=0 (agent A adds to cart)', outcome: 'createSoftHold → hold{heldAt:0, ttl:900}. Availability: in_stock.', type: 'eligible' },
                    { t: 't=899s (agent A checks out)', outcome: 'isHoldActive=true. No RESERVATION_EXPIRED. Checkout proceeds.', type: 'eligible' },
                    { t: 't=901s (agent B tries to add)', outcome: 'RESERVATION_EXPIRED (BLOCK) on the expired hold. Agent B must re-evaluate.', type: 'blocked' },
                    { t: 'Oversell race (both at t=0)', outcome: 'Both agents see in_stock — deterministic per-evaluation. Checkout system does atomic stock decrement; the second checkout is rejected by the checkout (RAOS-0012 concern, not RAOS-0005).', type: 'eligible' },
                  ].map((row) => (
                    <div key={row.t} className="px-4 py-3 flex items-start gap-3">
                      <div className={`shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${row.type === 'eligible' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{row.t}</p>
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
              Try the two-agents-one-unit simulator in the Playground
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Reservation semantics */}
        {isTechnical && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-slate-900 mb-3">9. Reservation semantics &amp; the oversell race</h2>
            <div className="rounded-xl border border-slate-200 p-5 space-y-4 text-sm text-slate-700">
              <p>
                <strong>Soft hold:</strong> when a buyer adds to cart and{' '}
                <code className="font-mono text-xs">reservationPolicy === &apos;soft_hold&apos;</code>,
                a <code className="font-mono text-xs">createSoftHold()</code> call returns an{' '}
                <code className="font-mono text-xs">InventoryHold</code> record. The caller stores
                and passes it as input on subsequent evaluations. Expiry triggers{' '}
                <code className="font-mono text-xs">RESERVATION_EXPIRED</code> (BLOCK), forcing
                the agent to re-evaluate before checkout.
              </p>
              <p>
                <strong>Oversell race:</strong> two agents simultaneously evaluating the same last
                unit each receive <em>deterministic, identical</em> output (both see in-stock).
                RAOS-0005 is not the race arbiter. The checkout system (RAOS-0012) is responsible
                for the atomic stock decrement. RAOS-0005&apos;s role is to surface the
                re-evaluation signal (<code className="font-mono text-xs">RESERVATION_EXPIRED</code>)
                so agents are forced to re-check before checkout.
              </p>
              <p>
                <strong>No module-level mutable state:</strong> the evaluator never stores holds
                in module state. Each call to <code className="font-mono text-xs">evaluateInventory</code>{' '}
                reads holds from the injected parameter. This is what makes the determinism
                invariant absolute.
              </p>
            </div>
          </section>
        )}

        {/* Open questions */}
        <section id="open-questions" className={`mb-12 scroll-mt-8 ${isTechnical ? '' : ''}`}>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {isTechnical ? '10. Open questions — Request for Comment' : 'Open questions'}
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
              The oversell race and location-mapping questions are the hardest. If you operate
              a multi-location grocery or run a BOPIS integration, your edge cases are exactly
              what this spec needs.
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
            {isTechnical ? '11. Why this spec now' : 'Why start here'}
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm">
            Inventory truth is must-have #2 in the program (after quote integrity). An agent
            that confidently sells an out-of-stock item destroys buyer trust faster than any
            other failure mode. The freshness TTL makes this spec load-bearing for RAOS-0007
            (Quote Integrity): a quote token is only as trustworthy as its inventory signal,
            and a stale inventory at quote-time is a liability. Shipping this before 0007 means
            0007 can bind ComputedAvailability directly.
          </p>
        </section>

        {/* Footer nav */}
        <div className="border-t border-slate-100 pt-8 flex items-center justify-between">
          <Link href="/specs/0002-contextual-pricing" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
            <ArrowLeft size={14} />
            0002 · Contextual Pricing
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
