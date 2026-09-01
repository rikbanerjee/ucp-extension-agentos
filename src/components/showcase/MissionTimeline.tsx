'use client';

import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import type { WebMcpTelemetryEvent, WebMcpToolName } from '../../../packages/webmcp/src';
import { toolLabel } from './labels';

interface MissionTimelineProps {
  events: WebMcpTelemetryEvent[];
  native: boolean;
  guidedActive: boolean;
  activeTools: WebMcpToolName[];
  withheldTools: (WebMcpToolName | 'checkout')[];
  currentState: string;
}

/**
 * Business-readable timeline of the actual WebMCP telemetry — nothing here is a hard-coded
 * "success" sequence; every row comes from a real registration, invocation, or decision event.
 */
export function MissionTimeline({ events, native, guidedActive, activeTools, withheldTools, currentState }: MissionTimelineProps) {
  const [showRaw, setShowRaw] = useState(false);
  const ordered = events.slice().reverse();
  const modeLabel = guidedActive ? 'Guided replay' : native ? 'Native WebMCP' : 'Not yet running';

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">Mission Control</h2>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${guidedActive ? 'bg-amber-500/20 text-amber-200' : native ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-slate-300'}`}>
          {modeLabel}
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-300">
        {native
          ? 'Successful browser registrations, updated as RetailAgentOS changes the safe next action.'
          : 'The same shared descriptors are used whether an agent or the guided mission invokes them.'}
      </p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
        <span>State: <b className="text-white">{currentState.replaceAll('_', ' ')}</b></span>
        <span>Safe actions exposed: <b className="text-white">{activeTools.length}</b></span>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Safe next actions, right now</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {activeTools.length === 0 && <span className="text-xs text-slate-400">None registered yet.</span>}
          {activeTools.map((tool) => (
            <span key={tool} className="rounded bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-100">
              {toolLabel(tool)}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Checkout is never exposed</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {withheldTools.map((tool) => (
            <span key={tool} className="inline-flex items-center rounded bg-white/10 px-2 py-1 text-xs text-slate-300">
              <LockKeyhole className="mr-1" size={11} aria-hidden="true" />
              {toolLabel(tool)}
            </span>
          ))}
        </div>
      </div>

      <ol aria-live="polite" className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
        {ordered.length ? (
          ordered.slice(0, 12).map((event) => (
            <li key={event.id} className="break-words">
              <span>{describeMissionEvent(event)}</span>
              {showRaw && (
                <span className="mt-0.5 block text-xs text-slate-400">
                  {event.tool} · {event.lifecycle.replaceAll('_', ' ')} · source: {event.source}
                  {event.decisionCode ? ` · ${event.decisionCode}` : ''}
                  {event.durationMs !== undefined ? ` · ${event.durationMs}ms` : ''}
                </span>
              )}
            </li>
          ))
        ) : (
          <li className="text-slate-300">
            {native ? 'Mission received · waiting for a browser agent to invoke a registered tool.' : 'Mission received · run the guided mission to see the shared descriptors act.'}
          </li>
        )}
      </ol>

      <button
        onClick={() => setShowRaw((value) => !value)}
        className="mt-3 text-xs font-semibold text-slate-300 underline underline-offset-2"
      >
        {showRaw ? 'Hide technical detail' : 'Show technical detail (tool name, lifecycle, decision code)'}
      </button>

      {showRaw && (
        <details className="mt-3 text-xs text-slate-300">
          <summary className="cursor-pointer font-semibold">Raw event evidence (last 5)</summary>
          <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(events.slice(-5), null, 2)}</pre>
        </details>
      )}
    </section>
  );
}

function describeMissionEvent(event: WebMcpTelemetryEvent): string {
  const { tool, lifecycle } = event;
  if (lifecycle === 'registered') {
    if (!event.previousState) return `WebMCP registered ${event.registryAdded?.length ?? ''} planning tools`.trim();
    if (tool === 'find_valid_alternatives' || tool === 'apply_plan_repair') return 'Repair tools were registered';
    if (tool === 'prepare_validated_cart') return 'Cart preparation became available';
    if (tool === 'request_quote') return 'Merchant quote tool became available';
    if (tool === 'revise_validated_cart') return 'Cart revision capability registered';
    return `${toolLabel(tool)} became available`;
  }
  if (lifecycle === 'unregistered') {
    if (tool === 'find_valid_alternatives' || tool === 'apply_plan_repair') return 'Repair tools were withdrawn';
    return `${toolLabel(tool)} was withdrawn`;
  }
  if (lifecycle === 'registration_cleanup') return `${toolLabel(tool)} registration was cleaned up`;
  if (lifecycle === 'invoked') {
    switch (tool) {
      case 'get_storefront_capabilities': return 'Agent read storefront capabilities';
      case 'search_catalog': return 'Agent searched the catalog';
      case 'evaluate_shopping_plan': return 'RetailAgentOS is evaluating the shopping plan';
      case 'find_valid_alternatives': return 'Agent asked for valid alternatives';
      case 'apply_plan_repair': return 'Agent proposed a substitute';
      case 'prepare_validated_cart': return 'Agent asked to prepare the validated cart';
      case 'request_quote': return 'Agent submitted requirements for a merchant quote';
      case 'revise_validated_cart': return 'Browser agent requested a cart revision';
      default: return `${toolLabel(tool)} invoked`;
    }
  }
  if (lifecycle === 'waiting_for_shopper') return 'Waiting for shopper approval';
  if (lifecycle === 'completed') {
    if (tool === 'evaluate_shopping_plan') {
      if (event.decisionCode === 'STOCK_STALE') return 'Stale inventory prevented cart preparation';
      if (event.decisionCode === 'QUOTE_REQUIRED') return 'RetailAgentOS requires a merchant quote for this item';
      if (event.decisionCode === 'ELIGIBLE') return 'RetailAgentOS confirmed the plan is valid';
      if (event.decisionCode === 'BUDGET_EXCEEDED') return 'The plan exceeded the shopper budget';
      return 'RetailAgentOS evaluated the shopping plan';
    }
    if (tool === 'find_valid_alternatives') return 'RetailAgentOS returned merchant-valid alternatives';
    if (tool === 'apply_plan_repair') return event.decisionCode === 'SHOPPER_DECLINED' ? 'Shopper declined the substitute — no cart was created' : 'Shopper approved the repair';
    if (tool === 'prepare_validated_cart') return event.nextState === 'cart_prepared' ? 'Validated cart prepared for review' : 'Cart preparation was withheld';
    if (tool === 'request_quote') return 'Quote request sent for merchant review — no price, cart, or order created';
    if (tool === 'get_storefront_capabilities') return 'Storefront capabilities confirmed';
    if (tool === 'search_catalog') return 'Catalog search complete';
    if (tool === 'revise_validated_cart') {
      if (event.decisionCode === 'CART_REVISED') return 'RetailAgentOS reevaluated the proposed lines — revised cart prepared for review';
      if (event.decisionCode === 'BUDGET_EXCEEDED') return 'The revision exceeded the $25 budget — revision withheld, existing cart kept';
      if (event.decisionCode === 'STOCK_STALE') return 'The revision hit stale inventory — a new repair requires shopper approval';
      if (event.decisionCode === 'QUOTE_REQUIRED') return 'The revision requires a merchant quote — existing cart kept';
      return 'RetailAgentOS reevaluated the proposed cart revision';
    }
  }
  if (lifecycle === 'failed') return `${toolLabel(tool)} failed${event.error ? ` · ${event.error}` : ''}`;
  if (lifecycle === 'cancelled') return `${toolLabel(tool)} was cancelled`;
  return `${toolLabel(tool)} ${lifecycle.replaceAll('_', ' ')}`;
}
