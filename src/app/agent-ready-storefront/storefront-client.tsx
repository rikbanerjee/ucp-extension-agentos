'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
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
const freshBudget = { amount: 30, currency: 'USD' } as const;
const revisedFreshLines = [{ productId: 'v_fresh_cagefree_001', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 2 }];
const prompts = {
  fresh: `Build a weekend breakfast cart under $${freshBudget.amount} from Fresh Corner Market using local delivery. Include one dozen Farm Eggs and one Artisan Sourdough Bread loaf. If the Farm Eggs inventory cannot be trusted, show me one merchant-valid substitute, explain the price difference, and wait for my approval. After I approve, prepare the cart for review, but do not check out.`,
  custom: 'I need 25 customized robotics-team shirts in mixed adult sizes, delivered to Brooklyn within 15 days, with a budget under $500. Use valid merchant pricing, but do not invent a fixed price or place an order if merchant review is required.',
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
  /** True once a real `prepare_validated_cart` `registered` lifecycle event has fired — the
   * telemetry-driven signal for the "WebMCP capability" step, distinct from (and more truthful
   * than) `decision?.status === 'ELIGIBLE'`, which can arrive slightly before registration actually
   * completes. Sticky for the run once true, cleared only by reset()/scenario switch. */
  const [prepareCartRegistered, setPrepareCartRegistered] = useState(false);
  /** Set only from the recovery timer's callback (never synchronously in the effect body) once
   * ~5s have elapsed with the capability registered but no invocation/cart. Combined below with the
   * derived "waiting" condition to produce the recovery phase shown to the shopper. */
  const [recoveryTimedOut, setRecoveryTimedOut] = useState(false);
  const [fallbackBusy, setFallbackBusy] = useState(false);
  /**
   * Cart-preparation state, distinct from mere invocation attribution (`cartInvocationSource`,
   * which fires on the telemetry `invoked` event — before the outcome is known). `'invoking'` opens
   * as soon as a `prepare_validated_cart` invocation begins (native or guided, whichever comes
   * first); it resolves to `'prepared'` only once a real cart exists (`onCart` with a non-null
   * cart), or to `'failed'` when the attempt ends with no cart — a thrown/cancelled invocation
   * (telemetry `failed`/`cancelled`) or one that completed without error but the revalidated
   * decision was no longer eligible (`onCart` with a null cart). `'failed'` always releases the
   * single-flight lock below so an explicit guided retry is possible — this state, and the lock
   * release, are the only things this pass adds; nothing here ever retries automatically.
   */
  const [cartPreparationState, setCartPreparationState] = useState<'idle' | 'invoking' | 'failed' | 'prepared'>('idle');
  /** Truthful, bounded error surfaced from the failed attempt's own RetailAgentOS `code`/`nextAction`
   * (from the gateway response, or the WebMCP telemetry event's `error` for a thrown/cancelled
   * attempt) — never invented copy. Cleared on a new attempt or once a cart is prepared. */
  const [fallbackError, setFallbackError] = useState<{ code: string; nextAction: string } | null>(null);
  const registrationRef = useRef<WebMcpRegistration | null>(null);
  const executionRef = useRef<AbortController | null>(null);
  const cartRef = useRef<DisplayCart | null>(null);
  // Single-flight guard for prepare_validated_cart: prevents the guided fallback and a resuming
  // native browser agent from both preparing a cart. Not Date.now()-based — a plain in-memory lock
  // scoped to this mission's registration/generation, cleared on reset/scenario change, and released
  // on a failed/cancelled attempt that produced no cart so an explicit retry is possible.
  const cartPreparationInFlightRef = useRef(false);
  const missionControlRef = useRef<HTMLDivElement>(null);
  const approvalRef = useRef<HTMLDivElement>(null);
  const approvalHeadingRef = useRef<HTMLHeadingElement>(null);
  const cartRefElement = useRef<HTMLDivElement>(null);
  const scrollWorkRef = useRef<number | null>(null);
  useEffect(() => { cartRef.current = cart; }, [cart]);

  const guideViewport = useCallback((target: RefObject<HTMLElement | null>) => {
    if (typeof window === 'undefined' || !target.current) return;
    if (scrollWorkRef.current !== null) window.cancelAnimationFrame(scrollWorkRef.current);
    scrollWorkRef.current = window.requestAnimationFrame(() => {
      const element = target.current;
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      const outside = bounds.bottom < 0 || bounds.top > window.innerHeight;
      if (outside) element.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      element.focus({ preventScroll: true });
      scrollWorkRef.current = null;
    });
  }, []);

  useEffect(() => () => { if (scrollWorkRef.current !== null) window.cancelAnimationFrame(scrollWorkRef.current); }, []);

  const reset = useCallback(() => {
    executionRef.current?.abort();
    approval?.resolve('declined');
    registrationRef.current?.dispose();
    setDecision(null); setCart(null); setQuote(null); setEvents([]); setApproval(null); setApprovedOnce(false); setBrowserTools(null);
    setCurrentState('initial'); setMode('idle'); setBusy(false); setRegistering(true); setRegistrationError(false);
    setRevisionState('idle'); setRevisionResult(null); setPreviousCart(null); setRevisionBusy(false);
    setApprovedProposal(null); setCartInvocationSource(null); setCartOutcome(null);
    setPrepareCartRegistered(false); setRecoveryTimedOut(false); setFallbackBusy(false);
    setCartPreparationState('idle'); setFallbackError(null);
    cartPreparationInFlightRef.current = false;
    setGeneration((value) => value + 1);
  }, [approval]);
  const switchScenario = (next: Scenario) => { if (next === scenario) return; setScenario(next); reset(); };

  useEffect(() => {
    if (mode === 'guided' && busy) guideViewport(missionControlRef);
  }, [busy, guideViewport, mode]);
  useEffect(() => {
    if (approval) {
      guideViewport(approvalRef);
      const focusWork = window.requestAnimationFrame(() => approvalHeadingRef.current?.focus({ preventScroll: true }));
      return () => window.cancelAnimationFrame(focusWork);
    }
  }, [approval, guideViewport]);
  useEffect(() => {
    if (cart) guideViewport(cartRefElement);
  }, [cart, guideViewport]);

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
          if (result.cart) {
            setCartOutcome({ code: result.code, nextAction: result.nextAction });
            setCartPreparationState('prepared'); setFallbackError(null);
            cartPreparationInFlightRef.current = true; // a cart now exists — permanently locked
          } else {
            // A completed (non-throwing) attempt that still produced no cart — e.g. the decision was
            // no longer ELIGIBLE by the time RetailAgentOS revalidated it. No cart exists, so release
            // the single-flight lock and surface the gateway's own truthful code/nextAction; only an
            // explicit retry click can try again.
            setCartPreparationState('failed'); setFallbackError({ code: result.code, nextAction: result.nextAction });
            cartPreparationInFlightRef.current = false;
          }
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
          if (event.tool === 'prepare_validated_cart' && event.lifecycle === 'invoked') {
            setCartInvocationSource(event.source);
            setCartPreparationState('invoking'); setFallbackError(null);
            cartPreparationInFlightRef.current = true;
          }
          // A thrown or cancelled prepare_validated_cart attempt never reaches `onCart` — no cart
          // exists — so release the single-flight lock here and show a truthful, bounded error.
          // Never retried automatically; only an explicit guided-retry click invokes it again.
          if (event.tool === 'prepare_validated_cart' && (event.lifecycle === 'failed' || event.lifecycle === 'cancelled')) {
            setCartPreparationState('failed');
            setFallbackError({ code: event.error ?? (event.lifecycle === 'cancelled' ? 'CANCELLED' : 'PREPARE_CART_FAILED'), nextAction: event.lifecycle === 'cancelled' ? 'The request was cancelled.' : 'Review the request and try again.' });
            cartPreparationInFlightRef.current = false;
          }
          // The true "WebMCP capability" signal (see ShopperApprovalCard step 2): a real registered
          // lifecycle event for prepare_validated_cart, which — with the registration-before-return
          // fix in packages/webmcp/src/index.ts — is guaranteed to have already fired by the time a
          // native browser agent observes apply_plan_repair's result.
          if (event.tool === 'prepare_validated_cart' && event.lifecycle === 'registered') setPrepareCartRegistered(true);
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

  /** Cross-agent recovery timer (spec item E): once prepare_validated_cart is genuinely registered
   * and neither invocation nor a cart has happened yet, show a "waiting" message, then a "paused"
   * recovery message with a guided fallback after ~5s. Cancelled the instant an invocation begins
   * (native or guided), a cart already exists, or the run resets/switches scenario — the effect
   * cleanup (on any dependency change, including the reset triggered by a new `generation`) clears
   * the pending timer so it can never fire against a stale mission. */
  const recoveryWaiting = prepareCartRegistered && !cartInvocationSource && !cart;
  useEffect(() => {
    if (!recoveryWaiting) return;
    const timer = setTimeout(() => setRecoveryTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [recoveryWaiting, generation]);
  const recoveryPhase: 'none' | 'waiting' | 'timeout' = !recoveryWaiting ? 'none' : recoveryTimedOut ? 'timeout' : 'waiting';

  const copyContinuationPrompt = useCallback(() => {
    const text = 'Continue the approved mission. Discover the newly registered WebMCP tools and invoke prepare_validated_cart using the eligible decision and approved lines. Prepare the cart for review, but do not check out.';
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) void navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  /** Guided fallback (spec item E/F): invokes prepare_validated_cart through registration.invoke()
   * — the same canonical descriptor and gateway handler as every other guided path, always tagged
   * source: 'replay'. Requires an explicit shopper click; never runs automatically. Single-flight
   * guarded so a native browser agent resuming at the same moment cannot produce a second cart —
   * the guard is the lock/`cart` themselves, never `cartInvocationSource` alone, so a *failed* prior
   * attempt (which releases the lock in the `onCart`/`onLifecycle` handlers above) can be retried
   * explicitly even though an earlier invocation was genuinely attempted and attributed. */
  const runGuidedFallback = useCallback(async () => {
    const current = registrationRef.current;
    if (!current || cartPreparationInFlightRef.current || cartRef.current || !decision || !approvedProposal) return;
    if (decision.status !== 'ELIGIBLE') return;
    cartPreparationInFlightRef.current = true;
    setFallbackBusy(true);
    const controller = new AbortController(); executionRef.current = controller;
    try {
      await current.invoke('prepare_validated_cart', { decisionId: decision.decisionId, lines: decision.lines, idempotencyKey: `recovery-fallback-${decision.decisionId}` }, controller.signal);
      // Outcome (prepared vs failed) and lock release-on-failure are handled by the telemetry/onCart
      // handlers above — the single source of truth for cart-preparation state.
    } finally { setFallbackBusy(false); executionRef.current = null; }
  }, [approvedProposal, decision]);

  /** Guided replay: invokes the exact canonical descriptors through registration.invoke(), which
   * always tags the call `source: 'replay'` — available whether or not a native agent is connected. */
  async function runGuidedMission() {
    const current = registrationRef.current;
    if (!current) return;
    setMode('guided'); setBusy(true); setDecision(null); setCart(null); setQuote(null);
    setRevisionState('idle'); setRevisionResult(null); setPreviousCart(null);
    setApprovedProposal(null); setCartInvocationSource(null); setCartOutcome(null);
    const controller = new AbortController(); executionRef.current = controller;
    try {
      await current.invoke('get_storefront_capabilities', {}, controller.signal);
      if (scenario === 'fresh') {
        await current.invoke('search_catalog', { query: 'Farm Eggs', limit: 4 }, controller.signal);
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
        const evaluated = await current.invoke('evaluate_shopping_plan', { lines: customLines, budget: { amount: 500, currency: 'USD' }, requestedDeliveryWindow: 'Brooklyn within 15 days' }, controller.signal) as unknown as PlanDecision;
        if (evaluated.status === 'QUOTE_REQUIRED') {
          await current.invoke('request_quote', { productId: 'v_customhub_quote_001', quantity: 25, requirements: 'Mixed adult sizes, robotics-team personalization, delivery to Brooklyn within 15 days (unconfirmed — requires merchant review).', idempotencyKey: `custom-quote-${generation + 1}-${Date.now()}` }, controller.signal);
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
  // Native sessions use the truthful, telemetry-driven `prepareCartRegistered` signal (a real
  // `registered` lifecycle event for prepare_validated_cart). Guided-only sessions never emit
  // registration lifecycle events (no `document.modelContext`), so they fall back to the
  // decision-authority signal that always accompanied guided execution before this pass.
  const cartCapabilityUnlocked = prepareCartRegistered || (!native && (Boolean(cart) || decision?.status === 'ELIGIBLE'));
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
        {mode === 'guided' && busy && <p aria-live="polite" className="mb-3 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">Reading storefront capabilities · Searching the catalog · Evaluating merchant rules</p>}
        <div className="grid gap-4 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-4">
            <h2 className="font-bold text-slate-900">Shopper & storefront</h2>
            <div className="mt-3 space-y-2">
              <ScenarioProducts scenario={scenario} />
            </div>
            <div ref={approvalRef} tabIndex={-1} className="outline-none">
              <ShopperApprovalCard
                approval={approval}
                approvalHeadingRef={approvalHeadingRef}
                approvedProposal={approvedProposal}
                cartCapabilityUnlocked={cartCapabilityUnlocked}
                cartPrepared={Boolean(cart)}
                invocationSource={cartInvocationSource}
                recoveryPhase={recoveryPhase}
                onCopyContinuationPrompt={copyContinuationPrompt}
                onGuidedFallback={runGuidedFallback}
                guidedFallbackDisabled={fallbackBusy || cartPreparationState === 'invoking' || Boolean(cart)}
                cartPreparationState={cartPreparationState}
                fallbackError={fallbackError}
              />
            </div>
            {cart && (
              <div ref={cartRefElement} tabIndex={-1} aria-live="polite" data-cart-reference={cart.reference} data-cart-revision={cart.revision ?? 1} className="mt-4 rounded-lg bg-emerald-50 p-3 outline-none">
                <h2 className="flex items-center gap-1 font-bold text-emerald-900"><ShoppingCart size={16} /> Validated cart prepared</h2>
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
                <p className="mt-3 text-sm text-emerald-900">Stale inventory blocked the original Farm Eggs. The shopper approved a $0.50 merchant-valid substitute. RetailAgentOS prepared a validated ${cart.total?.toFixed(2)} breakfast cart. Checkout remains unavailable.</p>
              </div>
            )}
            {scenario === 'fresh' && cart && (
              <>
                <button type="button" onClick={() => switchScenario('custom')} className="mt-4 text-left text-sm font-semibold text-emerald-800 underline underline-offset-2">Next: See why custom retail cannot always use a normal cart</button>
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
              </>
            )}
            {quote && (
              <div aria-live="polite" className="mt-4 rounded-lg bg-slate-950 p-3 text-white">
                <b>Merchant quote requested</b>
                <p className="mt-1 text-sm break-all">Reference: {quote.requestReference}</p>
                <p className="text-sm">fixedPrice: null · No cart · No order · No checkout</p>
              </div>
            )}
          </section>

          <div ref={missionControlRef} tabIndex={-1} className="outline-none lg:col-span-5">
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
