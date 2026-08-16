'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { QuickCommerceCandidate } from '@/lib/demo/platformQuickCommerceScenario';
import { formatUsd } from '@/lib/demo/platformQuickCommerceScenario';
import { StatusBadge } from './StatusBadge';

/**
 * Scene 5 — the customer-readable result. Recommended + alternative cards,
 * plus a collapsed "why wasn't this shown" explanation for the unknown
 * candidate — never presented as "blocked" or "bad merchant."
 */
export function CustomerResult({
  recommended,
  alternative,
  unverified,
}: {
  recommended: QuickCommerceCandidate;
  alternative: QuickCommerceCandidate;
  unverified: QuickCommerceCandidate;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <StatusBadge status="verified" />
            <div className="font-bold text-slate-900 text-lg mt-1.5">{recommended.merchantName}</div>
            <div className="text-sm text-slate-600">{recommended.itemName}</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatUsd(recommended.itemPriceCents ?? 0)}</div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-emerald-200/60">
          <div>
            <dt className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Estimated arrival</dt>
            <dd className="text-sm font-medium text-slate-800">Before midnight</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Accepting orders until</dt>
            <dd className="text-sm font-medium text-slate-800">12:30 AM</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <StatusBadge status="verified" />
            <div className="font-semibold text-slate-900 mt-1.5">{alternative.merchantName}</div>
            <div className="text-sm text-slate-600">{alternative.itemName}</div>
          </div>
          <div className="text-xl font-bold text-slate-900">{formatUsd(alternative.itemPriceCents ?? 0)}</div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 pt-2 border-t border-slate-100">
          <div>
            <dt className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Estimated arrival</dt>
            <dd className="text-sm font-medium text-slate-800">Slower — after midnight</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Source</dt>
            <dd className="text-sm font-medium text-slate-800">Platform-connected chain</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50/40">
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left min-h-[44px]"
        >
          <span className="text-sm font-semibold text-amber-900">Why was {unverified.merchantName} not shown?</span>
          <ChevronDown className={`w-4 h-4 text-amber-700 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {expanded && (
          <div className="px-5 pb-4 -mt-1">
            <StatusBadge status="unknown" />
            <p className="text-sm text-amber-900/90 leading-relaxed mt-2">{unverified.explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
