'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, ShoppingCart } from 'lucide-react';
import { createRetailAgentWebMcp, type PlanDecision, type QuoteResult, type RegistrationSource, type RepairProposal, type ReviseCartResult, type WebMcpRegistration, type WebMcpTelemetryEvent, type WebMcpToolName } from '../../../packages/webmcp/src';
import { createShowcaseBrowserGateway } from '@/lib/showcase/browser-gateway';
import type { ShowcaseStoreId } from '@/lib/showcase/gateway';
import { ShowcaseHero } from '@/components/showcase/ShowcaseHero';
import { MissionLauncher } from '@/components/showcase/MissionLauncher';
import { ScenarioSelector, ScenarioProducts } from '@/components/showcase/ScenarioSelector';
import { ShopperApprovalCard, type Approval } from '@/components/showcase/ShopperApprovalCard';
import { MissionTimeline } from '@/components/showcase/MissionTimeline';
import { DecisionSummary } from '@/components/showcase/DecisionSummary';
import { DeveloperEvidence } from '@/components/showcase/DeveloperEvidence';
import { CartRevisionPanel, type DisplayCart, type RevisionState } from '@/components/showcase/CartRevisionPanel';
import { formatCartLineDisplay } from '@/lib/showcase/cartLineDisplay';

type Scenario = 'fresh' | 'custom';
type MissionMode = 'idle' | 'native' | 'guided';

const freshLines = [{ productId: 'v_g_inv_002_1', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 1 }];
const customLines = [{ productId: 'v_customhub_quote_001', quantity: 25 }];
const freshBudget = { amount: 25, currency: 'USD' } as const;
const revisedFreshLines = [{ productId: 'v_fresh_cagefree_001', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 2 }];
const prompts = {
  fresh: `Build a dinner-and-lunch cart under $${freshBudget.amount} using Fresh Corner's available local-delivery mode. If inventory cannot be trusted, show me a valid substitute and wait for my approval. Prepare a cart for review, but do not check out.`,
  custom: 'I need 25 customized robotics-team shirts in mixed adult sizes, delivered to Brooklyn by September 15, with a budget under $500. Use valid merchant pricing, but do not invent a fixed price or place an order if merchant review is required.',
};

export default function AgentReadyStorefront() {
  const [scenario, setScenario] = useState<Scenario>('fresh');
  const [registration, setRegistration] = useState<WebMcpRegistration | null>(null);
  const [registering, setRegistering] = useState(true);
  const [registrationError, setRegistrationError] = useState(false);
  const [decision, setDecision] = useState<PlanDecision | null>(null);
  const [cart, setCart] = useState<DisplayCart | null>(null);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [events, setEvents] = useState<WebMcpTelemetryEvent[]>([]);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [approvedOnce, setApprovedOnce] = useState(false);
  /** The repair the shopper approved, kept visible (as a completed step, not a vanished card) until
   * the next reset/mission run. Distinct from `approval`, which only holds a *pending* decision. */
  const [approvedProposal, setApprovedProposal] = useState<RepairProposal | null>(null);
  /** Which actor invoked `prepare_validated_cart` for the currently visible cart: the real browser
   * agent ('native') or the guided replay ('replay'). Never a UI click. */
  const [cartInvocationSource, setCartInvocationSource] = useState<RegistrationSource | null>(null);
  /** The authoritative RetailAgentOS `code`/`nextAction` from the most recent cart preparation or
   * revision response — never recomputed in React, only read from the gateway result that already
   * carries it (`CartResult.code`/`nextAction`, `ReviseCartResult.code`/`nextAction`). */
  const [cartOutcome, setCartOutcome] = useState<{ code: string; nextAction: string } | null>(null);
  const [currentState, setCurrentState] = useState('initial');
  const [mode, setMode] = useState<MissionMode>('idle');
  const [busy, setBusy] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [browserTools, setBrowserTools] = useState<string[] | null>(null);
  const [revisionState, setRevisionState] = useState<RevisionState>('idle');
  const [revisionResult, setRevisionResult] = useState<ReviseCartResult | null>(null);
  const [previousCart, setPreviousCart] = useState<DisplayCart | null>(null);
  const [revisionBusy, setRevisionBusy] = useState(false);
  const registrationRef = useRef<WebMcpRegistration | null>(null);
  const executionRef = useRef<AbortController | null>(null);
  const cartRef = useRef<DisplayCart | null>(null);
  useEffect(() => { cartRef.current = cart; }, [cart]);

  const reset = useCallback(() => {
    executionRef.current?.abort();
    approval?.resolve('declined');
    registrationRef.current?.dispose();
    setDecision(null); setCart(null); setQuote(null); setEvents([]); setApproval(null); setApprovedOnce(false); setBrowserTools(null);
    setCurrentState('initial'); setMode('idle'); setBusy(false); setRegistering(true); setRegistrationError(false);
    setRevisionState('idle'); setRevisionResult(null); setPreviousCart(null); setRevisionBusy(false);
    setApprovedProposal(null); setCartInvocationSource(null); setCartOutcome(null);
    setGeneration((value) => value + 1);
  }, [approval]);
  const switchScenario = (next: Scenario) => { if (next === scenario) return; setScenario(next); reset(); };

  useEffect(() => {
    let disposed = false;
    const storefrontId: ShowcaseStoreId = scenario === 'fresh' ? 'fresh-corner' : 'thecustomhub';
    const storefrontSessionId = `${storefrontId}-${generation + 1}`;
    const sdk = createRetailAgentWebMcp({
      gateway: createShowcaseBrowserGateway(storefrontId, storefrontSessionId),
      // The optional cart-revision extension is only ever enabled for the controlled Fresh Corner
      // scenario — TheCustomHub remains quote-only and never registers `revise_validated_cart`.
      enableCartRevision: scenario === 'fresh',
      storefront: {
        getBuyerContext: () => ({ marketRegion: 'US', fulfillmentMode: scenario === 'fresh' ? 'local_delivery' : 'shipping', contextSource: 'controlled_fixture' }),
        onDecision: (value) => { if (!disposed) setDecision(value); },
        onCart: (result) => {
          if (disposed) return;
          setCart(result.cart as DisplayCart | null);
          // Authoritative status text straight from the RetailAgentOS gateway response — never
          // recomputed in React. Only overwrite it once a cart actually exists (`CART_PREPARED`);
          // an unsuccessful preparation keeps whatever decision-driven summary was already showing.
          if (result.cart) setCartOutcome({ code: result.code, nextAction: result.nextAction });
        },
        onQuote: (result) => { if (!disposed) setQuote(result); },
        onCartRevision: (result) => {
          if (disposed) return;
          setRevisionResult(result);
          if (result.status === 'REVISED' && result.cart) {
            setPreviousCart(cartRef.current);
            setCart(result.cart as DisplayCart);
            setRevisionState('revised');
            setCartOutcome({ code: result.code, nextAction: result.nextAction });
          } else if (result.status === 'REPAIR_REQUIRED') {
            setRevisionState('requires_approval');
          } else {
            setRevisionState('withheld');
          }
        },
        onLifecycle: (event) => {
          if (disposed) return;
          setEvents((items) => [...items.slice(-39), event]);
          if (event.nextState) setCurrentState(event.nextState);
          if (event.lifecycle === 'invoked') setMode(event.source === 'native' ? 'native' : 'guided');
          if (event.tool === 'revise_validated_cart') {
            if (event.lifecycle === 'registered') setRevisionState('available');
            if (event.lifecycle === 'unregistered') setRevisionState('idle');
            if (event.lifecycle === 'invoked') setRevisionState('revising');
            if (event.lifecycle === 'failed' || event.lifecycle === 'cancelled') setRevisionState('error');
          }
          // Real WebMCP telemetry, not the approval click, is what invokes cart preparation — this
          // attributes the "Browser agent / guided replay invocation" step of the approval sequence.
          // (`registered`/`unregistered` lifecycle events only fire when a native `document.modelContext`
          // exists — see packages/webmcp/src/index.ts's `transition()` — so this deliberately keys off
          // `invoked`, the one prepare_validated_cart telemetry event guaranteed in both native and
          // guided-replay paths.)
          if (event.tool === 'prepare_validated_cart' && event.lifecycle === 'invoked') setCartInvocationSource(event.source);
          if (event.lifecycle === 'registered' || event.lifecycle === 'unregistered') {
            void registrationRef.current?.getNativeToolNames?.().then((observed) => { if (!disposed) setBrowserTools(observed); });
          }
        },
        requestRepairApproval: (proposal, context) => new Promise((resolve) => {
          const cancel = () => { if (!disposed) setApproval(null); resolve('declined'); };
          context.signal.addEventListener('abort', cancel, { once: true });
          if (!disposed) setApproval({ proposal, resolve: (result) => { context.signal.removeEventListener('abort', cancel); setApproval(null); if (result === 'approved' && !disposed) { setApprovedOnce(true); setApprovedProposal(proposal); } resolve(result); } });
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
    setRevisionState('idle'); setRevisionResult(null); setPreviousCart(null);
    setApprovedProposal(null); setCartInvocationSource(null); setCartOutcome(null);
    const controller = new AbortController(); executionRef.current = controller;
    try {
      await current.invoke('get_storefront_capabilities', {}, controller.signal);
      if (scenario === 'fresh') {
        await current.invoke('search_catalog', { query: 'eggs', limit: 4 }, controller.signal);
        const evaluated = await current.invoke('evaluate_shopping_plan', { lines: freshLines, budget: freshBudget, fulfillmentMode: 'local_delivery', substitutionsAllowed: true }, controller.signal) as unknown as PlanDecision;
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

  /** Guided replay of the optional cart-revision extension: same descriptor, same gateway handler,
   * `registration.invoke()` always tags the call `source: 'replay'`. Never runs automatically — it
   * is only ever triggered by an explicit click on "Watch guided cart revision". */
  async function runGuidedCartRevision() {
    const current = registrationRef.current; const activeCart = cartRef.current;
    if (!current || scenario !== 'fresh' || !activeCart) return;
    setRevisionBusy(true);
    const controller = new AbortController(); executionRef.current = controller;
    try {
      await current.invoke('revise_validated_cart', { cartReference: activeCart.reference, expectedRevision: activeCart.revision ?? 1, lines: revisedFreshLines, idempotencyKey: `fresh-revise-${generation + 1}-${Date.now()}` }, controller.signal);
    } finally { setRevisionBusy(false); executionRef.current = null; }
  }

  const native = Boolean(registration?.supported);
  const guidedActive = mode === 'guided';
  const activeTools = native ? registration?.registeredTools ?? [] : registration?.getReplayTools() ?? [];
  // Real, decision-authority-driven signal, not the approval click: RetailAgentOS reaching an
  // ELIGIBLE decision (from `onDecision`, real telemetry either way) is exactly what makes
  // `prepare_validated_cart` a safe next action — and, once a native `document.modelContext` exists,
  // exactly when it actually registers. `registered`/`unregistered` lifecycle *events* only fire in
  // that native case (see packages/webmcp/src/index.ts's `transition()`), so keying this off the
  // decision status instead of the event keeps it accurate for guided replay too, and — unlike
  // `activeTools` membership, which moves on again once the cart is prepared — it stays a true,
  // permanent record of that step once reached.
  const cartCapabilityUnlocked = Boolean(cart) || decision?.status === 'ELIGIBLE';
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
            <ShopperApprovalCard
              approval={approval}
              approvedProposal={approvedProposal}
              cartCapabilityUnlocked={cartCapabilityUnlocked}
              cartPrepared={Boolean(cart)}
              invocationSource={cartInvocationSource}
            />
            {cart && (
              <div aria-live="polite" data-cart-reference={cart.reference} data-cart-revision={cart.revision ?? 1} className="mt-4 rounded-lg bg-emerald-50 p-3">
                <b className="flex items-center gap-1 text-emerald-900"><ShoppingCart size={16} /> Validated cart prepared</b>
                {cart.lines.map((line) => {
                  const { unitPriceLabel, totalLabel, showLineTotal } = formatCartLineDisplay(line);
                  return (
                    <p key={line.productId} className="mt-1 text-sm text-emerald-900">
                      {line.quantity} × {line.title} · {showLineTotal ? `${unitPriceLabel} × ${line.quantity} = ${totalLabel}` : unitPriceLabel}
                    </p>
                  );
                })}
                <p className="mt-2 text-sm font-semibold text-emerald-900">Total: ${cart.total?.toFixed(2)} {cart.currency}</p>
                <p className="mt-1 text-xs text-emerald-800">Checkout is unavailable.</p>
              </div>
            )}
            {scenario === 'fresh' && cart && (
              <CartRevisionPanel
                visible
                native={native}
                registering={registering}
                revisionState={revisionState}
                revisionGuidedActive={mode === 'guided' && (revisionBusy || revisionState === 'revised' || revisionState === 'withheld' || revisionState === 'requires_approval')}
                revisionBusy={revisionBusy}
                cart={cart}
                previousCart={previousCart}
                withheldReason={revisionResult && revisionResult.status !== 'REVISED' ? revisionResult.nextAction : null}
                onRunGuidedRevision={runGuidedCartRevision}
              />
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
            <DecisionSummary decision={decision} quote={quote} cart={cart} approvedOnce={approvedOnce} cartOutcome={cartOutcome} />
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
          cartRevision={revisionResult}
        />
      </section>
    </main>
  );
}
