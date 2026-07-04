'use client';

import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useView } from '@/lib/context/ViewContext';
import { TierBadge } from '../TierBadge';

// ---------------------------------------------------------------------------
// Deny-list fields (§1.3)
// ---------------------------------------------------------------------------

const denyListFields = [
  'floor',
  'margin',
  'cost',
  'suppressed (including suppressedOffers)',
  'inputsHash',
  'computedAt',
  'keyId',
  'signature',
  'source',
  'appliedOffers',
];

// ---------------------------------------------------------------------------
// Static example renderings (do NOT call evaluateOffer from this page)
// ---------------------------------------------------------------------------

const developerTraceExample = `// renderDeveloperTrace(trace) — abbreviated
{
  "computedAt": 0,
  "envelope": {
    "computedAt": 0,
    "issuer": "https://api.boutique-a.test",
    "isStale": false,
    "keyId": "k1",
    "trustMode": "asserted",
    "ttlSeconds": 300
  },
  "governingReason": {
    "reason": {
      "blocking": true,
      "code": "TIER_RESTRICTION",
      "message": "This item requires gold membership tier.",
      "severity": "BLOCK",
      "source": "com.os.retailagent.shopping.eligibility"
    },
    "resolutionPath": "Requires membership tier: gold"
  },
  "inputsHash": "a3f7c2d1",
  "isTransactable": false,
  "offerStatus": "BLOCKED",
  "reasons": [
    {
      "blocking": false,
      "code": "TRUST_SIMULATED",
      "message": "Envelope produced with simulated crypto.",
      "severity": "INFO",
      "source": "com.os.retailagent.shopping.trust"
    },
    {
      "blocking": true,
      "code": "TIER_RESTRICTION",
      "message": "This item requires gold membership tier.",
      "severity": "BLOCK",
      "source": "com.os.retailagent.shopping.eligibility"
    }
  ],
  "stageVerdicts": [
    { "ran": true,  "reasonCount": 0, "stage": "VISIBILITY",  "worstSeverity": null  },
    { "ran": true,  "reasonCount": 1, "stage": "ELIGIBILITY", "worstSeverity": "BLOCK" },
    { "ran": false, "reasonCount": 0, "stage": "PRICE",       "worstSeverity": null  }
  ],
  "suppressedOffers": [],
  "traceSchema": "1.0.0",
  "unitPrice": null
}`;

const merchantTableRows = [
  {
    stage: 'ELIGIBILITY',
    status: 'BLOCK',
    code: 'TIER_RESTRICTION',
    message: 'This item requires gold membership tier.',
    actionHint: 'Review eligibilityRules.requiredTier in your catalog config',
  },
];

const buyerExampleBlocked = `{
  "canPurchase": false,
  "headline": "This item requires gold membership tier.",
  "nextStep": "Upgrade to gold membership to unlock this item"
}`;

const buyerExamplePass = `{
  "canPurchase": true,
  "headline": "Available for purchase",
  "detail": "Price: $45.00"
}`;

// ---------------------------------------------------------------------------
// Severity styling
// ---------------------------------------------------------------------------

const severityStyles: Record<string, string> = {
  INFO: 'bg-sky-50 text-sky-700 border border-sky-200',
  CONDITION: 'bg-amber-50 text-amber-700 border border-amber-200',
  BLOCK: 'bg-red-50 text-red-700 border border-red-200',
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function Spec0013Page() {
  const { view } = useView();
  const isTechnical = view === 'technical';

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* Owner review notice */}
        <div className="mb-8 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800 mb-1">Owner review required</p>
            <p className="text-sm text-amber-700">
              This spec page requires owner review before public visibility.
              Trace schema and sample renderings are ready for review.
            </p>
          </div>
        </div>

        {/* Breadcrumb */}
        <Link href="/specs" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-8">
          <ArrowLeft size={14} />
          All Specs
        </Link>

        {/* Title block */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-sm font-mono text-slate-400">RAOS-0013</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-semibold">
              Draft · RFC
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              v0.1.0 · June 2026
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Intent Capture, Assisted Commerce &amp; Decision Trace
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl">
            Three-audience rendering of every pipeline decision: developer JSON for debugging,
            merchant ops table for config review, buyer card for purchase UX.
            The trace is a pure derivation of the <code className="text-sm bg-slate-100 px-1 rounded">DecisionRecord</code> —
            it transforms, never augments.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Part 1 (Decision Trace, built here) is Foundation — required at every tier. Part 2
            (Intent Capture routing) is planned for Tier 4 · Assisted.
          </p>

          <TierBadge tier="Foundation" version="0.1.0" adoptAnchor="derived-surfaces" />
        </div>

        {/* Namespace */}
        <div className="mb-8 p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-sm">
          <span className="text-slate-400">namespace: </span>
          <span className="text-indigo-700">com.os.retailagent.shopping.trace</span>
        </div>

        {/* Section 1: Decision Trace */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Section 1 — Decision Trace</h2>

          <p className="text-slate-600 mb-4">
            The UCP pipeline (<code className="text-sm bg-slate-100 px-1 rounded">evaluateOffer</code>) produces a{' '}
            <code className="text-sm bg-slate-100 px-1 rounded">DecisionRecord</code> — a complete substrate
            containing every reason code emitted, every stage result, and provenance metadata.
            RAOS-0013 §1 defines how to render that substrate for three distinct audiences.
          </p>

          {/* Three-audience table */}
          <div className="mb-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Audience</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Function</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Output</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { audience: 'Developer', fn: 'renderDeveloperTrace(trace)', output: 'Stable, sorted JSON string', visibility: 'Full trace — all fields' },
                  { audience: 'Merchant', fn: 'renderMerchantTrace(trace)', output: 'MerchantTraceRow[]', visibility: 'BLOCK + CONDITION only; config hints' },
                  { audience: 'Buyer', fn: 'renderBuyerTrace(trace)', output: 'BuyerTraceView', visibility: 'Deny-listed — no internal fields' },
                ].map(row => (
                  <tr key={row.audience} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 text-sm">{row.audience}</td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-700">{row.fn}</td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{row.output}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">{row.visibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Developer trace */}
          <h3 className="text-base font-semibold text-slate-800 mb-2">Developer trace</h3>
          <p className="text-slate-600 text-sm mb-3">
            Full <code className="text-xs bg-slate-100 px-1 rounded">DecisionTrace</code> serialized as JSON with alphabetically sorted keys at
            every nesting level. Round-trip safe: <code className="text-xs bg-slate-100 px-1 rounded">parse → re-render === original</code>.
            The <code className="text-xs bg-slate-100 px-1 rounded">traceSchema</code> field carries the version ({'"'}1.0.0{'"'}).
          </p>
          {isTechnical && (
            <pre className="bg-slate-900 text-slate-100 text-xs rounded-xl p-5 overflow-x-auto leading-relaxed whitespace-pre-wrap mb-6">
              {developerTraceExample}
            </pre>
          )}

          {/* Merchant trace */}
          <h3 className="text-base font-semibold text-slate-800 mb-2 mt-6">Merchant trace</h3>
          <p className="text-slate-600 text-sm mb-3">
            Only BLOCK and CONDITION reasons are shown — INFO reasons are too noisy for an ops view.
            Each row includes an <code className="text-xs bg-slate-100 px-1 rounded">actionHint</code> derived
            from a hardcoded lookup table (no LLM; deterministic). A PASS row is returned when there are no actionable reasons.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Stage', 'Status', 'Code', 'Message', 'Action Hint'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {merchantTableRows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.stage}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${severityStyles[row.status] ?? ''}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-800">{row.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{row.message}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 italic">{row.actionHint}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Buyer trace */}
          <h3 className="text-base font-semibold text-slate-800 mb-2">Buyer trace</h3>
          <p className="text-slate-600 text-sm mb-3">
            At most four fields: <code className="text-xs bg-slate-100 px-1 rounded">canPurchase</code>,{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">headline</code>,{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">detail</code> (optional), and{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">nextStep</code> (optional).
            The deny-list (§1.3) is enforced by construction and unit-tested.
          </p>
          {isTechnical && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <pre className="bg-slate-900 text-slate-100 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre">
                {buyerExampleBlocked}
              </pre>
              <pre className="bg-slate-900 text-slate-100 text-xs rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre">
                {buyerExamplePass}
              </pre>
            </div>
          )}
        </section>

        {/* Buyer deny-list */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Buyer audience deny-list (§1.3)</h2>
          <p className="text-slate-600 text-sm mb-4">
            These fields must <strong>never</strong> appear in <code className="text-xs bg-slate-100 px-1 rounded">renderBuyerTrace</code> output.
            Enforcement: construction + unit tests (<code className="text-xs bg-slate-100 px-1 rounded">JSON.stringify(result)</code> must not
            contain any of these as JSON object keys).
          </p>
          <div className="flex flex-wrap gap-2">
            {denyListFields.map(f => (
              <span key={f} className="px-2 py-1 rounded font-mono text-xs bg-rose-50 text-rose-700 border border-rose-200">
                {f}
              </span>
            ))}
          </div>
        </section>

        {/* traceSchema versioning */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">traceSchema versioning</h2>
          <p className="text-slate-600 text-sm mb-4">
            The <code className="text-xs bg-slate-100 px-1 rounded">traceSchema</code> field on{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">DecisionTrace</code> carries the version of the trace shape (currently{' '}
            <code className="text-xs bg-slate-100 px-1 rounded">&apos;1.0.0&apos;</code>).
            Consumers should parse this field before reading any other fields. Additive field additions
            are compatible within the same major version (RAOS-0000 §7.4 policy). Breaking removals or
            renames bump the major version.
          </p>
        </section>

        {/* Section 2: Intent Capture */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Section 2 — Intent Capture &amp; Routing</h2>
          <div className="p-5 rounded-lg border border-slate-200 bg-slate-50">
            <p className="text-sm text-slate-600 font-medium mb-1">Planned — WP-14</p>
            <p className="text-sm text-slate-500 leading-relaxed">
              When checkout is not the outcome, the agent needs an action vocabulary:
              out-of-stock notify-me, B2B quote request, WhatsApp/lead-form routing, wishlist.
              The full intent capture and routing contract will be defined in WP-14.
              See <code className="text-xs bg-white border border-slate-200 rounded px-1">MASTER-BUILD-PLAN.md</code> WP-14 brief.
            </p>
          </div>
        </section>

        {/* Changelog */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Changelog</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Version</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">0.1.0</td>
                  <td className="px-4 py-3 text-slate-600">June 2026</td>
                  <td className="px-4 py-3 text-slate-600">Decision trace section (WP-08). Intent capture routing — planned WP-14.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Review notice */}
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 mb-8">
          <strong>Owner review required</strong> before this spec page is published publicly.
          Trace schema and sample renderings are ready for review.
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-8 border-t border-slate-100">
          <Link
            href="/specs/0007-quote-integrity"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={14} />
            RAOS-0007 · Quote Integrity
          </Link>
          <Link
            href="/specs"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            All Specs
          </Link>
        </div>

      </div>
    </div>
  );
}
