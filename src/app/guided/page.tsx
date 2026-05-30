'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { mockProducts } from '@/lib/mock/catalog';
import { merchantMeta } from '@/lib/mock/merchantMeta';
import { calculateVisibility, calculateEligibility } from '@/lib/rules/eligibility';
import { getApplicablePrice } from '@/lib/rules/pricing';
import { PricingContext } from '@/lib/types/extensions';
import { DecisionCard } from '@/components/demo/DecisionCard';
import { useView } from '@/lib/context/ViewContext';
import { JsonViewer } from '@/components/ui/JsonViewer';
import { ViewToggle } from '@/components/ui/ViewToggle';

interface Chapter {
  merchantId: string;
  title: string;
  subtitle: string;
  context: Omit<PricingContext, 'activeExtensions'>;
  activeExtensions: string[];
  highlightProductId: string;
  contextLabel: string;
  takeaway: string;
  insight: string;
}

const chapters: Chapter[] = [
  {
    merchantId: 'm_boutique_001',
    title: "Chapter 1: Sara's Boutique",
    subtitle: 'Discovery-Led Commerce',
    context: {
      customerType: 'guest',
      membershipTier: 'none',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: false,
    },
    activeExtensions: ['ext.pricing_context', 'ext.eligibility'],
    highlightProductId: 'p_b_001',
    contextLabel: 'Guest shopper · US · Shipping',
    takeaway: "Sara's products are now agent-discoverable.",
    insight:
      "Any buyer context works — Sara's catalog has no gating. The agent can recommend freely and add to cart without checking qualifications. This is discovery-led commerce at its simplest.",
  },
  {
    merchantId: 'm_wholesale_002',
    title: 'Chapter 2: B&T Wholesale',
    subtitle: 'Qualification-First Commerce',
    context: {
      customerType: 'wholesale',
      membershipTier: 'reseller_plus',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: true,
    },
    activeExtensions: ['ext.pricing_context', 'ext.eligibility', 'ext.bulk_pricing'],
    highlightProductId: 'p_w_001',
    contextLabel: 'Wholesale buyer · Reseller Plus · Resale cert on file',
    takeaway: 'Only qualified buyers see B&T listings — at the right price.',
    insight:
      'This buyer is fully qualified. The agent sees all listings, applies the correct volume tier, and knows the exact MOQ. Change the buyer to a guest and everything disappears — as it should.',
  },
  {
    merchantId: 'm_grocery_003',
    title: 'Chapter 3: Fresh Corner Market',
    subtitle: 'Contextual Offers & Fulfilment',
    context: {
      customerType: 'guest',
      membershipTier: 'none',
      marketRegion: 'CA',
      fulfillmentMode: 'local_delivery',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: false,
    },
    activeExtensions: ['ext.pricing_context', 'ext.eligibility', 'ext.promo_pricing', 'ext.fulfillment_constraints'],
    highlightProductId: 'p_g_001',
    contextLabel: 'Guest shopper · California · Local delivery',
    takeaway: 'Promos and delivery zones work correctly — before checkout.',
    insight:
      'The agent sees weekly sale prices and mix-and-match promos at browse time, not checkout time. Switch region to HI and Fresh Organic Bananas becomes unavailable — declared in the fulfilment constraint, caught before the buyer places an order.',
  },
];

export default function GuidedDemoPage() {
  const [chapterIndex, setChapterIndex] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const { view, setView } = useView();

  const chapter = chapters[chapterIndex];
  const meta = merchantMeta[chapter.merchantId];

  const effectiveContext: PricingContext = {
    ...chapter.context,
    activeExtensions: chapter.activeExtensions,
  };

  const chapterProducts = mockProducts.filter(p => p.merchantId === chapter.merchantId);

  const inspectedProduct = selectedProductId
    ? chapterProducts.find(p => p.id === selectedProductId) ?? chapterProducts[0]
    : chapterProducts[0];

  const inspectedVariant = inspectedProduct.variants[0];
  const visibility = calculateVisibility(inspectedVariant, effectiveContext);
  const eligibility = calculateEligibility(inspectedVariant, effectiveContext);
  const priceState = getApplicablePrice(inspectedVariant, 1, effectiveContext);

  const payload = {
    pricing_context: effectiveContext,
    extensions: {
      visibility,
      eligibility,
      pricing: priceState,
      ...(inspectedVariant.bulkPricing ? { bulk_pricing_rules: inspectedVariant.bulkPricing } : {}),
      ...(inspectedVariant.promoPricing ? { promo_pricing_rules: inspectedVariant.promoPricing } : {}),
      ...(inspectedVariant.fulfillmentConstraints ? { fulfillment_constraints: inspectedVariant.fulfillmentConstraints } : {}),
    },
  };

  const goNext = () => {
    setChapterIndex(i => Math.min(i + 1, chapters.length - 1));
    setSelectedProductId(null);
  };

  const goPrev = () => {
    setChapterIndex(i => Math.max(i - 1, 0));
    setSelectedProductId(null);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

        {/* Chapter selector + view toggle */}
        <div className="flex flex-col gap-3 mb-8 sm:flex-row sm:items-center sm:justify-between">
          {/* Chapter tabs — vertical stack on mobile, horizontal row on sm+ */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {chapters.map((ch, i) => (
              <button
                key={i}
                onClick={() => { setChapterIndex(i); setSelectedProductId(null); }}
                className={`flex items-center gap-2 min-h-[44px] px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors w-full sm:w-auto ${
                  i === chapterIndex
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {i < chapterIndex && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                {i === chapterIndex && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />}
                {i > chapterIndex && <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block shrink-0" />}
                {ch.title.split(':')[1]?.trim() ?? ch.title}
              </button>
            ))}
          </div>
          {/* View toggle — below tabs on mobile, right-aligned on sm+ */}
          <div className="sm:shrink-0">
            <ViewToggle />
          </div>
        </div>

        {/* Chapter header */}
        <div className="mb-8">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{chapter.title}</div>
          <h1 className="text-3xl font-bold text-slate-900">{meta.humanName}</h1>
          <p className="mt-1 text-slate-500 text-sm">{chapter.subtitle}</p>
          <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 max-w-2xl">
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">The problem</div>
            <p className="text-sm text-slate-700 leading-relaxed">{meta.problem}</p>
          </div>
        </div>

        {/* Main demo area */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left: product list + context */}
          <div className="lg:col-span-2 space-y-4">
            {/* Context badge */}
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Active context</div>
              <div className="text-sm text-slate-700 font-medium">{chapter.contextLabel}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {chapter.activeExtensions.map(ext => (
                  <span key={ext} className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
                    {ext}
                  </span>
                ))}
              </div>
            </div>

            {/* Product cards */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                {meta.humanName} catalog
              </div>
              {chapterProducts.map(product => {
                const variant = product.variants[0];
                const vis = calculateVisibility(variant, effectiveContext);
                const elig = calculateEligibility(variant, effectiveContext);
                const isSelected = (selectedProductId ?? chapter.highlightProductId) === product.id;

                return (
                  <button
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className={`w-full text-left rounded-lg border px-4 py-3 min-h-[60px] transition-all ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-1'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="font-semibold text-sm leading-snug">{product.title}</div>
                      <span className={`shrink-0 text-xs font-semibold rounded-full px-2.5 py-1 whitespace-nowrap ${
                        vis.status === 'HIDDEN'
                          ? isSelected ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'
                          : elig.status === 'ELIGIBLE'
                          ? isSelected ? 'bg-emerald-800 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                          : elig.status === 'CONDITIONAL'
                          ? isSelected ? 'bg-amber-800 text-amber-200' : 'bg-amber-100 text-amber-700'
                          : isSelected ? 'bg-rose-900 text-rose-200' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {vis.status === 'HIDDEN' ? 'Hidden' : elig.status}
                      </span>
                    </div>
                    <div className={`text-xs mt-1 truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {product.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: decision card or payload */}
          <div className="lg:col-span-3 space-y-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              {view === 'business' ? 'Agent decision' : 'Raw extension payload'}
            </div>

            {view === 'business' ? (
              <DecisionCard
                merchantHumanName={meta.humanName}
                productTitle={inspectedProduct.title}
                visibility={visibility}
                eligibility={eligibility}
                priceState={priceState}
                onSwitchToTechnical={() => setView('technical')}
              />
            ) : (
              <JsonViewer
                title="Raw Extension Payload"
                data={payload}
                className="border-slate-700"
              />
            )}

            {/* Insight */}
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">What this shows</div>
              <p className="text-sm text-slate-700 leading-relaxed">{chapter.insight}</p>
            </div>

            {/* Resolution */}
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-4">
              <div className="flex gap-2 items-start">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">RetailAgentOS outcome</div>
                  <p className="text-sm text-slate-700 leading-relaxed">{meta.resolution}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Chapter navigation */}
        <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6">
          <button
            onClick={goPrev}
            disabled={chapterIndex === 0}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" /> Previous
          </button>

          <div className="flex gap-1.5">
            {chapters.map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === chapterIndex ? 'bg-slate-900' : 'bg-slate-300'}`}
              />
            ))}
          </div>

          {chapterIndex < chapters.length - 1 ? (
            <button
              onClick={goNext}
              className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-600 transition-colors"
            >
              Next chapter <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Link
              href="/demo"
              className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-600 transition-colors"
            >
              Go deeper in Playground <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}
