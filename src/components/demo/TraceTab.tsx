'use client';

/**
 * TraceTab — RAOS-0013 (part 1) Decision Trace viewer
 *
 * Three audience views toggled by a ViewToggle:
 *   - Developer  → renderDeveloperTrace → <pre> JSON block
 *   - Merchant   → renderMerchantTrace → Stage/Status/Code/Message/ActionHint table
 *   - Buyer      → renderBuyerTrace    → Headline / detail / next-step card
 *
 * Accepts a `DecisionRecord` and derives the trace internally so callers
 * don't need to know about derive.ts.
 */

import { useState, useMemo } from 'react';
import { buildDecisionTrace, renderDeveloperTrace, renderMerchantTrace, renderBuyerTrace } from '@retailagentos/engine';
import type { DecisionRecord, MerchantTraceRow } from '@retailagentos/engine';
import { BuyerDecisionCard } from './BuyerDecisionCard';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DeveloperView({ json }: { json: string }) {
  return (
    <div className="relative">
      <pre className="text-xs font-mono text-slate-200 bg-slate-900 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
        {json}
      </pre>
    </div>
  );
}

function MerchantView({ rows }: { rows: MerchantTraceRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-800 border-b border-slate-700">
            <th className="text-left px-3 py-2 text-slate-400 font-semibold uppercase tracking-wider">Stage</th>
            <th className="text-left px-3 py-2 text-slate-400 font-semibold uppercase tracking-wider">Status</th>
            <th className="text-left px-3 py-2 text-slate-400 font-semibold uppercase tracking-wider">Code</th>
            <th className="text-left px-3 py-2 text-slate-400 font-semibold uppercase tracking-wider">Message</th>
            <th className="text-left px-3 py-2 text-slate-400 font-semibold uppercase tracking-wider">Action Hint</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((row, i) => (
            <tr key={i} className="bg-slate-900/60 hover:bg-slate-800/60 transition-colors">
              <td className="px-3 py-2 font-mono text-slate-400">{row.stage}</td>
              <td className="px-3 py-2">
                <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                  row.status === 'BLOCK'
                    ? 'bg-rose-900/60 text-rose-300'
                    : row.status === 'CONDITION'
                      ? 'bg-amber-900/60 text-amber-300'
                      : 'bg-emerald-900/60 text-emerald-300'
                }`}>
                  {row.status}
                </span>
              </td>
              <td className="px-3 py-2 font-mono text-slate-300">{row.code}</td>
              <td className="px-3 py-2 text-slate-400 leading-snug max-w-[200px]">{row.message}</td>
              <td className="px-3 py-2 text-slate-500 leading-snug max-w-[200px] italic">{row.actionHint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// BuyerView is now BuyerDecisionCard (extracted to BuyerDecisionCard.tsx).

// ---------------------------------------------------------------------------
// TraceTab
// ---------------------------------------------------------------------------

type TraceAudience = 'developer' | 'merchant' | 'buyer';

interface TraceTabProps {
  record: DecisionRecord;
}

export function TraceTab({ record }: TraceTabProps) {
  const [audience, setAudience] = useState<TraceAudience>('developer');

  const trace = useMemo(() => buildDecisionTrace(record), [record]);
  const developerJson = useMemo(() => renderDeveloperTrace(trace), [trace]);
  const merchantRows = useMemo(() => renderMerchantTrace(trace), [trace]);
  const buyerView = useMemo(() => renderBuyerTrace(trace), [trace]);

  return (
    <div className="space-y-3">
      {/* Header + audience toggle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Decision Trace
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            <span className={`font-mono ${
              trace.offerStatus === 'BLOCKED'
                ? 'text-rose-400'
                : trace.offerStatus === 'CONDITIONAL'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
            }`}>
              {trace.offerStatus}
            </span>
            {' · '}
            <span className="text-slate-500">{trace.reasons.length} reason{trace.reasons.length !== 1 ? 's' : ''}</span>
            {' · '}
            <span className="text-slate-600 font-mono">RAOS-0013</span>
          </div>
        </div>

        {/* Audience toggle */}
        <div className="flex items-center rounded-md border border-slate-700 bg-slate-800 p-0.5">
          {(['developer', 'merchant', 'buyer'] as TraceAudience[]).map(a => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors capitalize ${
                audience === a
                  ? 'bg-slate-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Audience content */}
      {audience === 'developer' && <DeveloperView json={developerJson} />}
      {audience === 'merchant' && <MerchantView rows={merchantRows} />}
      {audience === 'buyer' && <BuyerDecisionCard view={buyerView} theme="dark" />}

      {/* Schema note */}
      <div className="text-[10px] text-slate-600 italic text-right">
        traceSchema {trace.traceSchema} · owner review required before public spec
      </div>
    </div>
  );
}
