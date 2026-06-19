'use client';

/**
 * RAOS-0007 · Quote Integrity & Price Lock — Playground Demo
 *
 * Self-contained "Quote → time-travel → checkout" card for the Playground.
 * Does NOT modify or depend on global Playground state.
 *
 * Three-step flow:
 *   1. ISSUE   — pick a variant + context → call issueQuote → show QuoteToken
 *   2. ADVANCE — time-travel slider moves `now` forward past the TTL (and optionally
 *                into the grace window for grocery)
 *   3. VALIDATE — call validateQuote at the advanced time → show outcome
 *
 * Design constraints:
 *   - No Date.now() or new Date() — all `now` values are simulated from a fixed
 *     epoch offset so the demo is fully deterministic.
 *   - Merchant HonorPolicies are read directly from the variant.quoteConfig so
 *     they stay in sync with the catalog.
 *   - No backend calls — entirely client-side.
 */

import { useState, useMemo } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw, Lock, Unlock } from 'lucide-react';
import { issueQuote, validateQuote } from '@/lib/rules/quote';
import { normalizeBuyerContext } from '@/lib/rules/normalizeBuyerContext';
import { getApplicablePrice } from '@/lib/rules/pricing';
import { mockProducts } from '@/lib/mock/catalog';
import { mockMerchants } from '@/lib/mock/merchants';
import type { QuoteToken, QuoteValidationResult } from '@/lib/types/quote';
import type { DecisionRecord } from '@/lib/extensions/pipeline';
import type { NormalizedBuyerContext } from '@/lib/types/context';
import type { ComputedPriceState } from '@/lib/types/extensions';
import type { MerchantProfile } from '@/lib/types/core';
import { signEnvelope } from '@/lib/rules/trust';

// ---------------------------------------------------------------------------
// Fixed simulation epoch — all times are deterministic offsets from this value.
// Chosen to be a plausible future timestamp so quote IDs look realistic.
// ---------------------------------------------------------------------------

const SIM_EPOCH = 1_750_000_000_000; // ~June 2025

// ---------------------------------------------------------------------------
// Variant slots for the demo — the two catalog variants with quoteConfig
// ---------------------------------------------------------------------------

interface DemoSlot {
  variantId: string;
  productTitle: string;
  variantTitle: string;
  merchantId: string;
  merchantName: string;
  contextLabel: string;
  context: NormalizedBuyerContext;
  quantity: number;
  ttlSeconds: number;
  graceSummary: string;
}

const DEMO_SLOTS: DemoSlot[] = [
  {
    variantId: 'v_w_001_1',
    productTitle: 'Industrial Coffee Beans',
    variantTitle: '50lb Case',
    merchantId: 'm_wholesale_002',
    merchantName: 'Wholesale B',
    contextLabel: 'Wholesale distributor (signed)',
    context: normalizeBuyerContext({
      customerType: 'wholesale',
      membershipTier: 'distributor',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: true,
      taxExempt: false,
      resaleCertificateOnFile: true,
      trust: { mode: 'signed' },
    }),
    quantity: 100,
    ttlSeconds: 600,
    graceSummary: 'Strict: requote on expiry, reject on stock loss.',
  },
  {
    variantId: 'v_g_004_1',
    productTitle: 'Organic Whole Milk',
    variantTitle: 'Half Gallon',
    merchantId: 'm_grocery_003',
    merchantName: 'Grocery Retail C',
    contextLabel: 'Gold loyalty member (signed)',
    context: normalizeBuyerContext({
      customerType: 'member',
      membershipTier: 'gold',
      loyaltyTier: 'gold',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: true,
      taxExempt: false,
      resaleCertificateOnFile: false,
      trust: { mode: 'signed' },
    }),
    quantity: 6,
    ttlSeconds: 300,
    graceSummary: 'Consumer-friendly: 120s grace on expiry, partial honor on stock loss.',
  },
];

// Time-travel positions in seconds from issue time
const TIME_POSITIONS = [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600, 660, 720, 780, 840, 900];

// ---------------------------------------------------------------------------
// Build a minimal DecisionRecord for issueQuote
// ---------------------------------------------------------------------------

function buildDecisionRecord(
  slot: DemoSlot,
  priceState: ComputedPriceState,
  now: number,
  merchant: MerchantProfile,
): DecisionRecord {
  const envelope = signEnvelope(
    { inputsHash: 'sim' },
    'k1',
    now,
    merchant.endpoints.catalog,
    slot.ttlSeconds,
  );

  return {
    inputsHash: 'sim',
    stages: {
      ELIGIBILITY: {
        'com.os.retailagent.shopping.eligibility': {
          namespace: 'com.os.retailagent.shopping.eligibility',
          reasons: [],
          output: { status: 'ELIGIBLE', reasons: [] },
        },
      },
      PRICE: {
        'com.os.retailagent.shopping.pricing': {
          namespace: 'com.os.retailagent.shopping.pricing',
          reasons: [],
          output: priceState,
        },
      },
    },
    reasons: [],
    computedAt: now,
    normalizedContext: slot.context,
    envelope: {
      issuer: merchant.endpoints.catalog,
      keyId: 'k1',
      signature: envelope.provenance.signature,
      trustMode: 'asserted',
      computedAt: now,
      ttlSeconds: slot.ttlSeconds,
    },
  };
}

// ---------------------------------------------------------------------------
// Outcome badge
// ---------------------------------------------------------------------------

function OutcomeBadge({ outcome }: { outcome: QuoteValidationResult['outcome'] }) {
  if (outcome === 'HONORED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle className="w-3.5 h-3.5" />
        HONORED
      </span>
    );
  }
  if (outcome === 'REQUOTE_REQUIRED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <RefreshCw className="w-3.5 h-3.5" />
        REQUOTE REQUIRED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
      <XCircle className="w-3.5 h-3.5" />
      REJECTED
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main QuoteSimulator component
// ---------------------------------------------------------------------------

export function QuoteSimulator() {
  const [selectedSlotIdx, setSelectedSlotIdx] = useState(0);
  const [timeOffsetSeconds, setTimeOffsetSeconds] = useState(0);
  const [token, setToken] = useState<QuoteToken | null>(null);
  const [issueNow, setIssueNow] = useState<number>(SIM_EPOCH);
  const [validationResult, setValidationResult] = useState<QuoteValidationResult | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  const slot = DEMO_SLOTS[selectedSlotIdx];

  const variant = useMemo(() => {
    const product = mockProducts.find(p => p.variants.some(v => v.id === slot.variantId));
    return product?.variants.find(v => v.id === slot.variantId) ?? null;
  }, [slot.variantId]);

  const merchant = useMemo(() => {
    return mockMerchants.find(m => m.merchantId === slot.merchantId) ?? null;
  }, [slot.merchantId]);

  const priceState = useMemo<ComputedPriceState | null>(() => {
    if (!variant) return null;
    const price = getApplicablePrice(variant, slot.quantity, slot.context);
    return price;
  }, [variant, slot]);

  const validateNow = token ? token.issuedAt + timeOffsetSeconds * 1000 : 0;

  // Derive display state from token + timeOffset
  const elapsedSeconds = token ? (validateNow - token.issuedAt) / 1000 : 0;
  const isExpired = token ? elapsedSeconds > token.ttlSeconds : false;
  const isInGrace = isExpired && token?.honorPolicy.onExpiry === 'honor_grace'
    && elapsedSeconds <= token.ttlSeconds + (token.honorPolicy.graceSeconds ?? 0);
  const isPastGrace = isExpired && !isInGrace;

  function handleIssue() {
    if (!variant || !merchant || !priceState) return;
    setIssueError(null);
    setValidationResult(null);
    const now = SIM_EPOCH;
    setIssueNow(now);
    setTimeOffsetSeconds(0);

    if (!variant.quoteConfig) {
      setIssueError('Variant has no quoteConfig — cannot issue a quote.');
      return;
    }
    const record = buildDecisionRecord(slot, priceState, now, merchant);
    const newToken = issueQuote(
      record,
      variant.quoteConfig.honorPolicy,
      slot.merchantId,
      slot.variantId,
      slot.quantity,
      now,
    );

    if (!newToken) {
      setIssueError('Quote could not be issued. The buyer context may not be eligible for this variant.');
      setToken(null);
      return;
    }
    setToken(newToken);
  }

  function handleValidate() {
    if (!token || !variant || !merchant) return;
    const result = validateQuote(
      { token, context: slot.context, variant, merchant },
      validateNow,
    );
    setValidationResult(result);
  }

  function handleReset() {
    setToken(null);
    setValidationResult(null);
    setIssueError(null);
    setTimeOffsetSeconds(0);
  }

  const ttl = token?.ttlSeconds ?? slot.ttlSeconds;
  const graceSeconds = token?.honorPolicy?.graceSeconds ?? 0;

  // Tick marks for slider labeling
  function sliderLabel(offsetS: number): string | null {
    if (offsetS === 0) return '0s (fresh)';
    if (offsetS === ttl) return `${offsetS}s (TTL)`;
    if (graceSeconds > 0 && offsetS === ttl + graceSeconds) return `${offsetS}s (grace end)`;
    return null;
  }

  const maxSliderSeconds = graceSeconds > 0 ? ttl + graceSeconds + 120 : ttl + 120;

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Quote Integrity — Price Lock Demo</h3>
            <p className="text-xs text-slate-500 leading-none mt-0.5">RAOS-0007 · Issue a quote, time-travel, validate at checkout</p>
          </div>
        </div>
        {token && (
          <button
            onClick={handleReset}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline underline-offset-2"
          >
            Reset
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">

        {/* Step 1: Select variant + issue */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
            <span className="text-sm font-semibold text-slate-800">Issue a Quote</span>
          </div>

          {/* Variant selector */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {DEMO_SLOTS.map((s, i) => (
              <button
                key={s.variantId}
                onClick={() => { setSelectedSlotIdx(i); handleReset(); }}
                className={`text-left p-3 rounded-lg border text-xs transition-all ${
                  selectedSlotIdx === i
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="font-semibold text-[11px] mb-0.5">{s.merchantName}</div>
                <div className="font-medium">{s.productTitle}</div>
                <div className="text-slate-400 text-[10px] mt-0.5">{s.contextLabel}</div>
              </button>
            ))}
          </div>

          {/* Quote config summary */}
          {variant?.quoteConfig && (
            <div className="mb-3 text-[11px] text-slate-500 bg-slate-50 rounded-md px-3 py-2 border border-slate-100">
              <span className="font-semibold text-slate-700">Honor policy:</span>{' '}
              {slot.graceSummary}
              {' '}
              <span className="font-mono text-indigo-600">TTL={slot.ttlSeconds}s</span>
              {slot.ttlSeconds !== undefined && variant.quoteConfig.honorPolicy.graceSeconds && (
                <span className="font-mono text-amber-600"> grace={variant.quoteConfig.honorPolicy.graceSeconds}s</span>
              )}
            </div>
          )}

          {priceState && (
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="text-slate-600">Resolved price for qty {slot.quantity}:</span>
              <span className="font-bold text-slate-900">${priceState.unitPrice.toFixed(2)}</span>
              {priceState.priceSource !== 'base' && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium capitalize">
                  {priceState.priceSource.replace('_', ' ')}
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleIssue}
            disabled={!variant || !merchant || !priceState}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {token ? 'Re-issue Quote' : 'Issue Quote'}
          </button>

          {issueError && (
            <div className="mt-2 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md p-2.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {issueError}
            </div>
          )}
        </div>

        {/* Token display */}
        {token && (
          <>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-800">Quote Token Issued</span>
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">quoteId</span>
                  <span className="text-slate-900 font-semibold">{token.quoteId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">unitPrice</span>
                  <span className="text-slate-900">${token.unitPrice.toFixed(2)} × {token.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">contextHash</span>
                  <span className="text-slate-900">{token.buyerContextHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ttl</span>
                  <span className="text-slate-900">{token.ttlSeconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">onExpiry</span>
                  <span className={`${token.honorPolicy.onExpiry === 'honor_grace' ? 'text-amber-700' : 'text-red-700'}`}>
                    {token.honorPolicy.onExpiry}
                    {token.honorPolicy.graceSeconds ? ` (+${token.honorPolicy.graceSeconds}s grace)` : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">signature</span>
                  <span className="text-slate-600 truncate max-w-[120px]">{token.envelope.provenance.signature}</span>
                </div>
              </div>
            </div>

            {/* Step 2: Time travel */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                <span className="text-sm font-semibold text-slate-800">Time Travel</span>
              </div>

              {/* Time indicator */}
              <div className="mb-3 flex items-center justify-between text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Simulated time:</span>
                  <span className="font-semibold">
                    +{timeOffsetSeconds}s from issue
                  </span>
                </div>
                <div>
                  {timeOffsetSeconds === 0 && (
                    <span className="text-emerald-600 font-medium">Fresh</span>
                  )}
                  {isExpired && !isInGrace && (
                    <span className="text-red-600 font-medium">Expired</span>
                  )}
                  {isInGrace && (
                    <span className="text-amber-600 font-medium">In Grace Window</span>
                  )}
                  {!isExpired && timeOffsetSeconds > 0 && (
                    <span className="text-emerald-600 font-medium">Within TTL ({ttl - timeOffsetSeconds}s left)</span>
                  )}
                </div>
              </div>

              {/* Slider */}
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={maxSliderSeconds}
                  step={30}
                  value={timeOffsetSeconds}
                  onChange={e => {
                    setTimeOffsetSeconds(Number(e.target.value));
                    setValidationResult(null);
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200"
                  style={{
                    background: `linear-gradient(to right, ${
                      isInGrace ? '#f59e0b' : isExpired ? '#ef4444' : '#4f46e5'
                    } 0%, ${
                      isInGrace ? '#f59e0b' : isExpired ? '#ef4444' : '#4f46e5'
                    } ${(timeOffsetSeconds / maxSliderSeconds) * 100}%, #e2e8f0 ${(timeOffsetSeconds / maxSliderSeconds) * 100}%, #e2e8f0 100%)`,
                  }}
                />
                {/* TTL and grace markers */}
                <div className="relative mt-1 h-4">
                  {[ttl, graceSeconds > 0 ? ttl + graceSeconds : null].filter(Boolean).map(markS => (
                    <div
                      key={markS}
                      className="absolute transform -translate-x-1/2"
                      style={{ left: `${((markS as number) / maxSliderSeconds) * 100}%` }}
                    >
                      <div className="text-[9px] text-slate-400 font-mono whitespace-nowrap">
                        {markS === ttl ? `TTL ${ttl}s` : `grace end ${markS}s`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick jump buttons */}
              <div className="flex gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => { setTimeOffsetSeconds(0); setValidationResult(null); }}
                  className="text-xs px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  Fresh (0s)
                </button>
                <button
                  onClick={() => { setTimeOffsetSeconds(ttl - 1); setValidationResult(null); }}
                  className="text-xs px-2.5 py-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  1s before TTL
                </button>
                <button
                  onClick={() => { setTimeOffsetSeconds(ttl + 1); setValidationResult(null); }}
                  className="text-xs px-2.5 py-1 rounded-md border border-slate-200 hover:bg-emerald-50 border-amber-200 text-amber-700 transition-colors"
                >
                  1s past TTL
                </button>
                {graceSeconds > 0 && (
                  <>
                    <button
                      onClick={() => { setTimeOffsetSeconds(ttl + Math.floor(graceSeconds / 2)); setValidationResult(null); }}
                      className="text-xs px-2.5 py-1 rounded-md border border-amber-200 hover:bg-amber-50 text-amber-700 transition-colors"
                    >
                      Mid-grace
                    </button>
                    <button
                      onClick={() => { setTimeOffsetSeconds(ttl + graceSeconds + 1); setValidationResult(null); }}
                      className="text-xs px-2.5 py-1 rounded-md border border-red-200 hover:bg-red-50 text-red-700 transition-colors"
                    >
                      Past grace
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Step 3: Validate */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                <span className="text-sm font-semibold text-slate-800">Validate at Checkout</span>
              </div>

              <button
                onClick={handleValidate}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isExpired ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                Validate Quote ({timeOffsetSeconds === 0 ? 'at issue time' : `+${timeOffsetSeconds}s`})
              </button>

              {validationResult && (
                <div className={`mt-3 rounded-lg border p-3 ${
                  validationResult.outcome === 'HONORED'
                    ? 'border-emerald-200 bg-emerald-50'
                    : validationResult.outcome === 'REQUOTE_REQUIRED'
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <OutcomeBadge outcome={validationResult.outcome} />
                    {validationResult.honoredQuantity !== undefined && (
                      <span className="text-xs text-amber-700 font-medium">
                        Partial: {validationResult.honoredQuantity} / {token.quantity} units
                      </span>
                    )}
                  </div>

                  {validationResult.reasons.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {validationResult.reasons.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-[11px]">
                          <span className={`mt-0.5 flex-shrink-0 font-mono font-semibold ${
                            r.severity === 'BLOCK' ? 'text-red-600'
                            : r.severity === 'CONDITION' ? 'text-amber-600'
                            : 'text-emerald-600'
                          }`}>
                            {r.code}
                          </span>
                          <span className="text-slate-600">{r.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {validationResult.outcome === 'HONORED' && validationResult.reasons.length === 0 && (
                    <p className="text-xs text-emerald-700 mt-1">
                      All 5 checks passed. Price lock holds — proceed to checkout.
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-400">
        <span className="font-semibold text-slate-500">RAOS-0007</span> — 5-step validation order: signature → TTL/grace → context hash → stock → price recomputation.
        {' '}Wholesale uses strict requote; Grocery uses 120s consumer grace window.
      </div>
    </div>
  );
}
