'use client';

import type { PlanDecision, QuoteResult } from '../../../packages/webmcp/src';
import type { DisplayCart } from './CartRevisionPanel';

interface DecisionSummaryProps {
  decision: PlanDecision | null;
  quote: QuoteResult | null;
  /** The prepared review cart, if any — drives the "Cart for review" status text. */
  cart?: DisplayCart | null;
  /** True once the shopper has clicked Approve at least once this mission. Never inferred from the
   * decision alone — approval is a real human action coordinated outside the deterministic engine. */
  approvedOnce?: boolean;
  /** The authoritative `code`/`nextAction` from the most recent `prepare_validated_cart` or
   * `revise_validated_cart` gateway response (e.g. `CART_PREPARED`, `CART_REVISED`) — read directly
   * from that response, never recomputed here. Once a cart exists, this always takes priority over
   * the underlying plan `decision`'s `ELIGIBLE`/"ready to prepare" copy, which describes a state
   * that no longer applies once the cart has actually been prepared or revised. */
  cartOutcome?: { code: string; nextAction: string } | null;
}

/** The decision authority, not the agent, exposes the next safe action. */
export function DecisionSummary({ decision, quote, cart = null, approvedOnce = false, cartOutcome = null }: DecisionSummaryProps) {
  // Once a cart has actually been prepared/revised, its own gateway-authoritative code/nextAction
  // (CART_PREPARED / CART_REVISED) supersedes the underlying plan decision's now-stale ELIGIBLE copy.
  const headline = cart && cartOutcome ? cartOutcome : null;
  return (
    <section aria-live="polite" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-bold text-slate-900">RetailAgentOS decision</h2>
      <p className="mt-2 text-sm text-slate-600">The decision authority, not the agent, exposes the next action.</p>
      <Checks decision={decision} quote={quote} cart={cart} approvedOnce={approvedOnce} />
      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
        <b className="text-slate-900">{headline?.code ?? decision?.code ?? quote?.code ?? 'NOT EVALUATED'}</b>
        <p className="mt-1 text-slate-700">{headline?.nextAction ?? decision?.nextAction ?? quote?.nextAction ?? 'Evaluate the shopper mission first.'}</p>
      </div>
      {decision && (
        <details className="mt-3 text-xs text-slate-600">
          <summary className="cursor-pointer font-semibold">Developer proof</summary>
          <p className="mt-2 break-all">Decision: {decision.decisionId}</p>
          <p>Catalog: {decision.provenance.catalogVersion}</p>
          <p>Policy: {decision.provenance.policyVersion}</p>
          <p>Expires: {decision.provenance.expiresAt}</p>
          <p>Input schema is available from each shared WebMCP descriptor.</p>
        </details>
      )}
    </section>
  );
}

function Checks({ decision, quote, cart, approvedOnce }: Required<Omit<DecisionSummaryProps, 'decision' | 'quote' | 'cartOutcome'>> & DecisionSummaryProps) {
  const repair = decision?.status === 'REPAIRABLE';
  const eligible = decision?.status === 'ELIGIBLE';
  return (
    <div className="mt-4 space-y-2 text-sm">
      <Check label="Shopper approval" value={approvalText(decision, quote, approvedOnce)} />
      <Check label="Valid price" value={quote ? 'Merchant review required' : eligible ? 'Engine evaluated' : 'Pending'} />
      <Check label="Current inventory" value={repair ? 'Repair required' : eligible ? 'Current at evaluation' : 'Pending'} />
      <Check label="Cart for review" value={cartText(decision, quote, cart)} />
    </div>
  );
}

function Check({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-700">{label}</span>
      <b className="text-right text-xs text-emerald-700">{value}</b>
    </div>
  );
}

function approvalText(decision: PlanDecision | null, quote: QuoteResult | null, approvedOnce: boolean) {
  if (approvedOnce) return 'Approved';
  if (quote) return 'Not required (merchant review)';
  if (decision) return 'Pending';
  return 'Pending';
}

function cartText(decision: PlanDecision | null, quote: QuoteResult | null, cart: DisplayCart | null) {
  if (cart) return 'Prepared';
  return quote ? 'Withheld' : decision?.status === 'ELIGIBLE' ? 'Can prepare' : 'Withheld';
}
