'use client';

/**
 * /guided — Story mode
 *
 * Five scenes: Hook → World A dead end → World B (the aha) →
 *   Scene 3: three mini-scenes ("it's not just gating") →
 *   Scene 4: the audience fork.
 *
 * P0 (Scenes 0–2): wholesale gating scenario. One evaluateOffer call, memoized.
 * P1 (Scenes 3–4): three grocery mini-scenarios + audience chooser.
 *
 * Fixed inputs (STORY_NOW = 0 — never Date.now()):
 *
 * Scene 1/2 (wholesale gate):
 *   merchant = m_wholesale_002 / variant = v_w_002_1 / plain guest
 *
 * Scene 3, Tab 1 (promo price upfront):
 *   merchant = m_grocery_003 / variant = v_g_005_1 (Granola — promoPricing + memberPricing)
 *   context  = guest / local_delivery / US
 *   Expected: promo salePrice $3.99 (last-wins over base $5.49 and asserted-downgraded member)
 *
 * Scene 3, Tab 2 (region/fulfillment block):
 *   merchant = m_grocery_003 / variant = v_g_003_1 (Bananas — restrictedRegions:['HI','AK'])
 *   context  = guest / shipping / HI
 *   Expected: REGION_RESTRICTED BLOCK surfaced via renderBuyerTrace → BuyerDecisionCard
 *
 * Scene 3, Tab 3 (quote lock):
 *   merchant = m_grocery_003 / variant = v_g_004_1 (Organic Milk — quoteConfig)
 *   context  = guest / local_delivery / US (no eligibility gate → no BLOCK → quote issues)
 *   issueQuote at STORY_NOW → validateQuote at STORY_NOW → HONORED
 *   Expected: unitPrice $4.99, outcome HONORED
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { evaluateOffer, buildDecisionTrace, renderBuyerTrace, issueQuote, validateQuote } from '@retailagentos/engine';
import { mockMerchants } from '@/lib/mock/merchants';
import { mockProducts } from '@/lib/mock/catalog';
import { BuyerDecisionCard } from '@/components/demo/BuyerDecisionCard';

// ─── Fixed story constants ────────────────────────────────────────────────────

/** Fixed epoch — deterministic, never Date.now() */
const STORY_NOW = 0;

// Scene 1/2: wholesale gating scenario
const STORY_MERCHANT_ID = 'm_wholesale_002';
const STORY_PRODUCT_ID = 'p_w_002';
const STORY_VARIANT_ID = 'v_w_002_1';

/** Plain guest shopper — no wholesale account, no resale certificate. */
const STORY_CONTEXT = {
  customerType: 'guest' as const,
  membershipTier: 'none' as const,
  loyaltyTier: 'guest' as const,
  marketRegion: 'US',
  fulfillmentMode: 'shipping' as const,
  accountLinked: false,
  taxExempt: false,
  resaleCertificateOnFile: false,
  trust: { mode: 'asserted' as const },
};

// Scene 3, Tab 1: Granola — promo pricing
const S3_T1_MERCHANT_ID = 'm_grocery_003';
const S3_T1_PRODUCT_ID = 'p_g_005';   // Granola (Member + Weekly Ad)
const S3_T1_VARIANT_ID = 'v_g_005_1'; // promoPricing.salePrice=3.99, basePrice=5.49

// Scene 3, Tab 2: Bananas — region/fulfillment block
const S3_T2_PRODUCT_ID = 'p_g_003';   // Fresh Organic Bananas
const S3_T2_VARIANT_ID = 'v_g_003_1'; // restrictedRegions:['HI','AK']

// Scene 3, Tab 3: Organic Milk — quote lock
const S3_T3_PRODUCT_ID = 'p_g_004';   // Organic Whole Milk
const S3_T3_VARIANT_ID = 'v_g_004_1'; // quoteConfig present

/** Grocery guest context — no privilege claims (no member pricing, no trust upgrade).
 *  Promo pricing is NOT a privilege claim, so it applies regardless. */
const S3_GUEST_CONTEXT_US = {
  customerType: 'guest' as const,
  membershipTier: 'none' as const,
  loyaltyTier: 'guest' as const,
  marketRegion: 'US',
  fulfillmentMode: 'local_delivery' as const,
  accountLinked: false,
  taxExempt: false,
  resaleCertificateOnFile: false,
  trust: { mode: 'asserted' as const },
};

/** Tab 2: shopper in Hawaii asking for shipping — triggers REGION_RESTRICTED. */
const S3_T2_CONTEXT_HI = {
  customerType: 'guest' as const,
  membershipTier: 'none' as const,
  loyaltyTier: 'guest' as const,
  marketRegion: 'HI',
  fulfillmentMode: 'shipping' as const,
  accountLinked: false,
  taxExempt: false,
  resaleCertificateOnFile: false,
  trust: { mode: 'asserted' as const },
};

// ─── Scene type ───────────────────────────────────────────────────────────────

type Scene = 0 | 1 | 2 | 3 | 4;

// ─── Chat bubble helpers ──────────────────────────────────────────────────────

function AgentBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-slate-800 text-white px-4 py-2.5 text-sm leading-relaxed shadow-sm">
        {children}
      </div>
    </div>
  );
}

function StoreBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-white border border-slate-200 text-slate-800 px-4 py-2.5 text-sm leading-relaxed shadow-sm">
        {children}
      </div>
    </div>
  );
}

function ChatLabel({ side, label }: { side: 'agent' | 'store'; label: string }) {
  return (
    <div
      className={`text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 ${
        side === 'agent' ? 'text-right' : 'text-left'
      }`}
    >
      {label}
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ scene }: { scene: Scene }) {
  return (
    <div className="flex justify-center gap-2 py-4">
      {([0, 1, 2, 3, 4] as Scene[]).map(s => (
        <span
          key={s}
          className={`w-2 h-2 rounded-full transition-colors ${
            s === scene ? 'bg-slate-900' : 'bg-slate-300'
          }`}
        />
      ))}
    </div>
  );
}

// ─── Scene 0 — Hook ───────────────────────────────────────────────────────────

function Scene0({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
          Watch an AI agent shop — once the old way, once the RetailAgentOS way.
        </h1>
        <p className="text-xl text-slate-500 leading-relaxed">
          Same shopper. Same store. Two very different endings.
        </p>
        <button
          onClick={onNext}
          className="mt-4 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors shadow-sm"
        >
          Show me →
        </button>
      </div>
    </div>
  );
}

// ─── Scene 1 — World A (today's dead end) ────────────────────────────────────

function Scene1({
  productTitle,
  governingMessage,
  onNext,
}: {
  productTitle: string;
  governingMessage: string;
  onNext: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Scene label */}
      <div className="text-center space-y-1">
        <div className="inline-block rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold uppercase tracking-widest px-3 py-1">
          World A — today
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mt-3">The dead end</h2>
        <p className="text-slate-500 text-sm">
          The agent shops the way most agents do right now.
        </p>
      </div>

      {/* Chat thread */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200">
          Chat thread
        </div>

        <div>
          <ChatLabel side="agent" label="Shopping agent" />
          <AgentBubble>Add the {productTitle} to my cart.</AgentBubble>
        </div>

        <div>
          <ChatLabel side="store" label="Store" />
          <StoreBubble>Added! Ready to check out?</StoreBubble>
        </div>

        <div>
          <ChatLabel side="agent" label="Shopping agent" />
          <AgentBubble>Checking out now.</AgentBubble>
        </div>

        {/* Hard checkout rejection — real governing reason message */}
        <div className="rounded-xl bg-rose-50 border border-rose-300 px-4 py-4 mt-2">
          <div className="flex items-start gap-3">
            <span className="text-xl leading-none">✕</span>
            <div>
              <div className="font-semibold text-rose-700 text-sm">
                Order rejected — {governingMessage}
              </div>
              <div className="text-rose-500 text-xs mt-0.5">
                Checkout blocked. Purchase could not be completed.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="text-sm text-slate-600 leading-relaxed text-center px-2">
        The agent only found out at the very end. The shopper&rsquo;s trip was wasted
        — and there&rsquo;s no obvious way forward.
      </p>

      <div className="flex justify-center">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors shadow-sm"
        >
          Now the RetailAgentOS way →
        </button>
      </div>
    </div>
  );
}

// ─── Scene 2 — World B (the aha) ─────────────────────────────────────────────

function Scene2({
  productTitle,
  buyerView,
  onNext,
}: {
  productTitle: string;
  buyerView: ReturnType<typeof renderBuyerTrace>;
  onNext: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Scene label */}
      <div className="text-center space-y-1">
        <div className="inline-block rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-widest px-3 py-1">
          World B — RetailAgentOS
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mt-3">The upfront answer</h2>
        <p className="text-slate-500 text-sm">
          Same request. The agent knows before it ever recommends the item.
        </p>
      </div>

      {/* Chat thread with real buyer decision card */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200">
          Chat thread
        </div>

        <div>
          <ChatLabel side="agent" label="Shopping agent" />
          <AgentBubble>Add the {productTitle} to my cart.</AgentBubble>
        </div>

        {/* Real buyer decision card — amber/informative, not red panic */}
        <BuyerDecisionCard view={buyerView} theme="light" />
      </div>

      {/* Caption */}
      <p className="text-sm text-slate-600 leading-relaxed text-center px-2">
        The agent knew before it ever recommended the item — and it can tell the
        shopper exactly how to unlock it. No dead end, no wasted trip.
      </p>

      {/* What changed? expander */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>What changed?</span>
          <span className="text-slate-400 text-base leading-none">
            {expanded ? '▲' : '▼'}
          </span>
        </button>
        {expanded && (
          <div className="px-5 pb-4 pt-1 space-y-2 border-t border-slate-100">
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <span className="shrink-0 font-semibold text-rose-500">Before:</span>
              <span>
                The rules lived at checkout. Agents discovered them by failing.
              </span>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <span className="shrink-0 font-semibold text-emerald-600">After:</span>
              <span>The rules live in the catalog. Agents read them upfront.</span>
            </div>
          </div>
        )}
      </div>

      {/* CTA to Scene 3 */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors shadow-sm"
        >
          See what else the agent knows →
        </button>
      </div>
    </div>
  );
}

// ─── Scene 3 — Mini-scenes ("it's not just gating") ──────────────────────────

type MiniTab = 0 | 1 | 2;

interface Scene3Props {
  tab1: {
    productTitle: string;
    promoPrice: number;
    basePrice: number;
  };
  tab2: {
    productTitle: string;
    buyerView: ReturnType<typeof renderBuyerTrace>;
  };
  tab3: {
    productTitle: string;
    quotedPrice: number;
    quoteOutcome: 'HONORED' | 'REJECTED' | 'REQUOTE_REQUIRED';
  };
  onNext: () => void;
}

function Scene3({ tab1, tab2, tab3, onNext }: Scene3Props) {
  const [activeTab, setActiveTab] = useState<MiniTab>(0);

  const tabs: { id: MiniTab; label: string }[] = [
    { id: 0, label: 'Right price, upfront' },
    { id: 1, label: 'Can it ship here?' },
    { id: 2, label: 'Will the quote hold?' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Scene label */}
      <div className="text-center space-y-1">
        <div className="inline-block rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 py-1">
          It&rsquo;s not just gating
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mt-3">
          The agent knew all of this upfront.
        </h2>
        <p className="text-slate-500 text-sm">
          Three more things most shopping agents get wrong — until the rules are in the catalog.
        </p>
      </div>

      {/* Tab bar */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex border-b border-slate-200">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors border-r border-slate-200 last:border-r-0 ${
                activeTab === id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab 0: Right price, upfront */}
        {activeTab === 0 && (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🏷️</span>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  Before adding to cart
                </span>
              </div>
              <div className="font-semibold text-slate-900 text-base leading-snug">
                {tab1.productTitle} is on sale this week.
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-emerald-700">
                  ${tab1.promoPrice.toFixed(2)}
                </span>
                <span className="text-sm text-slate-400 line-through">
                  was ${tab1.basePrice.toFixed(2)}
                </span>
              </div>
              <div className="text-sm text-slate-600">
                Weekly sale price — no membership needed.
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed text-center px-2">
              The agent sees this week&rsquo;s sale price at browse time, not as a surprise
              at checkout.
            </p>
          </div>
        )}

        {/* Tab 1: Can it ship here? */}
        {activeTab === 1 && (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-3">
              <div>
                <ChatLabel side="agent" label="Shopping agent" />
                <AgentBubble>Add {tab2.productTitle} — ship to Hawaii.</AgentBubble>
              </div>
              <BuyerDecisionCard view={tab2.buyerView} theme="light" />
            </div>
            <p className="text-sm text-slate-600 leading-relaxed text-center px-2">
              The agent learns it can&rsquo;t be delivered before recommending it — not
              after the shopper tries to check out.
            </p>
          </div>
        )}

        {/* Tab 2: Will the quote hold? */}
        {activeTab === 2 && (
          <div className="p-5 space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🔒</span>
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  Price locked in
                </span>
              </div>
              <div className="font-semibold text-slate-900 text-base leading-snug">
                {tab3.productTitle}
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-emerald-700">
                  ${tab3.quotedPrice.toFixed(2)}
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    tab3.quoteOutcome === 'HONORED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {tab3.quoteOutcome === 'HONORED' ? 'HONORED' : tab3.quoteOutcome}
                </span>
              </div>
              <div className="text-sm text-slate-700">
                The price the agent showed is the price you&rsquo;re charged — locked in when
                the agent browses, honored at checkout.
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed text-center px-2">
              No bait-and-switch. The store commits to the price the agent quoted.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors shadow-sm"
        >
          See what to do next →
        </button>
      </div>
    </div>
  );
}

// ─── Scene 4 — Audience fork ──────────────────────────────────────────────────

function Scene4({ onReplay }: { onReplay: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Headline */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">
          That&rsquo;s the idea. Want to go deeper?
        </h2>
        <p className="text-slate-500 text-sm">
          Pick the path that fits where you&rsquo;re coming from.
        </p>
      </div>

      {/* Two choice cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Merchant path */}
        <Link
          href="/for-merchants"
          className="group block rounded-2xl border border-slate-200 bg-white p-6 hover:border-emerald-400 hover:shadow-md transition-all space-y-3"
        >
          <div className="text-2xl">🏪</div>
          <div>
            <div className="font-bold text-slate-900 text-lg leading-snug">
              I run a store
            </div>
            <div className="text-sm text-slate-500 mt-1 leading-relaxed">
              What you&rsquo;d configure, what it saves you — and why your shoppers
              stop hitting dead ends.
            </div>
          </div>
          <div className="text-sm font-semibold text-emerald-600 group-hover:text-emerald-700 transition-colors">
            For retailers →
          </div>
        </Link>

        {/* Builder path */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
          <div className="text-2xl">⚙️</div>
          <div>
            <div className="font-bold text-slate-900 text-lg leading-snug">
              I build the tech
            </div>
            <div className="text-sm text-slate-500 mt-1 leading-relaxed">
              See the live rules engine. Mutate buyer context, watch pricing and
              availability respond in real time.
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Link
              href="/demo"
              className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Open the live engine →
            </Link>
            <Link
              href="/sandbox/reference"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              or browse the implementation cookbook
            </Link>
          </div>
        </div>
      </div>

      {/* Replay */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onReplay}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors underline underline-offset-2"
        >
          ↩ Replay from the beginning
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuidedPage() {
  const [scene, setScene] = useState<Scene>(0);

  // ── Scene 1/2: wholesale gate ─────────────────────────────────────────────
  // ONE pipeline call — both World A and World B derive from this same result.
  const { productTitle, buyerView, governingMessage } = useMemo(() => {
    const merchant = mockMerchants.find(m => m.merchantId === STORY_MERCHANT_ID)!;
    const product = mockProducts.find(p => p.id === STORY_PRODUCT_ID)!;
    const variant = product.variants.find(v => v.id === STORY_VARIANT_ID)!;

    const record = evaluateOffer({
      merchant,
      variant,
      quantity: 1,
      context: STORY_CONTEXT,
      now: STORY_NOW,
    });

    const trace = buildDecisionTrace(record);
    const buyer = renderBuyerTrace(trace);

    // The governing message for World A's rejection block — from the real pipeline.
    const blockReason = record.reasons.find(r => r.severity === 'BLOCK');
    const governing = blockReason?.message ?? buyer.headline;

    return {
      productTitle: product.title,
      buyerView: buyer,
      governingMessage: governing,
    };
  }, []);

  // ── Scene 3, Tab 1: promo price ───────────────────────────────────────────
  const tab1Data = useMemo(() => {
    const merchant = mockMerchants.find(m => m.merchantId === S3_T1_MERCHANT_ID)!;
    const product = mockProducts.find(p => p.id === S3_T1_PRODUCT_ID)!;
    const variant = product.variants.find(v => v.id === S3_T1_VARIANT_ID)!;

    const record = evaluateOffer({
      merchant,
      variant,
      quantity: 1,
      context: S3_GUEST_CONTEXT_US,
      now: STORY_NOW,
    });

    // Extract PRICE stage result for the unit price
    const priceStage = record.stages['PRICE'];
    const priceResult = priceStage
      ? Object.values(priceStage).find(
          r => r.output !== null && typeof (r.output as { unitPrice?: number })?.unitPrice === 'number',
        )
      : undefined;
    const unitPrice = (priceResult?.output as { unitPrice?: number } | undefined)?.unitPrice ?? variant.basePrice;

    return {
      productTitle: product.title,
      promoPrice: unitPrice,
      basePrice: variant.basePrice,
    };
  }, []);

  // ── Scene 3, Tab 2: region block ──────────────────────────────────────────
  const tab2Data = useMemo(() => {
    const merchant = mockMerchants.find(m => m.merchantId === S3_T1_MERCHANT_ID)!;
    const product = mockProducts.find(p => p.id === S3_T2_PRODUCT_ID)!;
    const variant = product.variants.find(v => v.id === S3_T2_VARIANT_ID)!;

    const record = evaluateOffer({
      merchant,
      variant,
      quantity: 1,
      context: S3_T2_CONTEXT_HI,
      now: STORY_NOW,
    });

    const trace = buildDecisionTrace(record);
    const buyer = renderBuyerTrace(trace);

    return {
      productTitle: product.title,
      buyerView: buyer,
    };
  }, []);

  // ── Scene 3, Tab 3: quote lock ────────────────────────────────────────────
  const tab3Data = useMemo(() => {
    const merchant = mockMerchants.find(m => m.merchantId === S3_T1_MERCHANT_ID)!;
    const product = mockProducts.find(p => p.id === S3_T3_PRODUCT_ID)!;
    const variant = product.variants.find(v => v.id === S3_T3_VARIANT_ID)!;

    const record = evaluateOffer({
      merchant,
      variant,
      quantity: 1,
      context: S3_GUEST_CONTEXT_US,
      now: STORY_NOW,
    });

    // Issue a real quote at STORY_NOW using the grocery honor policy from the variant
    const honorPolicy = variant.quoteConfig!.honorPolicy;
    const token = issueQuote(
      record,
      honorPolicy,
      S3_T1_MERCHANT_ID,
      S3_T3_VARIANT_ID,
      1,
      STORY_NOW,
    );

    if (!token) {
      // Defensive fallback — if the quote couldn't issue, show base price with no outcome
      return {
        productTitle: product.title,
        quotedPrice: variant.basePrice,
        quoteOutcome: 'REQUOTE_REQUIRED' as const,
      };
    }

    // Validate at the same fixed time — zero elapsed, well within TTL
    const validation = validateQuote(
      { token, context: S3_GUEST_CONTEXT_US, variant, merchant },
      STORY_NOW,
    );

    return {
      productTitle: product.title,
      quotedPrice: token.unitPrice,
      quoteOutcome: validation.outcome,
    };
  }, []);

  const goNext = () => setScene(s => Math.min(s + 1, 4) as Scene);
  const replay = () => setScene(0);

  return (
    <div className="min-h-full bg-slate-50">
      <ProgressDots scene={scene} />

      <div className="transition-opacity duration-200">
        {scene === 0 && <Scene0 onNext={goNext} />}
        {scene === 1 && (
          <Scene1
            productTitle={productTitle}
            governingMessage={governingMessage}
            onNext={goNext}
          />
        )}
        {scene === 2 && (
          <Scene2
            productTitle={productTitle}
            buyerView={buyerView}
            onNext={goNext}
          />
        )}
        {scene === 3 && (
          <Scene3
            tab1={tab1Data}
            tab2={tab2Data}
            tab3={tab3Data}
            onNext={goNext}
          />
        )}
        {scene === 4 && <Scene4 onReplay={replay} />}
      </div>
    </div>
  );
}
