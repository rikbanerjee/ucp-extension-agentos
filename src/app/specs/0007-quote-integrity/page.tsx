'use client';

import Link from 'next/link';
import { ArrowLeft, Lock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useView } from '@/lib/context/ViewContext';
import { TierBadge } from '../TierBadge';

// ---------------------------------------------------------------------------
// Reason code registry (RAOS-0007 §6)
// ---------------------------------------------------------------------------

const reasonCodes = [
  {
    code: 'QUOTE_ISSUED',
    namespace: '…quote',
    meaning: 'A QuoteToken was successfully issued. Emitted by the QUOTE-stage evaluator after all BLOCK checks pass and a signed token is produced. This is the affirmative signal that the agent\'s quoted price is locked.',
    severity: 'INFO',
    resolvable: false,
    resolution: null,
    syntheticOnly: true,
    syntheticNote: 'Only emitted by the QUOTE-stage evaluator (requires evaluateOffer pipeline). Not reachable from the static catalog fixture grid.',
  },
  {
    code: 'QUOTE_EXPIRED',
    namespace: '…quote',
    meaning: 'The quote has passed its TTL. Resolution depends on honorPolicy.onExpiry: \'requote\' → REQUOTE_REQUIRED; \'honor_grace\' + within grace → continue; \'honor_grace\' + past grace → REQUOTE_REQUIRED; \'reject\' → REJECTED.',
    severity: 'BLOCK',
    resolvable: true,
    resolution: 'Issue a fresh quote. The buyer must re-confirm the price.',
    syntheticOnly: true,
    syntheticNote: 'Requires two `now` values (issue + validate past TTL). Tested in quote.test.ts.',
  },
  {
    code: 'QUOTE_CONTEXT_CHANGED',
    namespace: '…quote',
    meaning: 'Either (a) the buyer\'s context hash differs between issue and validate time (tier downgraded, trust mode changed), or (b) the recomputed price at checkout time differs from the locked price (promo ended, price tier changed). Always REQUOTE_REQUIRED.',
    severity: 'BLOCK',
    resolvable: true,
    resolution: 'Issue a fresh quote with the current buyer context and current price.',
    syntheticOnly: true,
    syntheticNote: 'Requires context mutation or price change between issue and validate. Tested in quote.test.ts.',
  },
  {
    code: 'QUOTE_STOCK_LOST',
    namespace: '…quote',
    meaning: 'Stock is now insufficient for the quoted quantity. For onStockLoss=\'reject\': REJECTED. For onStockLoss=\'partial\' with zero available: also REJECTED.',
    severity: 'BLOCK',
    resolvable: false,
    resolution: null,
    syntheticOnly: true,
    syntheticNote: 'Requires a stock change between issue and validate. Tested in quote.test.ts.',
  },
  {
    code: 'QUOTE_PARTIALLY_HONORED',
    namespace: '…quote',
    meaning: 'Stock is short but the merchant\'s policy is onStockLoss=\'partial\'. The quote is honored for the available quantity. honoredQuantity is set in QuoteValidationResult. The agent must surface the partial fulfillment to the buyer before checkout.',
    severity: 'CONDITION',
    resolvable: true,
    resolution: 'Present the buyer with the partial quantity and new total. Allow them to accept or cancel.',
    syntheticOnly: true,
    syntheticNote: 'Requires partial stock state at validate time. Tested in quote.test.ts.',
  },
  {
    code: 'QUOTE_FORGED',
    namespace: '…quote',
    meaning: 'The RAOS-0008 signature verification failed (excluding DATA_STALE which falls through to the TTL check). The token payload was tampered with after signing. REJECTED — do not proceed to checkout.',
    severity: 'BLOCK',
    resolvable: false,
    resolution: null,
    syntheticOnly: true,
    syntheticNote: 'Requires injecting a tampered token (modified quoteId, unitPrice, etc.). Tested in quote.test.ts.',
  },
  {
    code: 'QUOTE_HONORED_GRACE',
    namespace: '…quote',
    meaning: 'The token is expired but still within the merchant\'s declared grace window (onExpiry=\'honor_grace\'). The quote is honored; this INFO code is prepended to the result reasons so the agent knows it is operating in grace. All remaining checks (steps 3–5) still run.',
    severity: 'INFO',
    resolvable: false,
    resolution: null,
    syntheticOnly: true,
    syntheticNote: 'Requires validate time in (TTL, TTL+graceSeconds] range. Tested in quote.test.ts.',
  },
];

const severityStyles: Record<string, string> = {
  INFO: 'bg-sky-50 text-sky-700 border border-sky-200',
  CONDITION: 'bg-amber-50 text-amber-700 border border-amber-200',
  BLOCK: 'bg-red-50 text-red-700 border border-red-200',
};

// ---------------------------------------------------------------------------
// Open Questions (RAOS-0007 §11)
// ---------------------------------------------------------------------------

const openQuestions = [
  {
    number: 1,
    question: 'Context hash scope — should appliedOffers be bound into the hash?',
    resolved: false,
    resolvedDate: null,
    body: 'The contextHash currently binds the buyer\'s privilege fields (tier, trust mode, region, etc.). If a promotional offer was active at issue time but ended before validation, the price recomputation (step 5) catches it. However, if the offer list changes without changing the recomputed price (e.g. a stackable offer is removed but a replacement promo produces the same total), step 5 would not detect it.',
    proposed: 'Leaning: keep appliedOffers out of the hash; price equality is the true invariant. An alternative is to hash appliedOffers ids — adds coverage but makes the hash context-sensitive to promo identifiers that may not be stable.',
  },
  {
    number: 2,
    question: 'onContextChange: should any merchant override be allowed?',
    resolved: false,
    resolvedDate: null,
    body: 'The spec mandates onContextChange: \'requote\' always. A merchant may argue that a minimal context change (e.g. shipping vs pickup mode but same price) should not invalidate a quote. This creates a class of \'quote-preserving context changes\'.',
    proposed: 'Defer to the first merchant integration that hits this. The current rule is the safe default. Relaxation requires a clear taxonomy of price-neutral context changes.',
  },
  {
    number: 3,
    question: 'Multi-variant quotes — quote one token per line item or one token per cart?',
    resolved: false,
    resolvedDate: null,
    body: 'The current model issues one QuoteToken per (variant, quantity, context). A B2B purchase order with 50 line items would require 50 tokens. A cart-level QuoteToken covering all items is more efficient but requires the hash to cover all line items. Multi-item quote semantics are not defined yet.',
    proposed: 'Per-item is the safe v1 model. Cart-level quote is a natural WP-12 (Cart & Checkout) concern. Keep them separate.',
  },
  {
    number: 4,
    question: 'What is the canonical onStockLoss=partial experience contract with the buyer?',
    resolved: false,
    resolvedDate: null,
    body: 'When QUOTE_PARTIALLY_HONORED fires, the agent must surface the partial fulfillment to the buyer. What must the agent say? What must the merchant provide? Is the new total automatically computed, or does the agent need to call getApplicablePrice again for the reduced quantity?',
    proposed: 'The agent should compute the new total as honoredQuantity × unitPrice (the locked unit price). The spec should mandate that the agent presents this before proceeding and requires an explicit buyer accept.',
  },
  {
    number: 5,
    question: 'Quote token storage — where does the agent store the token between issue and checkout?',
    resolved: false,
    resolvedDate: null,
    body: 'The current spec is silent on storage. An agent could store the QuoteToken in local state, a session store, or pass it opaquely to the merchant\'s cart/checkout endpoint. The merchant\'s checkout endpoint must be able to re-validate the token at checkout time.',
    proposed: 'Out of scope for RAOS-0007 (a storage and transport concern). RAOS-0010 (Cart & Checkout Handoff) should define the token transport contract.',
  },
  {
    number: 6,
    question: 'Grace window and DATA_STALE interaction',
    resolved: false,
    resolvedDate: null,
    body: 'When verifyEnvelope returns DATA_STALE (step 1), validateQuote falls through to the TTL/grace check (step 2). If the token is within its grace window, DATA_STALE would be silently absorbed. Should QUOTE_HONORED_GRACE always co-emit with DATA_STALE when the token envelope is stale?',
    proposed: 'Leaning: yes. Emit both. QUOTE_HONORED_GRACE documents the grace path; DATA_STALE on the inner envelope signals the signing key age. They are additive, not exclusive.',
  },
];

// ---------------------------------------------------------------------------
// Validation algorithm display
// ---------------------------------------------------------------------------

const validationSteps = [
  {
    step: 1,
    name: 'Signature',
    description: 'Call RAOS-0008 verifyEnvelope over all token fields except envelope. If !valid AND code !== \'DATA_STALE\' → REJECTED (QUOTE_FORGED). DATA_STALE falls through to step 2.',
    color: 'bg-red-100 text-red-800',
  },
  {
    step: 2,
    name: 'TTL / Grace Window',
    description: 'elapsed = (now − issuedAt) / 1000. If elapsed > ttlSeconds: apply honorPolicy.onExpiry (honor_grace → check grace; requote → REQUOTE_REQUIRED; reject → REJECTED). If within grace: emit QUOTE_HONORED_GRACE INFO and continue.',
    color: 'bg-amber-100 text-amber-800',
  },
  {
    step: 3,
    name: 'Context Hash',
    description: 'normalizeBuyerContext(currentContext) → buyerContextHash(). Compare to token.buyerContextHash. If mismatch → REQUOTE_REQUIRED (QUOTE_CONTEXT_CHANGED). No merchant override — context change always requires a new quote.',
    color: 'bg-blue-100 text-blue-800',
  },
  {
    step: 4,
    name: 'Stock',
    description: 'evaluateInventory(variant, context, [], now). If out_of_stock or short: apply honorPolicy.onStockLoss. \'reject\' → REJECTED (QUOTE_STOCK_LOST). \'partial\' + available > 0 → HONORED + QUOTE_PARTIALLY_HONORED. \'partial\' + 0 → REJECTED.',
    color: 'bg-purple-100 text-purple-800',
  },
  {
    step: 5,
    name: 'Price Recomputation',
    description: 'getApplicablePrice(variant, quantity, currentContext) → roundHalfUp(). If recomputedPrice ≠ token.unitPrice → REQUOTE_REQUIRED (QUOTE_CONTEXT_CHANGED). Catches promo end, tier change, member tier loss.',
    color: 'bg-indigo-100 text-indigo-800',
  },
];

const tokenShape = `// QuoteToken (RAOS-0007 §5.1)
{
  "quoteId":         "q_3fa7c2b1_106c3b",  // deterministic: djb2(merchant|variant|qty|ctxHash|bucket)
  "merchantId":      "m_wholesale_002",
  "variantId":       "v_w_001_1",
  "quantity":        100,
  "buyerContextHash": "a3f7c2d1",           // djb2(canonicalizePayload(privilegeFields, 'ctx'))
  "unitPrice":       310.00,                // roundHalfUp(priceState.unitPrice)
  "currency":        "USD",
  "appliedOffers":   [{ "type": "bulk_tier", "discount": 90.00 }],
  "issuedAt":        1718000000000,         // from injected now — never Date.now()
  "ttlSeconds":      600,
  "honorPolicy": {
    "onExpiry":      "requote",             // wholesale: strict
    "onStockLoss":   "reject",
    "onContextChange": "requote"            // always requote
  },
  "envelope": {                             // RAOS-0008 provenance
    "provenance": { "issuer": "...", "keyId": "k1", "signature": "sim:...", "trustMode": "asserted" },
    "freshness":  { "computedAt": 1718000000000, "ttlSeconds": 600 }
  }
}`;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function Spec0007Page() {
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

        {/* Title block */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-mono text-slate-400">RAOS-0007</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-semibold">
              Draft · RFC
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              v1.0.0 · June 2026
            </span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            Quote Integrity &amp; Price Lock
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl">
            A signed, TTL&apos;d price commitment binding variant + quantity + buyer-context hash + resolved price to a checkout window.
            Guarantees that the price the agent quoted is the price charged.
          </p>

          <TierBadge tier="Tier 2" tierName="Priced" version="1.0.0" adoptAnchor="tier-2" />
        </div>

        {/* Namespace */}
        <div className="mb-8 p-4 rounded-lg bg-slate-50 border border-slate-200 font-mono text-sm">
          <span className="text-slate-400">namespace: </span>
          <span className="text-indigo-700">com.os.retailagent.shopping.quote</span>
        </div>

        {/* The core promise */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Why this spec exists</h2>
          <p className="text-slate-600 mb-4">
            An AI shopping agent recommends Product A at $310.00. The buyer says &ldquo;add it to cart.&rdquo; At checkout, the price shows $349.00.
            This is the single fastest way to destroy buyer trust in an agent-powered commerce channel.
          </p>
          <p className="text-slate-600 mb-4">
            RAOS-0007 defines a <strong>QuoteToken</strong> — a signed object that binds a price to a specific buyer context, variant, and quantity,
            valid for a merchant-declared TTL. The checkout endpoint validates the token before processing. If the token is expired, the context changed,
            stock is gone, or the price drifted, the validation result tells the agent exactly why — and what to do.
          </p>
          <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-200 text-sm text-indigo-900">
            <strong>The retailer-trust unlock:</strong> once merchants declare and honor quote tokens, agents can confidently surface prices
            knowing the checkout experience will be consistent. Without this, every agent recommendation carries a price-drift disclaimer.
          </div>
        </section>

        {/* Five-step validation */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Checkout Validation — 5-step order</h2>
          <p className="text-slate-500 text-sm mb-5">
            The check order is non-negotiable — forgery detection must run before business-logic checks.
          </p>
          <div className="space-y-3">
            {validationSteps.map(step => (
              <div key={step.step} className="flex gap-4 items-start p-4 rounded-lg border border-slate-200 bg-white">
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step.color}`}>
                  {step.step}
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm mb-1">{step.name}</div>
                  <div className="text-slate-600 text-xs leading-relaxed">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Honor policies */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">HonorPolicy — merchant-declared</h2>
          <p className="text-slate-600 text-sm mb-4">
            Merchants declare their honor policy per-variant in the catalog. The policy is snapshotted into every issued token so
            validation always uses the policy that was in effect at issue time (not a live merchant lookup).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-white">
              <div className="font-semibold text-slate-800 text-sm mb-2">Wholesale B — Strict</div>
              <div className="space-y-1 text-xs font-mono">
                <div><span className="text-slate-400">onExpiry:</span> <span className="text-red-700">&quot;requote&quot;</span></div>
                <div><span className="text-slate-400">onStockLoss:</span> <span className="text-red-700">&quot;reject&quot;</span></div>
                <div><span className="text-slate-400">graceSeconds:</span> <span className="text-slate-500">undefined</span></div>
              </div>
              <p className="text-slate-500 text-xs mt-2">B2B context: predictable pricing, no surprises at PO time. Any expiry or stock loss requires a new quote.</p>
            </div>
            <div className="p-4 rounded-lg border border-amber-200 bg-amber-50">
              <div className="font-semibold text-slate-800 text-sm mb-2">Grocery Retail C — Consumer-friendly</div>
              <div className="space-y-1 text-xs font-mono">
                <div><span className="text-slate-400">onExpiry:</span> <span className="text-amber-700">&quot;honor_grace&quot;</span></div>
                <div><span className="text-slate-400">graceSeconds:</span> <span className="text-amber-700">120</span></div>
                <div><span className="text-slate-400">onStockLoss:</span> <span className="text-amber-700">&quot;partial&quot;</span></div>
              </div>
              <p className="text-slate-500 text-xs mt-2">Consumer grocery: honor within 2-minute grace window. Partial fulfillment rather than hard reject when stock runs short.</p>
            </div>
          </div>
        </section>

        {/* Token shape — technical only */}
        {isTechnical && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">QuoteToken Shape</h2>
            <pre className="bg-slate-900 text-slate-100 text-xs rounded-xl p-5 overflow-x-auto leading-relaxed whitespace-pre-wrap">
              {tokenShape}
            </pre>
            <p className="text-slate-500 text-xs mt-3">
              <strong>quoteId determinism:</strong> bucket = floor(issuedAt / (ttlSeconds × 1000)).
              Same (merchantId, variantId, qty, contextHash) within one bucket → same quoteId (idempotency; prevents quote farming).
              Different quantities or TTL buckets produce different quoteIds.
            </p>
          </section>
        )}

        {/* Reason codes */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Reason Code Registry</h2>
          <p className="text-slate-500 text-sm mb-5">
            All RAOS-0007 codes are synthetic-only — they require issueQuote + validateQuote with injected timestamps
            and cannot appear in the static catalog fixture grid. All are exercised in{' '}
            <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">src/lib/rules/__tests__/quote.test.ts</code>.
          </p>
          <div className="space-y-3">
            {reasonCodes.map(rc => (
              <div key={rc.code} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                  <code className="text-xs font-mono font-bold text-slate-900">{rc.code}</code>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${severityStyles[rc.severity]}`}>
                    {rc.severity}
                  </span>
                  {rc.syntheticOnly && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                      synthetic-only
                    </span>
                  )}
                </div>
                <div className="px-4 py-3 space-y-2">
                  <p className="text-sm text-slate-700">{rc.meaning}</p>
                  {rc.resolution && (
                    <p className="text-xs text-emerald-700 bg-emerald-50 rounded px-2.5 py-1.5">
                      <span className="font-semibold">Resolution:</span> {rc.resolution}
                    </p>
                  )}
                  {rc.syntheticNote && isTechnical && (
                    <p className="text-xs text-slate-400 italic">{rc.syntheticNote}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Open Questions */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Open Questions</h2>
          <p className="text-slate-500 text-sm mb-5">These are unresolved design decisions. Feedback welcome — open an issue or start a discussion.</p>
          <div className="space-y-4">
            {openQuestions.map(oq => (
              <div key={oq.number} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center">
                    {oq.number}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-800 text-sm mb-1">{oq.question}</div>
                    <p className="text-slate-600 text-xs mb-2 leading-relaxed">{oq.body}</p>
                    {oq.proposed && (
                      <p className="text-xs text-indigo-700 bg-indigo-50 rounded px-2.5 py-1.5">
                        <span className="font-semibold">Proposed direction:</span> {oq.proposed}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-8 border-t border-slate-100">
          <Link
            href="/specs/0002-contextual-pricing"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={14} />
            RAOS-0002 · Contextual Pricing
          </Link>
          <Link
            href="/specs"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors"
          >
            All Specs
            <ArrowLeft size={14} className="rotate-180" />
          </Link>
        </div>

      </div>
    </div>
  );
}
