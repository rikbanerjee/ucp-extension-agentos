'use client';

/**
 * /guided/platform — Commerce & Fulfilment Platforms guided demo.
 *
 * Compares three real candidate offers, evaluated by the actual reference
 * engine against ONE shared shopper context (guest, Hawaii, requesting
 * shipping) — deliberately chosen from the existing mock fixtures so the
 * three candidates land on three different, real outcomes:
 *   - Wholesale B / Ceramic Mugs (Pallet): BLOCKED — guest lacks the
 *     wholesale qualification the variant requires.
 *   - Grocery C / Fresh Organic Bananas: BLOCKED — this variant restricts
 *     both fulfilment mode and the buyer's region.
 *   - Grocery C / Granola: CAN PROCEED — no such restriction on this
 *     variant, and its weekly promo price applies.
 * No hardcoded outcomes — every status/price/reason below is read off the
 * real evaluateOffer() result.
 */

import { useMemo } from 'react';
import { evaluateOffer, buildDecisionTrace, renderBuyerTrace } from '@retailagentos/engine';
import { mockMerchants } from '@/lib/mock/merchants';
import { mockProducts } from '@/lib/mock/catalog';
import { merchantMeta } from '@/lib/mock/merchantMeta';
import { GuidedDemoShell, type GuidedNav } from '@/components/guided/GuidedDemoShell';
import { DemoRequest } from '@/components/guided/DemoRequest';
import { DemoResult, type DemoResultStatus } from '@/components/guided/DemoResult';
import { NextBestAction } from '@/components/guided/NextBestAction';
import { PLATFORM_MAILTO } from '@/lib/content/demoTracks';

const STORY_NOW = 0;

// Single shared shopper context — a guest in Hawaii requesting shipping.
// Every candidate below is evaluated against this exact same context.
const SHARED_CONTEXT = {
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

interface Candidate {
  merchantId: string;
  productId: string;
  variantId: string;
  quantity: number;
}

const CANDIDATES: Candidate[] = [
  { merchantId: 'm_wholesale_002', productId: 'p_w_002', variantId: 'v_w_002_1', quantity: 1 },
  { merchantId: 'm_grocery_003', productId: 'p_g_003', variantId: 'v_g_003_1', quantity: 1 },
  { merchantId: 'm_grocery_003', productId: 'p_g_005', variantId: 'v_g_005_1', quantity: 1 },
];

function evaluateCandidate({ merchantId, productId, variantId, quantity }: Candidate) {
  const merchant = mockMerchants.find((m) => m.merchantId === merchantId)!;
  const product = mockProducts.find((p) => p.id === productId)!;
  const variant = product.variants.find((v) => v.id === variantId)!;

  const record = evaluateOffer({ merchant, variant, quantity, context: SHARED_CONTEXT, now: STORY_NOW });
  const trace = buildDecisionTrace(record);
  const buyer = renderBuyerTrace(trace);

  const priceStage = record.stages['PRICE'];
  const priceResult = priceStage
    ? Object.values(priceStage).find((r) => r.output !== null && typeof (r.output as { unitPrice?: number })?.unitPrice === 'number')
    : undefined;
  const unitPrice = (priceResult?.output as { unitPrice?: number } | undefined)?.unitPrice;

  const status: DemoResultStatus = buyer.canPurchase ? 'proceed' : 'blocked';

  return {
    merchantName: merchantMeta[merchantId]?.humanName ?? merchant.merchantName,
    productTitle: product.title,
    status,
    unitPrice: buyer.canPurchase ? unitPrice ?? variant.basePrice : undefined,
    reason: buyer.detail || buyer.headline,
    headline: buyer.headline,
    nextStep: buyer.nextStep,
  };
}

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors shadow-sm min-h-[44px]"
      >
        {children}
      </button>
    </div>
  );
}

function ReferenceLabel() {
  return (
    <p className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
      Reference scenario using mock merchant data
    </p>
  );
}

export function PlatformTrack() {
  const candidates = useMemo(() => CANDIDATES.map(evaluateCandidate), []);
  const viable = candidates.find((c) => c.status === 'proceed');
  const blocked = candidates.filter((c) => c.status !== 'proceed');

  const scenes = [
    {
      stepLabel: 'Introduction',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-14 text-center space-y-6">
          <div className="inline-block rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 py-1">
            Commerce & Fulfilment Platforms
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            Different merchants. One consistent way to ask what can proceed.
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed max-w-xl mx-auto">
            Watch a shopping platform evaluate candidate offers before it creates a cart the
            merchant must reject.
          </p>
          <PrimaryButton onClick={nav.onNext}>Start the platform scenario →</PrimaryButton>
        </div>
      ),
    },
    {
      stepLabel: 'Request',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-7">
          <div className="text-center space-y-1">
            <div className="inline-block rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 py-1">
              Shopper request
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-3">One shopper, three candidate merchants</h2>
          </div>
          <DemoRequest
            eyebrow="Shopper context"
            query="A shopper on the platform is comparing offers across three merchants."
            items={[
              { label: 'Market / region', value: 'Hawaii (HI)' },
              { label: 'Customer type', value: 'Guest — no account claims' },
              { label: 'Requested fulfilment', value: 'Shipping' },
            ]}
          />
          <PrimaryButton onClick={nav.onNext}>Evaluate candidate offers →</PrimaryButton>
        </div>
      ),
    },
    {
      stepLabel: 'Decision',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <div className="text-center space-y-1">
            <div className="inline-block rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 py-1">
              Merchant comparison
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-3">Candidate offers considered for this shopper</h2>
          </div>
          <ReferenceLabel />
          <div className="space-y-3">
            {candidates.map((c) => (
              <DemoResult
                key={`${c.merchantName}-${c.productTitle}`}
                status={c.status}
                meta={c.merchantName}
                title={c.productTitle}
                subtitle={c.unitPrice !== undefined ? `$${c.unitPrice.toFixed(2)}` : undefined}
                reason={c.reason}
              />
            ))}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-center px-2">
            Same shopper, same moment — different merchants return different answers, each with
            its own real reason.
          </p>
          <PrimaryButton onClick={nav.onNext}>See the explainable result →</PrimaryButton>
        </div>
      ),
    },
    {
      stepLabel: 'Result',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
          <div className="text-center space-y-1">
            <div className="inline-block rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-widest px-3 py-1">
              Explainable result
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-3">
              {viable ? 'One offer can safely be shown to the shopper.' : 'No candidate can proceed as requested.'}
            </h2>
          </div>
          <ReferenceLabel />

          {viable && (
            <DemoResult
              status="proceed"
              meta={viable.merchantName}
              title={viable.productTitle}
              subtitle={viable.unitPrice !== undefined ? `$${viable.unitPrice.toFixed(2)}` : undefined}
              reason={`Safe to present: ${viable.reason}`}
            />
          )}

          <div className="space-y-3">
            {blocked.map((c) => (
              <div key={`${c.merchantName}-${c.productTitle}-excluded`} className="rounded-xl border border-slate-200 bg-white p-5 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{c.merchantName}</div>
                <div className="font-semibold text-slate-900 text-sm">{c.productTitle} — excluded</div>
                <p className="text-sm text-slate-600 leading-relaxed">{c.reason}</p>
                {c.nextStep && (
                  <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <span className="font-semibold text-slate-600">What would change this: </span>
                    {c.nextStep}
                  </p>
                )}
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-600 leading-relaxed text-center px-2">
            <span className="font-semibold text-slate-700">Business takeaway: </span>
            the platform receives an answer before building the cart — not a rejection after the
            customer commits. This reference scenario does not represent complete production-scale
            cart orchestration.
          </p>
          <PrimaryButton onClick={nav.onNext}>See what to do next →</PrimaryButton>
        </div>
      ),
    },
    {
      stepLabel: 'Next step',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10">
          <NextBestAction
            heading="Explore how this fits your merchant and fulfilment stack."
            body="Bring one merchant-rule problem that currently creates invalid carts, manual exceptions or late checkout failures."
            primaryLabel="Discuss a platform pilot"
            primaryHref={PLATFORM_MAILTO}
            secondaryLabel="Read the adoption guide"
            secondaryHref="/adopt"
            tertiaryLabel="Try another demo"
            tertiaryHref="/see-it-work"
            onReplay={nav.onRestart}
          />
        </div>
      ),
    },
  ];

  return <GuidedDemoShell trackLabel="Commerce & Fulfilment Platforms" duration="2 minutes" scenes={scenes} />;
}
