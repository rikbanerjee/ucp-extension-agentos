'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { mockProducts } from '@/lib/mock/catalog';
import { mockMerchants } from '@/lib/mock/merchants';
import type { BuyerContext, CustomerType, MembershipTier, LoyaltyTier } from '@/lib/types/context';
import type { ComputedVisibility, ComputedEligibility, ComputedPriceState } from '@/lib/types/extensions';
import { CartLine } from '@/lib/types/core';
import { calculateEligibility, calculateVisibility } from '@/lib/rules/eligibility';
import { getApplicablePrice, computePrice } from '@/lib/rules/pricing';
import { validateCartLine } from '@/lib/rules/cartValidation';
import { evaluateOffer } from '@/lib/extensions';
import { TraceTab } from '@/components/demo/TraceTab';
import { Panel } from '@/components/ui/Panel';
import { JsonViewer } from '@/components/ui/JsonViewer';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { DecisionCard } from '@/components/demo/DecisionCard';
import { merchantMeta } from '@/lib/mock/merchantMeta';
import { useView } from '@/lib/context/ViewContext';
import { ShoppingCart, Search, Info, X, Zap, SlidersHorizontal, List, FileJson, Lock, Unlock, Clock } from 'lucide-react';
import { signEnvelope, buildTrustReasonEntries, TRUST_REASON_CODES, TRUST_NAMESPACE } from '@/lib/rules/trust';
import { STAGE_TTL_DEFAULTS } from '@/lib/types/envelope';
import { mockMerchants as _mockMerchants } from '@/lib/mock/merchants';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { DemoInfographics } from '@/components/demo/DemoInfographics';
import { QuoteSimulator } from '@/components/demo/QuoteSimulator';

function getWhyLine(visibility: ComputedVisibility, eligibility: ComputedEligibility, priceState: ComputedPriceState): string {
  if (visibility.status === 'HIDDEN') {
    return `Hidden — ${visibility.reason || 'not visible in this context.'}`;
  }
  if (eligibility.status === 'BLOCKED') {
    const reason = eligibility.reasons.find(r => r.blocking);
    return `Blocked — ${reason?.message || 'buyer does not meet requirements.'}`;
  }
  if (eligibility.status === 'CONDITIONAL') {
    return `Conditional — ${eligibility.reasons[0]?.message || 'additional requirements needed.'}`;
  }
  const priceLabels: Record<string, string> = {
    member: 'member pricing applied',
    bulk_tier: priceState.appliedTier ? `bulk tier — ${(priceState.appliedTier as { minQuantity: number }).minQuantity}+ units` : 'bulk tier pricing',
    promo_sale: 'weekly sale price',
    promo_tier: 'mix & match promo applied',
    base: 'public pricing',
  };
  return `Eligible · $${priceState.unitPrice.toFixed(2)} — ${priceLabels[priceState.priceSource] || 'standard pricing'}.`;
}

type ScenarioId = 'boutique_discovery' | 'grocery_offers' | 'fulfillment_constraints' | 'wholesale_gating' | 'bulk_tier_pricing' | 'trust_downgrade';

interface Scenario {
  id: ScenarioId;
  label: string;
  hint: string;
  context: BuyerContext;
  merchantFilter: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'boutique_discovery',
    label: 'Boutique Discovery',
    hint: 'A guest browses Boutique A. Notice the clean DTC payload — no membership flags, no gating. Any agent can recommend freely.',
    context: {
      customerType: 'guest',
      loyaltyTier: 'guest',
      membershipTier: 'none',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: false,
      trust: { mode: 'asserted' },
    },
    merchantFilter: 'm_boutique_001',
  },
  {
    id: 'grocery_offers',
    label: 'Grocery Offers',
    hint: 'Weekly sale prices and mix-and-match promo tiers surface before checkout. Click a product to inspect the applied offer state in the payload.',
    context: {
      customerType: 'guest',
      loyaltyTier: 'guest',
      membershipTier: 'none',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: false,
      trust: { mode: 'asserted' },
    },
    merchantFilter: 'm_grocery_003',
  },
  {
    id: 'fulfillment_constraints',
    label: 'Fulfillment Constraints',
    hint: 'Region is set to Hawaii. Fresh Organic Bananas is restricted in HI — the eligibility payload explains why it cannot be fulfilled here.',
    context: {
      customerType: 'guest',
      loyaltyTier: 'guest',
      membershipTier: 'none',
      marketRegion: 'HI',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: false,
      trust: { mode: 'asserted' },
    },
    merchantFilter: 'm_grocery_003',
  },
  {
    id: 'wholesale_gating',
    label: 'Wholesale Gating',
    hint: 'Buyer is qualified: Wholesale + Resale Certificate. Items that were HIDDEN to guests are now visible and ELIGIBLE. Compare by removing the resale cert.',
    context: {
      customerType: 'wholesale',
      loyaltyTier: 'guest',
      membershipTier: 'reseller_plus',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: true,
      trust: { mode: 'signed' },
    },
    merchantFilter: 'm_wholesale_002',
  },
  {
    id: 'bulk_tier_pricing',
    label: 'Bulk Tier Pricing',
    hint: 'Add Industrial Coffee Beans to cart. Change quantity to 50, then 100 — watch the unit price drop as volume tier thresholds are crossed.',
    context: {
      customerType: 'wholesale',
      loyaltyTier: 'guest',
      membershipTier: 'reseller_plus',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: true,
      trust: { mode: 'signed' },
    },
    merchantFilter: 'm_wholesale_002',
  },
  {
    id: 'trust_downgrade',
    label: 'Trust: Asserted vs Signed',
    hint: 'Toggle trust.mode to see privilege downgrade (RAOS-0000 §7.2). With "asserted", membershipTier and resale cert are not trusted — wholesale items block. Switch to "signed" to grant them.',
    context: {
      customerType: 'wholesale',
      loyaltyTier: 'gold',
      membershipTier: 'reseller_plus',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: true,
      taxExempt: true,
      resaleCertificateOnFile: true,
      trust: { mode: 'asserted' },
    },
    merchantFilter: 'm_wholesale_002',
  },
];

function ScenarioLoader({ onScenario }: { onScenario: (id: ScenarioId) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const s = searchParams.get('scenario') as ScenarioId | null;
    if (s && SCENARIOS.find(sc => sc.id === s)) {
      onScenario(s);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function DemoPage() {
  const [context, setContext] = useState<BuyerContext>({
    customerType: 'guest',
    loyaltyTier: 'guest',
    membershipTier: 'none',
    marketRegion: 'US',
    fulfillmentMode: 'shipping',
    accountLinked: false,
    taxExempt: false,
    resaleCertificateOnFile: false,
    trust: { mode: 'asserted' },
  });

  const [activeTab, setActiveTab] = useState<'catalog' | 'cart'>('catalog');
  const [cart, setCart] = useState<CartLine[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [merchantFilter, setMerchantFilter] = useState<'all' | string>('all');
  const [hideIneligible, setHideIneligible] = useState(false);

  // Inspector state
  const [inspectedItem, setInspectedItem] = useState<{ productId: string, variantId: string } | null>(null);

  // Scenario picker state
  const [activeScenario, setActiveScenario] = useState<ScenarioId | null>(null);
  const [scenarioHintDismissed, setScenarioHintDismissed] = useState(false);

  const [inspectorTab, setInspectorTab] = useState<'payload' | 'trace'>('payload');

  // WP-06 / RAOS-0008: Stale data toggle — advances now by 2× price TTL to
  // make envelopes visibly expire. "now" for envelope purposes only; the core
  // eligibility/pricing rules still use a fixed now = 0.
  const [staleToggle, setStaleToggle] = useState(false);

  // Mobile panel navigation
  const [mobilePanel, setMobilePanel] = useState<'controls' | 'catalog' | 'inspector'>('catalog');

  // Business / Technical view from global context
  const { view, setView } = useView();

  // Helper — inspects an item and auto-navigates to inspector on mobile
  const inspectItem = (productId: string, variantId: string) => {
    setInspectedItem({ productId, variantId });
    setMobilePanel('inspector');
  };

  /**
   * WP-02: The effective context for evaluation is now the BuyerContext directly.
   * No more activeExtensions on the context — the pipeline derives active
   * evaluators from the merchant's manifest capabilities[] at evaluation time.
   *
   * For the catalog display (which still calls rule functions directly for
   * performance), we pass the context as-is. Trust downgrade is demonstrated
   * via the trust.mode toggle in the controls panel.
   */
  const effectiveContext = context;

  const addToCart = (variantId: string, productId: string, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(line => line.variantId === variantId);
      if (existing) {
        return prev.map(line => line.variantId === variantId ? { ...line, quantity: line.quantity + quantity } : line);
      }
      return [...prev, { id: `line_${variantId}`, productId, variantId, quantity }];
    });
  };

  const updateCartQuantity = (lineId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(line => line.id === lineId ? { ...line, quantity } : line));
  };

  const removeFromCart = (lineId: string) => {
    setCart(prev => prev.filter(line => line.id !== lineId));
  };

  const clearCart = () => setCart([]);

  // Auto-load boutique_discovery + pre-select Personalized T-Shirt on first visit
  useEffect(() => {
    applyScenario('boutique_discovery');
    setInspectedItem({ productId: 'p_b_001', variantId: 'v_b_001_1' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyScenario = (scenarioId: ScenarioId) => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;
    setContext(scenario.context);
    setMerchantFilter(scenario.merchantFilter);
    setActiveTab('catalog');
    setSearchQuery('');
    setInspectedItem(null);
    setActiveScenario(scenarioId);
    setScenarioHintDismissed(false);
  };

  const clearScenario = () => {
    setActiveScenario(null);
    setScenarioHintDismissed(false);
  };

  const resetControls = () => {
    setContext({
      customerType: 'guest',
      loyaltyTier: 'guest',
      membershipTier: 'none',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: false,
      trust: { mode: 'asserted' },
    });
    setMerchantFilter('all');
    clearScenario();
    setSearchQuery('');
    setInspectedItem(null);
  };

  // Computed Catalog
  const filteredCatalog = useMemo(() => {
    return mockProducts.map(product => {
      const variant = product.variants[0]; // simplify to single variant for demo
      const visibility = calculateVisibility(variant, effectiveContext);
      const eligibility = calculateEligibility(variant, effectiveContext);

      const isVisible = visibility.status === 'VISIBLE';
      const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            product.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesMerchant = merchantFilter === 'all' || product.merchantId === merchantFilter;
      const meetsEligibilityFilter = !hideIneligible || (isVisible && eligibility.status !== 'BLOCKED');

      return {
        product,
        variant,
        visibility,
        eligibility,
        show: matchesSearch && matchesMerchant && meetsEligibilityFilter
      };
    }).filter(item => item.show);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockProducts, effectiveContext, searchQuery, merchantFilter, hideIneligible]);

  const cartValidations = useMemo(() => {
    return cart.map(line => {
      const product = mockProducts.find(p => p.id === line.productId)!;
      const variant = product.variants.find(v => v.id === line.variantId)!;
      return {
        line,
        product,
        variant,
        validation: validateCartLine(variant, line.quantity, effectiveContext)
      };
    });
  }, [cart, effectiveContext]);

  const isCartValid = cartValidations.every(v => v.validation.valid);
  const cartTotal = cartValidations.reduce((sum, v) => sum + v.validation.lineTotal, 0);

  // Trust mode helpers
  const trustMode = context.trust?.mode ?? 'asserted';
  const isAsserted = trustMode === 'asserted';

  const toggleTrustMode = () => {
    setContext(prev => ({
      ...prev,
      trust: { mode: isAsserted ? 'signed' : 'asserted' },
    }));
    clearScenario();
  };

  return (
    <div className="h-full overflow-y-auto">
    {/* Interactive app shell — exactly one viewport tall, columns scroll internally */}
    <div className="h-full flex flex-col overflow-hidden">
      {/* Page header */}
      <div className="border-b border-slate-200 bg-white px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-slate-900 truncate">Agent Reasoning Playground</h1>
          <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Change the buyer context on the left — watch what the agent is allowed to see, recommend, and do on the right.</p>
        </div>
        <a
          href="/for-merchants#readiness"
          className="shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors whitespace-nowrap"
        >
          Check agent-readiness →
        </a>
      </div>
      {/* Three-column layout — desktop side-by-side, mobile single-panel */}
      <div className="flex-1 flex overflow-hidden min-h-0">
      <Suspense>
        <ScenarioLoader onScenario={applyScenario} />
      </Suspense>
      {/* Left Column: Context Simulator */}
      <div className={`${mobilePanel === 'controls' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-72 border-r border-slate-200 bg-slate-50 h-full overflow-y-auto shrink-0`}>
        <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-900">Context Controls</h2>
          </div>
          {(activeScenario || merchantFilter !== 'all') ? (
            <button
              onClick={resetControls}
              className="w-full rounded-md border-2 border-slate-900 bg-white px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-900 hover:text-white transition-colors flex items-center justify-center gap-1.5"
            >
              ↺ Reset to explore all controls
            </button>
          ) : (
            <p className="text-[11px] text-slate-400 leading-relaxed">Pick a scenario above or adjust controls to simulate any buyer context.</p>
          )}
        </div>
        <div className="p-4 space-y-6">

          {/* Trust Mode Toggle — RAOS-0000 §4.2 / §7.2 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Trust Mode</label>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">RAOS-0000 §7.2</span>
            </div>
            <button
              onClick={toggleTrustMode}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border-2 text-sm font-semibold transition-colors ${
                isAsserted
                  ? 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100'
                  : 'border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {isAsserted ? <Unlock className="w-4 h-4 shrink-0" /> : <Lock className="w-4 h-4 shrink-0" />}
              <span className="flex-1 text-left">
                {isAsserted ? 'Asserted (untrusted)' : 'Signed (trusted)'}
              </span>
              <span className="text-xs opacity-60">{isAsserted ? '→ downgrade' : '→ trust claims'}</span>
            </button>
            {isAsserted && (
              <p className="text-[11px] text-amber-700 leading-relaxed bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                Privilege claims (tier, resale cert, tax exempt) are untrusted — downgraded to guest/most-restrictive for transaction stages.
              </p>
            )}
          </div>

          {/* Stale Data Toggle — RAOS-0008 envelope freshness demo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Stale Data</label>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">RAOS-0008</span>
            </div>
            <button
              onClick={() => setStaleToggle(s => !s)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md border-2 text-sm font-semibold transition-colors ${
                staleToggle
                  ? 'border-rose-400 bg-rose-50 text-rose-800 hover:bg-rose-100'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">
                {staleToggle ? 'TTLs expired (+10m offset)' : 'Data is fresh'}
              </span>
            </button>
            {staleToggle && (
              <p className="text-[11px] text-rose-700 leading-relaxed bg-rose-50 border border-rose-200 rounded px-2 py-1.5">
                Now offset by +600s — price/eligibility TTLs exceeded. Envelope inspector shows DATA_STALE.
              </p>
            )}
          </div>

          {/* Loyalty Tier — RAOS-0009 (orthogonal axis) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Loyalty Tier</label>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">RAOS-0009</span>
            </div>
            <select
              value={context.loyaltyTier ?? 'guest'}
              onChange={(e) => setContext({ ...context, loyaltyTier: e.target.value as LoyaltyTier })}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
            >
              <option value="guest">Guest (no loyalty)</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
            </select>
          </div>

          {/* Business & Wholesale Controls */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Customer Type</label>
              <select
                value={context.customerType}
                onChange={(e) => setContext({ ...context, customerType: e.target.value as CustomerType })}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
              >
                <option value="guest">Guest</option>
                <option value="member">Member</option>
                <option value="wholesale">Wholesale</option>
                <option value="b2b">B2B</option>
              </select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Wholesale Account Tier</label>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">RAOS-0001</span>
              </div>
              <select
                value={context.membershipTier}
                onChange={(e) => setContext({ ...context, membershipTier: e.target.value as MembershipTier })}
                disabled={context.customerType === 'guest'}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="none">None</option>
                <option value="gold">Gold</option>
                <option value="reseller_plus">Reseller Plus</option>
                <option value="distributor">Distributor</option>
              </select>
              {isAsserted && context.membershipTier !== 'none' && (
                <p className="text-[11px] text-amber-600">Downgraded to &apos;none&apos; (asserted mode).</p>
              )}
            </div>
            <div className="space-y-3 pt-2 border-b border-slate-200 pb-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={context.taxExempt} onChange={e => setContext({ ...context, taxExempt: e.target.checked })} className="rounded text-slate-900 focus:ring-slate-900" />
                <span className="text-sm text-slate-700">Tax Exempt</span>
                {isAsserted && context.taxExempt && (
                  <span className="text-[10px] text-amber-600 ml-auto">downgraded</span>
                )}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={context.resaleCertificateOnFile} onChange={e => setContext({ ...context, resaleCertificateOnFile: e.target.checked })} className="rounded text-slate-900 focus:ring-slate-900" />
                <span className="text-sm text-slate-700">Resale Certificate on File</span>
                {isAsserted && context.resaleCertificateOnFile && (
                  <span className="text-[10px] text-amber-600 ml-auto">downgraded</span>
                )}
              </label>
            </div>
          </div>

          {/* Fulfillment Controls */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Fulfillment Mode</label>
            <select
              value={context.fulfillmentMode}
              onChange={(e) => setContext({ ...context, fulfillmentMode: e.target.value as BuyerContext['fulfillmentMode'] })}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
            >
              <option value="shipping">Shipping</option>
              <option value="pickup">Store Pickup</option>
              <option value="local_delivery">Local Delivery</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Market Region</label>
            <select
              value={context.marketRegion}
              onChange={(e) => setContext({ ...context, marketRegion: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white"
            >
              <option value="US">US (General)</option>
              <option value="CA">California</option>
              <option value="NY">New York</option>
              <option value="HI">Hawaii</option>
              <option value="AK">Alaska</option>
            </select>
          </div>

        </div>
      </div>

      {/* Center Column: Interactive Demo */}
      <div className={`${mobilePanel === 'catalog' ? 'flex' : 'hidden'} md:flex flex-1 flex-col h-full overflow-hidden bg-slate-50/50`}>

        {/* Scenario Picker — single scrollable line */}
        <div className="border-b border-emerald-200 bg-emerald-50 px-3 py-2 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 shrink-0">
              <Zap className="w-3 h-3" /> Try:
            </span>
            {SCENARIOS.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => activeScenario === scenario.id ? clearScenario() : applyScenario(scenario.id)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  activeScenario === scenario.id
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-emerald-700 border-emerald-300 hover:border-emerald-600 hover:bg-emerald-100'
                }`}
              >
                {scenario.label}
              </button>
            ))}
            {activeScenario && (
              <button onClick={clearScenario} className="shrink-0 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Combined toolbar: tabs + search + filter — one compact row */}
        <div className="border-b border-slate-200 bg-white px-3 py-2 flex items-center gap-2 shrink-0">
          {/* Tab toggle */}
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 shrink-0">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${activeTab === 'catalog' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Catalog
            </button>
            <button
              onClick={() => setActiveTab('cart')}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${activeTab === 'cart' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Cart
              {cart.length > 0 && (
                <span className="bg-slate-900 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center leading-none">{cart.length}</span>
              )}
            </button>
          </div>

          {/* Search — grows to fill available space */}
          {activeTab === 'catalog' && (
            <>
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <select
                value={merchantFilter}
                onChange={e => setMerchantFilter(e.target.value)}
                className="shrink-0 border border-slate-300 rounded-md px-2 py-1.5 text-xs bg-white text-slate-700 max-w-[130px]"
              >
                <option value="all">All Merchants</option>
                {mockMerchants.map(m => <option key={m.merchantId} value={m.merchantId}>{merchantMeta[m.merchantId]?.humanName ?? m.merchantName}</option>)}
              </select>
              <label className="shrink-0 flex items-center gap-1 text-xs text-slate-500 cursor-pointer" title="Hide hidden/blocked products">
                <input type="checkbox" checked={hideIneligible} onChange={e => setHideIneligible(e.target.checked)} className="rounded text-slate-900 w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hide blocked</span>
              </label>
            </>
          )}
        </div>

        {/* Scenario Hint Banner */}
        {activeScenario && !scenarioHintDismissed && (() => {
          const scenario = SCENARIOS.find(s => s.id === activeScenario);
          if (!scenario) return null;
          return (
            <div className="flex items-start gap-3 bg-sky-50 border-b border-sky-200 px-4 py-2 text-sm text-sky-800 shrink-0">
              <Zap className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
              <span className="flex-1 text-xs leading-relaxed">{scenario.hint}</span>
              <button onClick={() => setScenarioHintDismissed(true)} className="text-sky-400 hover:text-sky-700 transition-colors shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })()}

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'catalog' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              {filteredCatalog.map(item => {
                const { product, variant, visibility, eligibility } = item;
                const merchant = mockMerchants.find(m => m.merchantId === product.merchantId);
                const priceState = getApplicablePrice(variant, 1, effectiveContext);

                const isGrocery = product.merchantId === 'm_grocery_003';
                const isWholesale = product.merchantId === 'm_wholesale_002';

                let badgeVariant: BadgeVariant = 'neutral';
                if (visibility.status === 'HIDDEN') badgeVariant = 'neutral';
                else if (eligibility.status === 'ELIGIBLE') badgeVariant = 'success';
                else if (eligibility.status === 'CONDITIONAL') badgeVariant = 'warning';
                else if (eligibility.status === 'BLOCKED') badgeVariant = 'error';

                return (
                  <Panel
                    key={product.id}
                    className={`border-slate-200 shadow-sm transition-colors cursor-pointer ${inspectedItem?.productId === product.id ? 'ring-2 ring-slate-400' : 'hover:border-slate-400'}`}
                    onClick={() => inspectItem(product.id, variant.id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{merchantMeta[product.merchantId]?.humanName ?? merchant?.merchantName}</span>
                          <Badge variant={badgeVariant}>
                            {visibility.status === 'HIDDEN' ? 'HIDDEN' : eligibility.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mb-1.5 italic">
                          {getWhyLine(visibility, eligibility, priceState)}
                        </p>
                        <h3 className="text-lg font-bold text-slate-900">{product.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">{product.description}</p>
                      </div>
                    </div>

                    {visibility.status === 'HIDDEN' ? (
                      <div className="bg-slate-100 p-3 rounded-md border border-slate-200 flex items-start gap-3 mt-2">
                        <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">Hidden due to context</p>
                          <p className="text-sm text-slate-600 mt-0.5">{visibility.reason}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <div className="flex items-end gap-3 mb-4">
                          {isGrocery && variant.promoPricing?.salePrice && priceState.unitPrice < variant.basePrice ? (
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-slate-900">
                                ${priceState.unitPrice.toFixed(2)}
                              </span>
                              <span className="text-lg text-slate-400 line-through">
                                ${variant.basePrice.toFixed(2)}
                              </span>
                              <Badge variant="success">Sale</Badge>
                            </div>
                          ) : (
                            <span className="text-2xl font-bold text-slate-900">
                              ${priceState.unitPrice.toFixed(2)}
                            </span>
                          )}

                          {priceState.priceSource === 'member' && (
                            <Badge variant="success">Member Price</Badge>
                          )}
                          {priceState.priceSource === 'bulk_tier' && (
                            <Badge variant="outline" className="text-slate-600 border-slate-300">Bulk Tier Applied</Badge>
                          )}
                          {priceState.teaser && (
                            <span className="text-sm text-emerald-600 font-medium">
                              {priceState.teaser.message}
                            </span>
                          )}
                        </div>

                        {isGrocery && variant.promoPricing?.description && (
                          <div className="mb-4 inline-block bg-sky-50 border border-sky-200 text-sky-800 text-xs px-2.5 py-1 rounded-md font-medium">
                            {variant.promoPricing.description}
                          </div>
                        )}

                        {isWholesale && variant.bulkPricing && (
                          <div className="mb-4 bg-slate-100 rounded-md p-2 text-sm text-slate-700 border border-slate-200 inline-block">
                            <span className="font-semibold text-slate-800">Wholesale Terms:</span> MOQ {variant.bulkPricing.moq}
                            {variant.bulkPricing.quantityIncrement && ` (Increments of ${variant.bulkPricing.quantityIncrement})`}
                          </div>
                        )}

                        {isGrocery && variant.fulfillmentConstraints && (
                          <div className="mb-4">
                            <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 inline-flex flex-col gap-1">
                              <span className="flex items-center gap-1.5">
                                {variant.fulfillmentConstraints.availableModes?.includes('pickup') ? '🏪' : '🚚'}
                                Requires: {variant.fulfillmentConstraints.availableModes?.map(m => m.replace('_', ' ')).join(', ')}
                              </span>
                              {variant.fulfillmentConstraints.restrictedRegions && (
                                <span className="flex items-center gap-1.5">
                                  🚫 Not available in: {variant.fulfillmentConstraints.restrictedRegions.join(', ')}
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {eligibility.reasons.length > 0 && (
                          <div className="mb-4 space-y-1.5">
                            {eligibility.reasons.map((r, i) => (
                              <div key={i} className={`text-sm px-3 py-2 rounded-md border ${r.blocking ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                {r.message}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (eligibility.status !== 'BLOCKED') {
                                addToCart(variant.id, product.id, variant.bulkPricing?.moq || 1);
                              }
                            }}
                            disabled={eligibility.status === 'BLOCKED'}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                              eligibility.status === 'BLOCKED'
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    )}
                  </Panel>
                );
              })}
              {filteredCatalog.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No products found for the current search and context.
                </div>
              )}
            </div>
          )}

          {activeTab === 'cart' && (
            <div className="max-w-3xl mx-auto">
              {cart.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">Cart is empty</h3>
                  <p className="text-slate-500 mt-1">Add items from the catalog to test validation.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <h3 className="font-semibold text-slate-800">Cart Items ({cart.length})</h3>
                    <button onClick={clearCart} className="text-sm text-slate-500 hover:text-slate-800">Clear Cart</button>
                  </div>
                  {cartValidations.map(({ line, product, validation, variant }) => {
                    const merchant = mockMerchants.find(m => m.merchantId === product.merchantId);

                    return (
                      <div
                        key={line.id}
                        className={`border rounded-lg p-4 bg-white shadow-sm flex flex-col gap-4 cursor-pointer transition-colors ${inspectedItem?.productId === product.id ? 'ring-2 ring-slate-400 border-transparent' : 'border-slate-200 hover:border-slate-400'}`}
                        onClick={() => inspectItem(product.id, variant.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{merchantMeta[product.merchantId]?.humanName ?? merchant?.merchantName}</span>
                              <Badge variant={validation.valid ? 'success' : 'error'}>
                                {validation.valid ? 'Valid' : 'Invalid'}
                              </Badge>
                            </div>
                            <h4 className="font-bold text-slate-900">{product.title}</h4>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFromCart(line.id); }}
                            className="text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 bg-slate-50 rounded-md p-3 border border-slate-100">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-700">Qty:</label>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => updateCartQuantity(line.id, parseInt(e.target.value) || 1)}
                              onClick={e => e.stopPropagation()}
                              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
                            />
                          </div>
                          <div className="text-sm text-slate-700 flex flex-col">
                            <span className="font-semibold text-slate-900">${validation.unitPrice.toFixed(2)} / ea</span>
                            <span className="text-xs text-slate-500">
                              Source: <span className="font-medium text-slate-700 capitalize">{validation.priceSource.replace('_', ' ')}</span>
                            </span>
                          </div>
                          <div className="text-sm flex flex-col ml-auto text-right">
                            <span className="font-bold text-slate-900 text-lg">${validation.lineTotal.toFixed(2)}</span>
                            {validation.appliedTier && (
                              <span className="text-xs text-emerald-600 font-medium">
                                Tier: {validation.appliedTier.minQuantity}+ units
                              </span>
                            )}
                          </div>
                        </div>

                        {!validation.valid && validation.messages.length > 0 && (
                          <div className="bg-rose-50 border border-rose-200 rounded-md p-3">
                            <h5 className="text-xs font-semibold text-rose-800 mb-1.5 uppercase tracking-wide">Validation Errors:</h5>
                            <ul className="list-disc list-inside text-sm text-rose-700 space-y-0.5">
                              {validation.messages.map((m, i) => <li key={i}>{m}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="bg-slate-900 rounded-lg p-6 text-white shadow-lg mt-6 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-medium text-slate-300">Cart Total</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {isCartValid ? 'All items are valid and ready for checkout.' : 'Please resolve validation errors before checkout.'}
                      </p>
                    </div>
                    <div className="text-3xl font-bold">
                      ${cartTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Payload Inspector */}
      <div className={`${mobilePanel === 'inspector' ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[450px] border-l border-slate-200 bg-[#1e1e1e] h-full shrink-0`}>
        <div className="border-b border-slate-700 bg-slate-900 sticky top-0 z-10 shrink-0">
          <div className="p-3 md:p-4 flex justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobilePanel('catalog')}
                className="md:hidden text-slate-400 hover:text-white transition-colors p-1 -ml-1"
                aria-label="Back to catalog"
              >
                ← <span className="text-xs">Catalog</span>
              </button>
              <h2 className="font-semibold text-slate-200 text-sm">Payload Inspector</h2>
            </div>
            <ViewToggle />
          </div>
          <div className="flex items-center border-t border-slate-700/50 px-4 py-2 gap-3">
            <button
              onClick={() => setInspectorTab('payload')}
              className={`text-xs font-medium pb-0.5 transition-colors ${inspectorTab === 'payload' ? 'text-white border-b-2 border-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Payload
            </button>
            <button
              onClick={() => setInspectorTab('trace')}
              className={`text-xs font-medium pb-0.5 transition-colors flex items-center gap-1.5 ${inspectorTab === 'trace' ? 'text-white border-b-2 border-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Trace
              <span className="text-[10px] bg-indigo-700 text-indigo-200 rounded px-1.5 py-0.5 leading-none">RAOS-0013</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">

          {inspectedItem ? (
            <div className="space-y-6">
              {(() => {
                const product = mockProducts.find(p => p.id === inspectedItem.productId)!;
                const variant = product.variants.find(v => v.id === inspectedItem.variantId)!;
                const cartLine = cart.find(l => l.variantId === variant.id);
                const quantity = cartLine ? cartLine.quantity : 1;

                const merchant = mockMerchants.find(m => m.merchantId === product.merchantId)!;

                // WP-08: Run the full pipeline for this (variant, merchant, context) triple.
                // The DecisionRecord is the trace substrate — all inspector data is sourced from it.
                const pipelineNow = staleToggle ? 600_000 : 0;
                const decisionRecord = evaluateOffer({
                  merchant,
                  variant,
                  quantity,
                  context: effectiveContext,
                  now: pipelineNow,
                });

                // Derive visibility, eligibility, and price from the pipeline output.
                // Fall back to direct rule calls for catalog-display performance (catalog
                // grid still calls rules directly — rewiring that is TODO WP-08 debt).
                const visibility = calculateVisibility(variant, effectiveContext);
                const eligibility = calculateEligibility(variant, effectiveContext);
                const { priceState, reasons: priceReasons } = computePrice(variant, quantity, effectiveContext);

                const isBoutique = product.merchantId === 'm_boutique_001';

                // WP-06: Build the trust envelope for this inspection.
                // staleToggle advances now by 600s to make TTLs visibly expire.
                const envelopeNow = staleToggle ? 600_000 : 0;
                const envelopeMerchant = _mockMerchants.find(m => m.merchantId === product.merchantId);
                const envelopeMerchantIssuer = envelopeMerchant
                  ? envelopeMerchant.endpoints.catalog.replace(/\/ucp\/catalog$/, '')
                  : 'https://unknown.test';
                const envelopeManifestKeys = envelopeMerchant?.manifest.keys ?? [];
                const envelopeActiveKey = envelopeManifestKeys.find(k => k.validTo === null || k.validTo > envelopeNow) ?? envelopeManifestKeys[0];
                const envelopeKeyId = envelopeActiveKey?.keyId ?? 'k1';
                const envelopeTtl = STAGE_TTL_DEFAULTS['PRICE'] ?? 300;
                const builtEnvelope = signEnvelope(variant.id, envelopeKeyId, 0, envelopeMerchantIssuer, envelopeTtl);
                const trustResult = (() => {
                  const keys = envelopeManifestKeys.length > 0 ? envelopeManifestKeys : [{ keyId: envelopeKeyId, validFrom: 0, validTo: null }];
                  return {
                    valid: true,
                    code: staleToggle ? TRUST_REASON_CODES.DATA_STALE : TRUST_REASON_CODES.TRUST_SIMULATED,
                    severity: staleToggle ? 'CONDITION' as const : 'INFO' as const,
                    message: staleToggle
                      ? `Data is ${Math.floor(envelopeNow / 1000)}s old (TTL ${envelopeTtl}s). Re-fetch before acting.`
                      : 'Envelope verified (SIMULATED — not cryptographically secure).',
                    stale: staleToggle,
                    ageSeconds: Math.floor(envelopeNow / 1000),
                  };
                })();
                const trustReasonEntries = buildTrustReasonEntries(trustResult).map(r => ({ ...r, source: TRUST_NAMESPACE }));

                // Strip out isMemberPrice from boutique
                const { isMemberPrice, ...boutiquePriceState } = priceState;
                const finalPriceState = isBoutique ? boutiquePriceState : priceState;

                // Include price reasons in technical payload
                const payloadPricing = { ...finalPriceState, reasons: priceReasons };

                const payload = {
                  buyer_context: {
                    ...effectiveContext,
                    // Show what trust mode is active and what the downgrade effect is
                    _trust_note: isAsserted
                      ? 'asserted mode — privilege claims (membershipTier, loyaltyTier, taxExempt, resaleCert) downgraded at transaction stages'
                      : 'signed mode — all claims trusted',
                  },
                  merchant: {
                    merchantId: merchant.merchantId,
                    tier: merchant.manifest.tier,
                    capabilities: merchant.manifest.capabilities.map(c => c.namespace),
                  },
                  extensions: {
                    visibility,
                    eligibility,
                    pricing: payloadPricing,
                    ...(variant.bulkPricing ? { bulk_pricing_rules: variant.bulkPricing } : {}),
                    ...(variant.promoPricing ? { promo_pricing_rules: variant.promoPricing } : {}),
                    ...(variant.fulfillmentConstraints ? { fulfillment_constraints: variant.fulfillmentConstraints } : {}),
                  }
                };

                const meta = merchantMeta[product.merchantId];

                // Trace tab: always render from the full DecisionRecord (WP-08)
                if (inspectorTab === 'trace') {
                  return <TraceTab record={decisionRecord} />;
                }

                return (
                  <>
                    {/* Business view: DecisionCard */}
                    {view === 'business' && (
                      <DecisionCard
                        merchantHumanName={meta?.humanName ?? merchant.merchantName}
                        productTitle={product.title}
                        visibility={visibility}
                        eligibility={eligibility}
                        priceState={priceState}
                        onSwitchToTechnical={() => setView('technical')}
                      />
                    )}

                    {/* Technical view: existing summary + JSON */}
                    {view === 'technical' && (
                      <>
                        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                          <h3 className="text-sm font-semibold text-white mb-2">{product.title}</h3>
                          <p className="text-xs text-slate-400 mb-4 pb-3 border-b border-slate-700">
                            {product.merchantId === 'm_boutique_001' && "Discovery & Recommendation Semantics"}
                            {product.merchantId === 'm_wholesale_002' && "Qualification & Bulk Order Semantics"}
                            {product.merchantId === 'm_grocery_003' && "Contextual Offers & Fulfillment Semantics"}
                          </p>
                          {/* Trust mode indicator */}
                          <div className={`flex items-center gap-2 mb-3 px-2 py-1.5 rounded text-xs font-medium ${isAsserted ? 'bg-amber-900/30 text-amber-300' : 'bg-emerald-900/30 text-emerald-300'}`}>
                            {isAsserted ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                            trust.mode = {trustMode}
                            {isAsserted && ' — privilege claims downgraded'}
                          </div>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between pb-1">
                              <span className="text-slate-300">Visibility:</span>
                              <span className={visibility.status === 'VISIBLE' ? 'text-emerald-400' : 'text-slate-500'}>{visibility.status}</span>
                            </div>
                            <div className="flex justify-between pb-1">
                              <span className="text-slate-300">Eligibility:</span>
                              <span className={eligibility.status === 'ELIGIBLE' ? 'text-emerald-400' : eligibility.status === 'CONDITIONAL' ? 'text-amber-400' : 'text-rose-400'}>
                                {eligibility.status}
                              </span>
                            </div>
                            <div className="flex justify-between pb-1">
                              <span className="text-slate-300">Price:</span>
                              <span className="text-sky-400">${priceState.unitPrice.toFixed(2)} · <span className="capitalize">{priceState.priceSource.replace('_', ' ')}</span></span>
                            </div>
                            {eligibility.reasons.length > 0 && (
                              <div className="pt-2 mt-2 border-t border-slate-700">
                                <span className="text-slate-300 block mb-1">Constraints:</span>
                                <ul className="list-disc list-inside text-rose-400 text-xs space-y-1">
                                  {eligibility.reasons.map((r, i) => (
                                    <li key={i}>
                                      [{r.severity}] {r.message}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* RAOS-0008: Provenance + Freshness Envelope */}
                        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                          <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Provenance Envelope</h4>
                            <span className="text-[10px] font-mono bg-slate-700 text-slate-400 border border-slate-600 rounded px-1.5 py-0.5">RAOS-0008</span>
                          </div>
                          <div className="p-4 space-y-3">
                            {/* SIMULATED badge */}
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-amber-900/30 text-amber-300 text-xs font-mono">
                              <span className="font-bold">SIMULATED</span>
                              <span className="opacity-70">— crypto is not real (B3/D2 locked until WP-19)</span>
                            </div>
                            {/* Envelope fields */}
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-400 shrink-0">issuer</span>
                                <span className="text-slate-300 text-right font-mono truncate">{builtEnvelope.provenance.issuer}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-400 shrink-0">keyId</span>
                                <span className="text-slate-300 font-mono">{builtEnvelope.provenance.keyId}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-400 shrink-0">signature</span>
                                <span className="text-slate-300 font-mono">{builtEnvelope.provenance.signature}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-400 shrink-0">trustMode</span>
                                <span className="text-amber-400 font-mono">{builtEnvelope.provenance.trustMode}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-400 shrink-0">computedAt</span>
                                <span className="text-slate-300 font-mono">{builtEnvelope.freshness.computedAt}</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-400 shrink-0">ttlSeconds</span>
                                <span className="text-slate-300 font-mono">{builtEnvelope.freshness.ttlSeconds}s</span>
                              </div>
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-400 shrink-0">age</span>
                                <span className={`font-mono ${trustResult.stale ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {trustResult.ageSeconds}s {trustResult.stale ? '— STALE' : '— fresh'}
                                </span>
                              </div>
                            </div>
                            {/* Trust reasons */}
                            <div>
                              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Trust Reasons</div>
                              <div className="space-y-1">
                                {trustReasonEntries.map((r, i) => (
                                  <div key={i} className="flex items-start gap-2 text-xs">
                                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                      r.severity === 'BLOCK'     ? 'bg-rose-900/60 text-rose-300' :
                                      r.severity === 'CONDITION' ? 'bg-amber-900/60 text-amber-300' :
                                      'bg-slate-700 text-slate-400'
                                    }`}>
                                      {r.severity}
                                    </span>
                                    <span className="font-mono text-slate-400 shrink-0">{r.code}</span>
                                    <span className="text-slate-500 leading-snug">{r.message}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* RAOS-0002: Price breakdown panel */}
                        {(priceState.appliedOffers?.length > 0 || priceState.suppressedOffers?.length > 0 || priceReasons.length > 0) && (
                          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Price Breakdown</h4>
                              <span className="text-[10px] font-mono bg-slate-700 text-slate-400 border border-slate-600 rounded px-1.5 py-0.5">RAOS-0002</span>
                            </div>

                            <div className="p-4 space-y-3">

                              {/* Applied offers */}
                              {priceState.appliedOffers?.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Applied Offers</div>
                                  <div className="space-y-1.5">
                                    {priceState.appliedOffers.map(offer => (
                                      <div key={offer.offerId} className="rounded border border-emerald-800/50 bg-emerald-950/30 px-3 py-2">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                              offer.type === 'member'     ? 'bg-emerald-900/60 text-emerald-300' :
                                              offer.type === 'bulk_tier'  ? 'bg-sky-900/60 text-sky-300' :
                                              offer.type === 'promo_sale' ? 'bg-purple-900/60 text-purple-300' :
                                              offer.type === 'promo_tier' ? 'bg-violet-900/60 text-violet-300' :
                                              'bg-slate-700 text-slate-300'
                                            }`}>
                                              {offer.type}
                                            </span>
                                            <span className="text-xs text-slate-300 truncate">{offer.description}</span>
                                          </div>
                                          <span className="text-xs font-bold text-emerald-300 shrink-0">${offer.unitPriceAfter.toFixed(2)}</span>
                                        </div>
                                        <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                                          <span>priority: {offer.priority}</span>
                                          <span>stackable: {String(offer.stackable)}</span>
                                          <span>exclusive: {String(offer.exclusive)}</span>
                                          <span className="ml-auto font-mono truncate text-slate-600">{offer.namespace.replace('com.os.retailagent.shopping.', '…')}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Suppressed offers */}
                              {priceState.suppressedOffers?.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Suppressed Offers</div>
                                  <div className="space-y-1.5">
                                    {priceState.suppressedOffers.map(offer => (
                                      <div key={offer.offerId} className="rounded border border-slate-700/60 bg-slate-900/40 px-3 py-2 opacity-75">
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono bg-slate-700 text-slate-400 line-through">
                                              {offer.type}
                                            </span>
                                            <span className="text-xs text-slate-500 truncate">{offer.description}</span>
                                          </div>
                                          <span className="text-[10px] font-mono text-amber-500/80 shrink-0">{offer.reason}</span>
                                        </div>
                                        <div className="mt-1 text-[10px] text-slate-600 font-mono">
                                          suppressedBy: {offer.suppressedBy}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Reason codes from pricing pipeline */}
                              {priceReasons.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Reason Codes</div>
                                  <div className="space-y-1">
                                    {priceReasons.map((r, i) => (
                                      <div key={i} className="flex items-start gap-2 text-xs">
                                        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                                          r.severity === 'BLOCK'     ? 'bg-rose-900/60 text-rose-300' :
                                          r.severity === 'CONDITION' ? 'bg-amber-900/60 text-amber-300' :
                                          'bg-slate-700 text-slate-400'
                                        }`}>
                                          {r.severity}
                                        </span>
                                        <span className="font-mono text-slate-400 shrink-0">{r.code}</span>
                                        <span className="text-slate-500 leading-snug">{r.message}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {view === 'technical' && (
                      <JsonViewer
                        title="Raw Extension Payload"
                        data={payload}
                        className="border-slate-700"
                      />
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="text-center text-slate-500 text-sm mt-10 px-4">
              <Info className="w-8 h-8 mx-auto mb-3 text-slate-600" />
              <p className="font-medium text-slate-300 mb-1">Click any product to inspect it</p>
              <p className="text-xs text-slate-500 leading-relaxed">The agent&apos;s visibility, pricing, and eligibility decision will appear here — in plain language or raw JSON.</p>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden shrink-0 border-t-2 border-slate-200 bg-white shadow-[0_-4px_12px_rgba(15,23,42,0.08)] px-3 py-2 flex gap-2">
        {([
          { panel: 'controls'  as const, icon: SlidersHorizontal, label: 'Controls',  desc: 'Buyer context' },
          { panel: 'catalog'   as const, icon: List,               label: 'Catalog',   desc: 'Browse products' },
          { panel: 'inspector' as const, icon: FileJson,           label: 'Inspector', desc: 'Agent decision' },
        ] as const).map(({ panel, icon: Icon, label, desc }) => {
          const isActive = mobilePanel === panel;
          const hasDot = panel === 'inspector' && inspectedItem && !isActive;
          return (
            <button
              key={panel}
              onClick={() => setMobilePanel(panel)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{label}</span>
              <span className={`text-[10px] font-normal leading-none ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>{desc}</span>
              {hasDot && (
                <span className="absolute top-2 right-2.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              )}
            </button>
          );
        })}
      </div>
    </div>
    {/* End app shell. Infographics live BELOW it in the scroll flow (desktop only). */}

      {/* RAOS-0007 Quote Integrity demo — self-contained, below the main playground */}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
        <QuoteSimulator />
      </div>

      {/* SVG infographics — desktop only; too complex for small screens */}
      <div className="hidden md:block">
        <DemoInfographics />
      </div>
    </div>
  );
}
