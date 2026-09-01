'use client';

import type { PlanDecision, QuoteResult } from '../../../packages/webmcp/src';

interface DecisionSummaryProps {
  decision: PlanDecision | null;
  quote: QuoteResult | null;
}

/** The decision authority, not the agent, exposes the next safe action. */
export function DecisionSummary({ decision, quote }: DecisionSummaryProps) {
  return (
    <section aria-live="polite" className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-bold text-slate-900">RetailAgentOS decision</h2>
      <p className="mt-2 text-sm text-slate-600">The decision authority, not the agent, exposes the next action.</p>
      <Checks decision={decision} quote={quote} />
      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
        <b className="text-slate-900">{decision?.code ?? quote?.code ?? 'NOT EVALUATED'}</b>
        <p className="mt-1 text-slate-700">{decision?.nextAction ?? quote?.nextAction ?? 'Evaluate the shopper mission first.'}</p>
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

function Checks({ decision, quote }: DecisionSummaryProps) {
  const repair = decision?.status === 'REPAIRABLE';
  const eligible = decision?.status === 'ELIGIBLE';
  return (
    <div className="mt-4 space-y-2 text-sm">
      <Check label="Shopper approval" value={decision || quote ? 'Controlled fixture' : 'Pending'} />
      <Check label="Valid price" value={quote ? 'Merchant review required' : eligible ? 'Engine evaluated' : 'Pending'} />
      <Check label="Current inventory" value={repair ? 'Repair required' : eligible ? 'Current at evaluation' : 'Pending'} />
      <Check label="Cart for review" value={cartText(decision, quote)} />
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

function cartText(decision: PlanDecision | null, quote: QuoteResult | null) {
  return quote ? 'Withheld' : decision?.status === 'ELIGIBLE' ? 'Can prepare' : 'Withheld';
}
