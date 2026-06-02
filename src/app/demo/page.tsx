'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { mockProducts } from '@/lib/mock/catalog';
import { mockMerchants } from '@/lib/mock/merchants';
import { PricingContext, CustomerType, MembershipTier, ComputedVisibility, ComputedEligibility, ComputedPriceState } from '@/lib/types/extensions';
import { CartLine } from '@/lib/types/core';
import { calculateEligibility, calculateVisibility } from '@/lib/rules/eligibility';
import { getApplicablePrice } from '@/lib/rules/pricing';
import { validateCartLine } from '@/lib/rules/cartValidation';
import { Panel } from '@/components/ui/Panel';
import { JsonViewer } from '@/components/ui/JsonViewer';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { DecisionCard } from '@/components/demo/DecisionCard';
import { merchantMeta } from '@/lib/mock/merchantMeta';
import { useView } from '@/lib/context/ViewContext';
import { ShoppingCart, Search, Info, X, Zap, SlidersHorizontal, List, FileJson } from 'lucide-react';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { DemoInfographics } from '@/components/demo/DemoInfographics';

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

type ScenarioId = 'boutique_discovery' | 'grocery_offers' | 'fulfillment_constraints' | 'wholesale_gating' | 'bulk_tier_pricing';

interface Scenario {
  id: ScenarioId;
  label: string;
  hint: string;
  context: Omit<PricingContext, 'activeExtensions'>;
  merchantFilter: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'boutique_discovery',
    label: 'Boutique Discovery',
    hint: 'A guest browses Boutique A. Notice the clean DTC payload — no membership flags, no gating. Any agent can recommend freely.',
    context: {
      customerType: 'guest',
      membershipTier: 'none',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: false,
    },
    merchantFilter: 'm_boutique_001',
  },
  {
    id: 'grocery_offers',
    label: 'Grocery Offers',
    hint: 'Weekly sale prices and mix-and-match promo tiers surface before checkout. Click a product to inspect the applied offer state in the payload.',
    context: {
      customerType: 'guest',
      membershipTier: 'none',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: false,
    },
    merchantFilter: 'm_grocery_003',
  },
  {
    id: 'fulfillment_constraints',
    label: 'Fulfillment Constraints',
    hint: 'Region is set to Hawaii. Fresh Organic Bananas is restricted in HI — the eligibility payload explains why it cannot be fulfilled here.',
    context: {
      customerType: 'guest',
      membershipTier: 'none',
      marketRegion: 'HI',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: false,
    },
    merchantFilter: 'm_grocery_003',
  },
  {
    id: 'wholesale_gating',
    label: 'Wholesale Gating',
    hint: 'Buyer is qualified: Wholesale + Resale Certificate. Items that were HIDDEN to guests are now visible and ELIGIBLE. Compare by removing the resale cert.',
    context: {
      customerType: 'wholesale',
      membershipTier: 'reseller_plus',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: true,
    },
    merchantFilter: 'm_wholesale_002',
  },
  {
    id: 'bulk_tier_pricing',
    label: 'Bulk Tier Pricing',
    hint: 'Add Industrial Coffee Beans to cart. Change quantity to 50, then 100 — watch the unit price drop as volume tier thresholds are crossed.',
    context: {
      customerType: 'wholesale',
      membershipTier: 'reseller_plus',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: true,
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
  const [context, setContext] = useState<PricingContext>({
    customerType: 'guest',
    membershipTier: 'none',
    marketRegion: 'US',
    fulfillmentMode: 'shipping',
    accountLinked: false,
    taxExempt: false,
    resaleCertificateOnFile: false,
    activeExtensions: []
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

  const [inspectorTab] = useState<'payload'>('payload');

  // Mobile panel navigation
  const [mobilePanel, setMobilePanel] = useState<'controls' | 'catalog' | 'inspector'>('catalog');

  // Business / Technical view from global context
  const { view, setView } = useView();

  // Helper — inspects an item and auto-navigates to inspector on mobile
  const inspectItem = (productId: string, variantId: string) => {
    setInspectedItem({ productId, variantId });
    setMobilePanel('inspector');
  };


  // Dynamically compute effective context based on selected merchant
  const effectiveContext = useMemo<PricingContext>(() => {
    let activeExts: string[] = [];
    if (merchantFilter === 'all') {
      activeExts = ['ext.pricing_context', 'ext.eligibility', 'ext.member_pricing', 'ext.bulk_pricing', 'ext.promo_pricing', 'ext.fulfillment_constraints'];
    } else {
      const activeM = mockMerchants.find(m => m.merchantId === merchantFilter);
      if (activeM) {
        activeExts = activeM.extensions.map(e => e.id);
      }
    }
    return { ...context, activeExtensions: activeExts };
  }, [context, merchantFilter]);

  const addToCart = (variantId: string, productId: string, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(line => line.variantId === variantId);
      if (existing) {
        return prev.map(line => line.variantId === variantId ? { ...line, quantity: line.quantity + quantity } : line);
      }
      return [...prev, { id: `line_${Date.now()}`, productId, variantId, quantity }];
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
    // Don't auto-navigate to inspector on mobile — let user land on catalog first
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyScenario = (scenarioId: ScenarioId) => {
    const scenario = SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;
    setContext({ ...scenario.context, activeExtensions: [] });
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
      membershipTier: 'none',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: false,
      taxExempt: false,
      resaleCertificateOnFile: false,
      activeExtensions: [],
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
          
          {/* Business & Wholesale Controls */}
          {(() => {
            const active = effectiveContext.activeExtensions.includes('ext.bulk_pricing') || effectiveContext.activeExtensions.includes('ext.member_pricing') || merchantFilter === 'all';
            return (
              <div className={`space-y-4 transition-opacity ${active ? '' : 'opacity-40'}`}>
                {!active && (
                  <button onClick={resetControls} className="w-full text-left text-[11px] text-slate-500 bg-slate-100 border border-dashed border-slate-300 rounded-md px-3 py-2 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                    Wholesale &amp; buyer controls — reset to unlock ↑
                  </button>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Customer Type</label>
                  <select
                    value={context.customerType}
                    onChange={(e) => setContext({ ...context, customerType: e.target.value as CustomerType })}
                    disabled={!active}
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white disabled:cursor-not-allowed"
                  >
                    <option value="guest">Guest</option>
                    <option value="member">Member</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="b2b">B2B</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Wholesale Account Tier</label>
                  <select
                    value={context.membershipTier}
                    onChange={(e) => setContext({ ...context, membershipTier: e.target.value as MembershipTier })}
                    disabled={!active || context.customerType === 'guest'}
                    className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white disabled:cursor-not-allowed"
                  >
                    <option value="none">None</option>
                    <option value="gold">Gold</option>
                    <option value="reseller_plus">Reseller Plus</option>
                    <option value="distributor">Distributor</option>
                  </select>
                </div>
                <div className="space-y-3 pt-2 border-b border-slate-200 pb-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={context.taxExempt} disabled={!active} onChange={e => setContext({ ...context, taxExempt: e.target.checked })} className="rounded text-slate-900 focus:ring-slate-900 disabled:cursor-not-allowed" />
                    <span className="text-sm text-slate-700">Tax Exempt</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={context.resaleCertificateOnFile} disabled={!active} onChange={e => setContext({ ...context, resaleCertificateOnFile: e.target.checked })} className="rounded text-slate-900 focus:ring-slate-900 disabled:cursor-not-allowed" />
                    <span className="text-sm text-slate-700">Resale Certificate on File</span>
                  </label>
                </div>
              </div>
            );
          })()}

          {/* Fulfillment Controls */}
          {(() => {
            const active = effectiveContext.activeExtensions.includes('ext.fulfillment_constraints') || merchantFilter === 'all';
            return (
              <div className={`space-y-2 transition-opacity ${active ? '' : 'opacity-40'}`}>
                {!active && (
                  <button onClick={resetControls} className="w-full text-left text-[11px] text-slate-500 bg-slate-100 border border-dashed border-slate-300 rounded-md px-3 py-2 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                    Fulfillment controls — reset to unlock ↑
                  </button>
                )}
                <label className="text-sm font-medium text-slate-700">Fulfillment Mode</label>
                <select
                  value={context.fulfillmentMode}
                  onChange={(e) => setContext({ ...context, fulfillmentMode: e.target.value as any })}
                  disabled={!active}
                  className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm bg-white disabled:cursor-not-allowed"
                >
                  <option value="shipping">Shipping</option>
                  <option value="pickup">Store Pickup</option>
                  <option value="local_delivery">Local Delivery</option>
                </select>
              </div>
            );
          })()}

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
            <span className="text-xs font-medium text-white border-b-2 border-white pb-0.5">Payload</span>
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="text-[10px] bg-slate-700 text-slate-400 border border-slate-600 rounded px-1.5 py-0.5 leading-none">Phase 2</span>
              Agent Reasoning Console — coming next
            </span>
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
                
                const visibility = calculateVisibility(variant, effectiveContext);
                const eligibility = calculateEligibility(variant, effectiveContext);
                const priceState = getApplicablePrice(variant, quantity, effectiveContext);
                
                const merchant = mockMerchants.find(m => m.merchantId === product.merchantId)!;
                
                const itemEffectiveContext = {
                  ...effectiveContext,
                  activeExtensions: merchant.extensions.map(e => e.id)
                };

                const isBoutique = product.merchantId === 'm_boutique_001';
                
                // Strip out isMemberPrice from boutique
                const { isMemberPrice, ...boutiquePriceState } = priceState;
                const finalPriceState = isBoutique ? boutiquePriceState : priceState;
                
                const payload = {
                  pricing_context: itemEffectiveContext,
                  extensions: {
                    visibility,
                    eligibility,
                    pricing: finalPriceState,
                    ...(variant.bulkPricing ? { bulk_pricing_rules: variant.bulkPricing } : {}),
                    ...(variant.promoPricing ? { promo_pricing_rules: variant.promoPricing } : {}),
                    ...(variant.fulfillmentConstraints ? { fulfillment_constraints: variant.fulfillmentConstraints } : {}),
                    // safe to conditionally omit member pricing rules for Boutique
                  }
                };

                const meta = merchantMeta[product.merchantId];

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
                                  {eligibility.reasons.map((r, i) => <li key={i}>{r.message}</li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
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

      {/* SVG infographics — desktop only; too complex for small screens */}
      <div className="hidden md:block">
        <DemoInfographics />
      </div>
    </div>
  );
}
