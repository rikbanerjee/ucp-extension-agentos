'use client';

/**
 * /guided/enterprise — Enterprise Retail Leaders guided demo.
 *
 * Reuses the wholesale-qualification scenario from the original /guided
 * story mode (m_wholesale_002 / p_w_002 / v_w_002_1, plain guest context).
 * One evaluateOffer call, memoized — both the "without RetailAgentOS" and
 * "with RetailAgentOS" scenes render from the same real decision.
 */

import { useMemo } from 'react';
import { evaluateOffer, buildDecisionTrace, renderBuyerTrace } from '@retailagentos/engine';
import { mockMerchants } from '@/lib/mock/merchants';
import { mockProducts } from '@/lib/mock/catalog';
import { merchantMeta } from '@/lib/mock/merchantMeta';
import { BuyerDecisionCard } from '@/components/demo/BuyerDecisionCard';
import { GuidedDemoShell, type GuidedNav } from '@/components/guided/GuidedDemoShell';
import { DemoRequest } from '@/components/guided/DemoRequest';
import { NextBestAction } from '@/components/guided/NextBestAction';
import { ENTERPRISE_MAILTO } from '@/lib/content/demoTracks';

const STORY_NOW = 0;
const MERCHANT_ID = 'm_wholesale_002';
const PRODUCT_ID = 'p_w_002';
const VARIANT_ID = 'v_w_002_1';

const GUEST_CONTEXT = {
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
    <div className={`text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 ${side === 'agent' ? 'text-right' : 'text-left'}`}>
      {label}
    </div>
  );
}

function SceneShell({ eyebrow, tone, title, subtitle, children }: {
  eyebrow: string;
  tone: 'neutral' | 'rose' | 'emerald';
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'rose'
      ? 'bg-rose-50 border-rose-200 text-rose-600'
      : tone === 'emerald'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
      : 'bg-slate-100 border-slate-200 text-slate-600';
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-7">
      <div className="text-center space-y-1">
        <div className={`inline-block rounded-full border text-xs font-semibold uppercase tracking-widest px-3 py-1 ${toneClass}`}>
          {eyebrow}
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mt-3">{title}</h2>
        <p className="text-slate-500 text-sm">{subtitle}</p>
      </div>
      {children}
    </div>
  );
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

export function EnterpriseTrack() {
  const { productTitle, merchantName, buyerView, governingMessage } = useMemo(() => {
    const merchant = mockMerchants.find((m) => m.merchantId === MERCHANT_ID)!;
    const product = mockProducts.find((p) => p.id === PRODUCT_ID)!;
    const variant = product.variants.find((v) => v.id === VARIANT_ID)!;

    const record = evaluateOffer({ merchant, variant, quantity: 1, context: GUEST_CONTEXT, now: STORY_NOW });
    const trace = buildDecisionTrace(record);
    const buyer = renderBuyerTrace(trace);
    const blockReason = record.reasons.find((r) => r.severity === 'BLOCK');

    return {
      productTitle: product.title,
      merchantName: merchantMeta[MERCHANT_ID]?.humanName ?? merchant.merchantName,
      buyerView: buyer,
      governingMessage: blockReason?.message ?? buyer.headline,
    };
  }, []);

  const scenes = [
    {
      stepLabel: 'Introduction',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-14 text-center space-y-6">
          <div className="inline-block rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 py-1">
            Enterprise Retail
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            The same retail policy should produce the same answer in every AI channel.
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed max-w-xl mx-auto">
            Watch what happens when an AI assistant tries to purchase an offer that requires
            customer qualification.
          </p>
          <PrimaryButton onClick={nav.onNext}>Start the scenario →</PrimaryButton>
        </div>
      ),
    },
    {
      stepLabel: 'Request',
      render: (nav: GuidedNav) => (
        <SceneShell
          eyebrow="The request"
          tone="neutral"
          title="A shopper asks an AI assistant to buy this"
          subtitle="Here's everything the agent knows about the buyer before it acts."
        >
          <DemoRequest
            eyebrow="Buyer request"
            query={`Add the ${productTitle} to my cart.`}
            items={[
              { label: 'Merchant', value: merchantName },
              { label: 'Customer type', value: 'Guest — no wholesale account on file' },
              { label: 'Qualification state', value: 'Not verified as a qualified reseller' },
              { label: 'Requested purchase', value: `${productTitle} × 1` },
            ]}
          />
          <PrimaryButton onClick={nav.onNext}>See what happens today →</PrimaryButton>
        </SceneShell>
      ),
    },
    {
      stepLabel: 'Decision',
      render: (nav: GuidedNav) => (
        <SceneShell eyebrow="Without an upfront decision" tone="rose" title="The dead end" subtitle="The agent shops the way most agents do right now.">
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
            <div className="rounded-xl bg-rose-50 border border-rose-300 px-4 py-4 mt-2">
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none">✕</span>
                <div>
                  <div className="font-semibold text-rose-700 text-sm">Order rejected — {governingMessage}</div>
                  <div className="text-rose-500 text-xs mt-0.5">Checkout blocked. Purchase could not be completed.</div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-center px-2">
            <span className="font-semibold text-slate-700">Business consequence: </span>
            the AI channel created a customer promise the retailer could not honor.
          </p>
          <PrimaryButton onClick={nav.onNext}>Now see the RetailAgentOS path →</PrimaryButton>
        </SceneShell>
      ),
    },
    {
      stepLabel: 'Result',
      render: (nav: GuidedNav) => (
        <SceneShell eyebrow="RetailAgentOS" tone="emerald" title="The upfront answer" subtitle="Same request. The agent knows before it ever recommends the item.">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200">
              Chat thread
            </div>
            <div>
              <ChatLabel side="agent" label="Shopping agent" />
              <AgentBubble>Add the {productTitle} to my cart.</AgentBubble>
            </div>
            <BuyerDecisionCard view={buyerView} theme="light" />
          </div>
          <p className="text-sm text-slate-600 leading-relaxed text-center px-2">
            <span className="font-semibold text-slate-700">Business takeaway: </span>
            the policy is applied before the AI recommends or builds the cart, and the outcome
            can be explained.
          </p>
          <PrimaryButton onClick={nav.onNext}>See what to do next →</PrimaryButton>
        </SceneShell>
      ),
    },
    {
      stepLabel: 'Next step',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10">
          <NextBestAction
            heading="See where this fits in your retail stack."
            body="Bring one difficult pricing, qualification or fulfilment rule. Map how an AI shopping channel should handle it before checkout."
            primaryLabel="Map RetailAgentOS to our systems"
            primaryHref={ENTERPRISE_MAILTO}
            secondaryLabel="Review the evidence"
            secondaryHref="/evidence"
            tertiaryLabel="Try another demo"
            tertiaryHref="/see-it-work"
            onReplay={nav.onRestart}
          />
        </div>
      ),
    },
  ];

  return <GuidedDemoShell trackLabel="Enterprise Retail Leaders" duration="2 minutes" scenes={scenes} />;
}
