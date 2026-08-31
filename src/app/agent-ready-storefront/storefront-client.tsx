'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CircleAlert, Copy, LockKeyhole, RefreshCw, ShoppingCart } from 'lucide-react';
import { createRetailAgentWebMcp, type CartResult, type PlanDecision, type QuoteResult, type RepairProposal, type WebMcpRegistration, type WebMcpTelemetryEvent, type WebMcpToolName } from '../../../packages/webmcp/src';
import { createShowcaseBrowserGateway } from '@/lib/showcase/browser-gateway';
import type { ShowcaseStoreId } from '@/lib/showcase/gateway';

type Scenario = 'fresh' | 'custom';
type Approval = { proposal: RepairProposal; resolve: (value: 'approved' | 'declined') => void };
const freshLines = [{ productId: 'v_g_inv_002_1', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 1 }];
const customLines = [{ productId: 'v_customhub_quote_001', quantity: 25 }];
const prompts = {
  fresh: 'Build a dinner and tomorrow’s lunch cart under $80 using local delivery. If inventory cannot be trusted, show me a valid substitute and wait for my approval. Prepare a cart for review, but do not check out.',
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
  const [busy, setBusy] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [browserTools, setBrowserTools] = useState<string[] | null>(null);
  const registrationRef = useRef<WebMcpRegistration | null>(null);
  const executionRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => { executionRef.current?.abort(); approval?.resolve('declined'); registrationRef.current?.dispose(); setDecision(null); setCart(null); setQuote(null); setEvents([]); setApproval(null); setBrowserTools(null); setCurrentState('initial'); setBusy(false); setRegistering(true); setRegistrationError(false); setGeneration((value) => value + 1); }, [approval]);
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
        onLifecycle: (event) => { if (!disposed) { setEvents((items) => [...items.slice(-11), event]); if (event.nextState) setCurrentState(event.nextState); if (event.lifecycle === 'registered' || event.lifecycle === 'unregistered') void registrationRef.current?.getNativeToolNames?.().then((observed) => { if (!disposed) setBrowserTools(observed); }); } },
        requestRepairApproval: (proposal, context) => new Promise((resolve) => {
          const cancel = () => { if (!disposed) setApproval(null); resolve('declined'); };
          context.signal.addEventListener('abort', cancel, { once: true });
          if (!disposed) setApproval({ proposal, resolve: (result) => { context.signal.removeEventListener('abort', cancel); setApproval(null); resolve(result); } });
        }),
      },
    });
    sdk.register().then(async (result) => { if (!disposed) { registrationRef.current = result; setRegistration(result); const observed = await result.getNativeToolNames?.(); if (!disposed && observed) setBrowserTools(observed); } }).catch(() => { if (!disposed) setRegistrationError(true); }).finally(() => { if (!disposed) setRegistering(false); });
    return () => { disposed = true; executionRef.current?.abort(); registrationRef.current?.dispose(); registrationRef.current = null; };
  }, [scenario, generation]);

  async function runReplay() {
    const current = registrationRef.current; if (!current || current.supported) return;
    setBusy(true); setDecision(null); setCart(null); setQuote(null); const controller = new AbortController(); executionRef.current = controller;
    try {
      await current.invoke('get_storefront_capabilities', {}, controller.signal);
      if (scenario === 'fresh') {
        await current.invoke('search_catalog', { query: 'eggs', limit: 4 }, controller.signal);
        const evaluated = await current.invoke('evaluate_shopping_plan', { lines: freshLines, budget: { amount: 80, currency: 'USD' }, substitutionsAllowed: true }, controller.signal) as unknown as PlanDecision;
        if (evaluated.status === 'REPAIRABLE') await current.invoke('find_valid_alternatives', { decisionId: evaluated.decisionId, lines: freshLines }, controller.signal);
        const repair = evaluated.alternatives[0];
        if (repair) {
          const applied = await current.invoke('apply_plan_repair', { decisionId: evaluated.decisionId, repairId: repair.repairId, lines: freshLines, idempotencyKey: 'fresh-repair-20260830' }, controller.signal) as { status?: string; decision?: PlanDecision; lines?: typeof freshLines };
          if (applied.status === 'APPLIED' && applied.decision && applied.lines) await current.invoke('prepare_validated_cart', { decisionId: applied.decision.decisionId, lines: applied.lines, idempotencyKey: 'fresh-cart-20260830' }, controller.signal);
        }
      } else {
        await current.invoke('search_catalog', { query: 'robotics', limit: 4 }, controller.signal);
        const evaluated = await current.invoke('evaluate_shopping_plan', { lines: customLines, budget: { amount: 500, currency: 'USD' } }, controller.signal) as unknown as PlanDecision;
        if (evaluated.status === 'QUOTE_REQUIRED') await current.invoke('request_quote', { productId: 'v_customhub_quote_001', quantity: 25, requirements: 'Mixed adult sizes, robotics-team personalization, delivery to Brooklyn by September 15.', idempotencyKey: 'custom-quote-20260830' }, controller.signal);
      }
    } finally { setBusy(false); executionRef.current = null; }
  }

  const native = Boolean(registration?.supported);
  const activeTools = native ? registration?.registeredTools ?? [] : registration?.getReplayTools() ?? [];
  const parity = browserTools === null ? 'Browser observation unavailable' : browserTools.length === activeTools.length && browserTools.every((tool) => activeTools.includes(tool as WebMcpToolName)) ? 'Parity verified' : 'Registry mismatch';
  const withheld = scenario === 'custom' ? ['prepare_validated_cart', 'checkout'] : decision?.status === 'REPAIRABLE' ? ['prepare_validated_cart', 'checkout'] : ['checkout'];
  return <main className="min-h-screen bg-slate-50 text-slate-900"><div className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-sm sm:px-6"><strong>RetailAgentOS · WebMCP showcase</strong><span>Scenario: <b>{scenario === 'fresh' ? 'Fresh Corner Market' : 'TheCustomHub'}</b></span><span className={native ? 'text-emerald-700' : 'text-slate-600'}>{registering ? 'Registering WebMCP tools…' : registrationError ? 'Native registration failed · Replay available' : native ? `Native WebMCP · ${activeTools.length} tools registered` : 'Replay mode · No browser-native registration'}</span><span>State: <b>{currentState.toUpperCase()}</b></span><button onClick={reset} className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-md border border-slate-300 px-3 font-medium"><RefreshCw size={14}/> Reset</button>{!registering && !native && <button disabled={busy} onClick={runReplay} className="min-h-9 rounded-md bg-emerald-700 px-3 font-semibold text-white disabled:opacity-50">{busy ? 'Replay running…' : 'Run deterministic replay'}</button>}</div></div>
    <header className="mx-auto max-w-7xl px-4 py-6 sm:px-6"><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">A controlled Phase 1 demonstration</p><h1 className="mt-1 max-w-4xl text-3xl font-bold tracking-tight sm:text-4xl">AI agents can build carts. RetailAgentOS makes sure those carts can actually work.</h1><p className="mt-2 max-w-3xl text-slate-600">WebMCP gives the browser agent a safe action surface. RetailAgentOS decides which actions the retailer can honor.</p><p className="mt-1 text-xs text-slate-500">RetailAgentOS can project the same canonical commerce facts into WebMCP, UCP, MCP, feeds, and storefront UI.</p><div className="mt-4 grid gap-3 md:grid-cols-2"><ScenarioCard active={scenario === 'fresh'} title="Fresh Corner Market" body="Fictional controlled fixture · Recover a grocery cart with an engine-valid egg substitute." onClick={() => switchScenario('fresh')}/><ScenarioCard active={scenario === 'custom'} title="TheCustomHub" body="Authorized controlled quote fixture · Not live · Request merchant review without inventing a price." onClick={() => switchScenario('custom')}/></div></header>
    <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6"><div className="grid gap-4 lg:grid-cols-12"><section className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-4"><h2 className="font-bold">Shopper & storefront</h2><p className="mt-2 text-sm leading-6 text-slate-700">{prompts[scenario]}</p>{native && <button onClick={() => navigator.clipboard?.writeText(prompts[scenario])} className="mt-3 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-emerald-800"><Copy size={14}/> Copy browser-agent prompt</button>}<div className="mt-4 space-y-2">{scenario === 'fresh' ? <><Product title="Farm Eggs" detail="1 dozen · inventory is stale" price="$6.99" warning/><Product title="Artisan Sourdough Bread" detail="900g loaf · delivery-ready" price="$8.50"/></> : <Product title="Custom Robotics Team Shirt" detail="25 shirts · mixed adult sizes · personalized" price="Quote required" warning/>}</div>{approval && <div aria-live="assertive" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3"><b>Approve this substitute?</b><p className="mt-1 text-sm">{approval.proposal.title}</p><p className="mt-1 text-xs">${approval.proposal.tradeoffs.priceDelta.toFixed(2)} more · {approval.proposal.tradeoffs.timingDelta}</p><div className="mt-3 flex gap-2"><button onClick={() => approval.resolve('approved')} className="min-h-10 rounded-md bg-amber-800 px-3 text-sm font-semibold text-white">Approve</button><button onClick={() => approval.resolve('declined')} className="min-h-10 rounded-md border border-amber-800 px-3 text-sm font-semibold text-amber-950">Decline</button></div></div>}{cart && <div aria-live="polite" className="mt-4 rounded-lg bg-emerald-50 p-3"><b className="flex items-center gap-1 text-emerald-900"><ShoppingCart size={16}/>Validated cart prepared</b>{cart.lines.map((line) => <p key={line.productId} className="mt-1 text-sm">{line.quantity} × {line.title} · ${line.price?.toFixed(2)}</p>)}<p className="mt-2 text-sm font-semibold">Total: ${cart.total?.toFixed(2)} {cart.currency}</p><p className="mt-1 text-xs">Checkout is unavailable.</p></div>}{quote && <div aria-live="polite" className="mt-4 rounded-lg bg-slate-950 p-3 text-white"><b>Merchant quote requested</b><p className="mt-1 text-sm">Reference: {quote.requestReference}</p><p className="text-sm">fixedPrice: null · No cart · No order · No checkout</p></div>}</section>
      <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-white lg:col-span-5"><h2 className="font-bold">WebMCP mission control</h2><p className="mt-1 text-sm text-slate-300">{native ? 'Successful browser registrations, updated as RetailAgentOS changes the safe next action.' : 'Replay-available actions use the exact shared descriptors; no browser registration is claimed.'}</p><div className="mt-3 grid gap-1 text-xs text-slate-300 sm:grid-cols-2"><span>Storefront: {scenario === 'fresh' ? 'fresh-corner' : 'thecustomhub'}</span><span>Session: {scenario}-{generation + 1}</span><span>RetailAgentOS tools: {activeTools.length}</span><span>Browser-observed: {browserTools?.length ?? 'n/a'} · {parity}</span></div><div className="mt-4"><p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Exposed now</p><div className="mt-2 flex flex-wrap gap-2">{activeTools.map((tool) => <span key={tool} className="rounded bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-100">{label(tool)} <small className="text-emerald-300">{tool}</small></span>)}</div></div><div className="mt-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Checkout is not exposed</p><div className="mt-2 flex flex-wrap gap-2">{withheld.map((tool) => <span key={tool} className="rounded bg-white/10 px-2 py-1 text-xs text-slate-300"><LockKeyhole className="mr-1 inline" size={11}/>{label(tool as WebMcpToolName)}</span>)}</div></div><ol aria-live="polite" className="mt-5 space-y-2 border-t border-white/10 pt-4">{events.length ? events.slice().reverse().map((event) => <li key={event.id} className="text-sm"><b>{label(event.tool)}</b> · {event.lifecycle.replaceAll('_', ' ')}{event.decisionCode ? ` · ${event.decisionCode}` : ''}{event.durationMs !== undefined ? ` · ${event.durationMs}ms` : ''}</li>) : <li className="text-sm text-slate-300">{native ? 'Mission received · waiting for a browser agent to invoke a registered tool.' : 'Mission received · replay is ready to use the shared descriptors.'}</li>}</ol><details className="mt-3 text-xs text-slate-300"><summary className="cursor-pointer font-semibold">Developer tool evidence</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(events.slice(-5), null, 2)}</pre></details></section>
      <section aria-live="polite" className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-3"><h2 className="font-bold">RetailAgentOS decision</h2><p className="mt-2 text-sm text-slate-600">The decision authority, not the agent, exposes the next action.</p><Checks decision={decision} quote={quote}/><div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><b>{decision?.code ?? quote?.code ?? 'NOT EVALUATED'}</b><p className="mt-1">{decision?.nextAction ?? quote?.nextAction ?? 'Evaluate the shopper mission first.'}</p></div>{decision && <details className="mt-3 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">Developer proof</summary><p className="mt-2">Decision: {decision.decisionId}</p><p>Catalog: {decision.provenance.catalogVersion}</p><p>Policy: {decision.provenance.policyVersion}</p><p>Expires: {decision.provenance.expiresAt}</p><p>Input schema is available from each shared WebMCP descriptor.</p></details>}</section></div>
      <section className="mt-4 grid gap-3 md:grid-cols-3"><Info title="UCP-shaped capabilities" body="What this retailer supports."/><Info title="RetailAgentOS decision" body="What is valid for this shopper and moment."/><Info title="WebMCP registry" body="Which browser-agent action is safe to expose next."/></section><details className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer font-semibold">Retail stress-test evidence</summary><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3"><span>✓ Stale inventory → valid egg substitute</span><span>✓ Quote-required custom order</span><span>✓ Duplicate cart idempotency</span><span>✓ Region eligibility block</span><span>Planned: delivery-cutoff failure</span><span>Planned: membership verification boundary</span></div></details></section></main>;
}
function ScenarioCard({ active, title, body, onClick }: { active: boolean; title: string; body: string; onClick(): void }) { return <button onClick={onClick} className={`rounded-lg border p-3 text-left ${active ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'}`}><b>{title}</b><p className="mt-1 text-sm text-slate-600">{body}</p></button>; }
function Product({ title, detail, price, warning }: { title: string; detail: string; price: string; warning?: boolean }) { return <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"><span><b className="flex items-center gap-1">{warning && <CircleAlert size={15} className="text-amber-700"/>}{title}</b><small className="block text-slate-600">{detail}</small></span><b className="text-sm">{price}</b></div>; }
function Checks({ decision, quote }: { decision: PlanDecision | null; quote: QuoteResult | null }) { const repair = decision?.status === 'REPAIRABLE'; const eligible = decision?.status === 'ELIGIBLE'; return <div className="mt-4 space-y-2 text-sm"><Check label="Shopper context" value={decision || quote ? 'Controlled fixture' : 'Pending'}/><Check label="Price validity" value={quote ? 'Merchant review required' : eligible ? 'Engine evaluated' : 'Pending'}/><Check label="Inventory freshness" value={repair ? 'Repair required' : eligible ? 'Current at evaluation' : 'Pending'}/><Check label="Cart readiness" value={cartText(decision, quote)}/></div>; }
function Check({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-2"><span>{label}</span><b className="text-right text-xs text-emerald-700">{value}</b></div>; }
function cartText(decision: PlanDecision | null, quote: QuoteResult | null) { return quote ? 'Withheld' : decision?.status === 'ELIGIBLE' ? 'Can prepare' : 'Withheld'; }
function Info({ title, body }: { title: string; body: string }) { return <div className="rounded-lg border border-slate-200 bg-white p-3"><b>{title}</b><p className="mt-1 text-sm text-slate-600">{body}</p></div>; }
function label(tool: WebMcpToolName | 'checkout') { return tool === 'get_storefront_capabilities' ? 'Storefront capabilities' : tool === 'search_catalog' ? 'Search catalog' : tool === 'evaluate_shopping_plan' ? 'Evaluate shopping plan' : tool === 'find_valid_alternatives' ? 'Find valid alternatives' : tool === 'apply_plan_repair' ? 'Apply plan repair' : tool === 'prepare_validated_cart' ? 'Prepare validated cart' : tool === 'request_quote' ? 'Request quote' : 'Checkout'; }
