'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, ShoppingCart } from 'lucide-react';
import { createRetailAgentWebMcp, type CartResult, type PlanDecision, type QuoteResult, type WebMcpRegistration, type WebMcpTelemetryEvent, type WebMcpToolName } from '../../../packages/webmcp/src';
import { createShowcaseBrowserGateway } from '@/lib/showcase/browser-gateway';
import type { ShowcaseStoreId } from '@/lib/showcase/gateway';
import { ShowcaseHero } from '@/components/showcase/ShowcaseHero';
import { MissionLauncher } from '@/components/showcase/MissionLauncher';
import { ScenarioSelector, ScenarioProducts } from '@/components/showcase/ScenarioSelector';
import { ShopperApprovalCard, type Approval } from '@/components/showcase/ShopperApprovalCard';
import { MissionTimeline } from '@/components/showcase/MissionTimeline';
import { DecisionSummary } from '@/components/showcase/DecisionSummary';
import { DeveloperEvidence } from '@/components/showcase/DeveloperEvidence';

type Scenario = 'fresh' | 'custom';
type MissionMode = 'idle' | 'native' | 'guided';

const freshLines = [{ productId: 'v_g_inv_002_1', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 1 }];
const customLines = [{ productId: 'v_customhub_quote_001', quantity: 25 }];
const freshBudget = { amount: 25, currency: 'USD' } as const;
const prompts = {
  fresh: `Build a dinner and tomorrow’s lunch cart under $${freshBudget.amount} using local delivery. If inventory cannot be trusted, show me a valid substitute and wait for my approval. Prepare a cart for review, but do not check out.`,
  custom: 'I need 25 customized robotics-team shirts in mixed adult sizes, delivered to Brooklyn by September 15, with a budget under $500. Use valid merchant pricing, but do not invent a fixed price or place an order if merchant review is required.',
};

export default function AgentReadyStorefront() {
  const [scenario, setScenario] = useState<Scenario>('fresh');
  const [registration, setRegistration] = useState<WebMcpRegistration | null>(null);
  const [registering, setRegistering] = useState(true);
  const [registrationError, setRegistrationError] = useState(false);
  const [decision, setDecision] = useState<PlanDecision | null>(null);
  const [cart, setCart] = useState<CartResult['cart']>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [events, setEvents] = useState<WebMcpTelemetryEvent[]>([]);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [currentState, setCurrentState] = useState('initial');
  const [mode, setMode] = useState<MissionMode>('idle');
  const [busy, setBusy] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [browserTools, setBrowserTools] = useState<string[] | null>(null);
  const registrationRef = useRef<WebMcpRegistration | null>(null);
  const executionRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    executionRef.current?.abort();
    approval?.resolve('declined');
    registrationRef.current?.dispose();
    setDecision(null); setCart(null); setQuote(null); setEvents([]); setApproval(null); setBrowserTools(null);
    setCurrentState('initial'); setMode('idle'); setBusy(false); setRegistering(true); setRegistrationError(false);
    setGeneration((value) => value + 1);
  }, [approval]);
  const switchScenario = (next: Scenario) => { if (next === scenario) return; setScenario(next); reset(); };

  useEffect(() => {
    let disposed = false;
    const storefrontId: ShowcaseStoreId = scenario === 'fresh' ? 'fresh-corner' : 'thecustomhub';
    const storefrontSessionId = `${storefrontId}-${generation + 1}`;
    const sdk = createRetailAgentWebMcp({
      gateway: createShowcaseBrowserGateway(storefrontId, storefrontSessionId),
      storefront: {
        getBuyerContext: () => ({ marketRegion: 'US', fulfillmentMode: scenario === 'fresh' ? 'local_delivery' : 'shipping', contextSource: 'controlled_fixture' }),
        onDecision: (value) => { if (!disposed) setDecision(value); },
        onCart: (result) => { if (!disposed) setCart(result.cart); },
        onQuote: (result) => { if (!disposed) setQuote(result); },
        onLifecycle: (event) => {
          if (disposed) return;
          setEvents((items) => [...items.slice(-39), event]);
          if (event.nextState) setCurrentState(event.nextState);
          if (event.lifecycle === 'invoked') setMode(event.source === 'native' ? 'native' : 'guided');
          if (event.lifecycle === 'registered' || event.lifecycle === 'unregistered') {
            void registrationRef.current?.getNativeToolNames?.().then((observed) => { if (!disposed) setBrowserTools(observed); });
          }
        },
        requestRepairApproval: (proposal, context) => new Promise((resolve) => {
          const cancel = () => { if (!disposed) setApproval(null); resolve('declined'); };
          context.signal.addEventListener('abort', cancel, { once: true });
          if (!disposed) setApproval({ proposal, resolve: (result) => { context.signal.removeEventListener('abort', cancel); setApproval(null); resolve(result); } });
        }),
      },
    });
    sdk.register()
      .then(async (result) => {
        if (disposed) return;
        registrationRef.current = result; setRegistration(result);
        const observed = await result.getNativeToolNames?.();
        if (!disposed && observed) setBrowserTools(observed);
      })
      .catch(() => { if (!disposed) setRegistrationError(true); })
      .finally(() => { if (!disposed) setRegistering(false); });
    return () => { disposed = true; executionRef.current?.abort(); registrationRef.current?.dispose(); registrationRef.current = null; };
  }, [scenario, generation]);

  /** Guided replay: invokes the exact canonical descriptors through registration.invoke(), which
   * always tags the call `source: 'replay'` — available whether or not a native agent is connected. */
  async function runGuidedMission() {
    const current = registrationRef.current;
    if (!current) return;
    setBusy(true); setDecision(null); setCart(null); setQuote(null);
    const controller = new AbortController(); executionRef.current = controller;
    try {
      await current.invoke('get_storefront_capabilities', {}, controller.signal);
      if (scenario === 'fresh') {
        await current.invoke('search_catalog', { query: 'eggs', limit: 4 }, controller.signal);
        const evaluated = await current.invoke('evaluate_shopping_plan', { lines: freshLines, budget: freshBudget, substitutionsAllowed: true }, controller.signal) as unknown as PlanDecision;
        if (evaluated.status === 'REPAIRABLE') await current.invoke('find_valid_alternatives', { decisionId: evaluated.decisionId, lines: freshLines }, controller.signal);
        const repair = evaluated.alternatives[0];
        if (repair) {
          const applied = await current.invoke('apply_plan_repair', { decisionId: evaluated.decisionId, repairId: repair.repairId, lines: freshLines, idempotencyKey: `fresh-repair-${generation + 1}-${Date.now()}` }, controller.signal) as { status?: string; decision?: PlanDecision; lines?: typeof freshLines };
          if (applied.status === 'APPLIED' && applied.decision && applied.lines) {
            await current.invoke('prepare_validated_cart', { decisionId: applied.decision.decisionId, lines: applied.lines, idempotencyKey: `fresh-cart-${generation + 1}-${Date.now()}` }, controller.signal);
          }
        }
      } else {
        await current.invoke('search_catalog', { query: 'robotics', limit: 4 }, controller.signal);
        const evaluated = await current.invoke('evaluate_shopping_plan', { lines: customLines, budget: { amount: 500, currency: 'USD' }, requestedDeliveryWindow: 'Brooklyn by September 15' }, controller.signal) as unknown as PlanDecision;
        if (evaluated.status === 'QUOTE_REQUIRED') {
          await current.invoke('request_quote', { productId: 'v_customhub_quote_001', quantity: 25, requirements: 'Mixed adult sizes, robotics-team personalization, delivery to Brooklyn by September 15 (unconfirmed — requires merchant review).', idempotencyKey: `custom-quote-${generation + 1}-${Date.now()}` }, controller.signal);
        }
      }
    } finally { setBusy(false); executionRef.current = null; }
  }

  const native = Boolean(registration?.supported);
  const guidedActive = mode === 'guided';
  const activeTools = native ? registration?.registeredTools ?? [] : registration?.getReplayTools() ?? [];
  const parity = browserTools === null ? 'Browser observation unavailable' : browserTools.length === activeTools.length && browserTools.every((tool) => activeTools.includes(tool as WebMcpToolName)) ? 'Parity verified' : 'Registry mismatch';
  const withheld: (WebMcpToolName | 'checkout')[] = scenario === 'custom' ? ['prepare_validated_cart', 'checkout'] : decision?.status === 'REPAIRABLE' ? ['prepare_validated_cart', 'checkout'] : ['checkout'];
  const storefrontId = scenario === 'fresh' ? 'fresh-corner' : 'thecustomhub';
  const storefrontSessionId = `${storefrontId}-${generation + 1}`;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm sm:px-6">
          <strong>RetailAgentOS · WebMCP retail mission</strong>
          <span>Scenario: <b>{scenario === 'fresh' ? 'Fresh Corner Market' : 'TheCustomHub'}</b></span>
          <button onClick={reset} className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-md border border-slate-300 px-3 font-medium">
            <RefreshCw size={14} /> Reset
          </button>
        </div>
      </div>

      <ShowcaseHero />

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <ScenarioSelector scenario={scenario} onSelect={switchScenario} />
      </section>

      <MissionLauncher
        registering={registering}
        native={native}
        registrationError={registrationError}
        prompt={prompts[scenario]}
        guidedActive={guidedActive || busy}
        guidedBusy={busy}
        onRunGuided={runGuidedMission}
      />

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-4">
            <h2 className="font-bold text-slate-900">Shopper & storefront</h2>
            <div className="mt-3 space-y-2">
              <ScenarioProducts scenario={scenario} />
            </div>
            <ShopperApprovalCard approval={approval} />
            {cart && (
              <div aria-live="polite" className="mt-4 rounded-lg bg-emerald-50 p-3">
                <b className="flex items-center gap-1 text-emerald-900"><ShoppingCart size={16} /> Validated cart prepared</b>
                {cart.lines.map((line) => <p key={line.productId} className="mt-1 text-sm text-emerald-900">{line.quantity} × {line.title} · ${line.price?.toFixed(2)}</p>)}
                <p className="mt-2 text-sm font-semibold text-emerald-900">Total: ${cart.total?.toFixed(2)} {cart.currency}</p>
                <p className="mt-1 text-xs text-emerald-800">Checkout is unavailable.</p>
              </div>
            )}
            {quote && (
              <div aria-live="polite" className="mt-4 rounded-lg bg-slate-950 p-3 text-white">
                <b>Merchant quote requested</b>
                <p className="mt-1 text-sm break-all">Reference: {quote.requestReference}</p>
                <p className="text-sm">fixedPrice: null · No cart · No order · No checkout</p>
              </div>
            )}
          </section>

          <div className="lg:col-span-5">
            <MissionTimeline
              events={events}
              native={native}
              guidedActive={guidedActive}
              activeTools={activeTools}
              withheldTools={withheld}
              currentState={currentState}
            />
          </div>

          <div className="lg:col-span-3">
            <DecisionSummary decision={decision} quote={quote} />
          </div>
        </div>

        <DeveloperEvidence
          scenario={scenario}
          storefrontId={storefrontId}
          storefrontSessionId={storefrontSessionId}
          native={native}
          activeTools={activeTools}
          browserTools={browserTools}
          parity={parity}
          events={events}
          customHubDisclosure
        />
      </section>
    </main>
  );
}
