'use client';

/**
 * BuyerDecisionCard — presentational component for the buyer-facing trace view.
 *
 * Extracted from TraceTab.tsx (BuyerView) as part of P0 Story mode.
 * Used both in TraceTab (dark-themed, dark bg) and in /guided Story mode
 * (light-themed, amber bg).
 *
 * Two visual themes:
 *   - 'dark'  (default): slate-800/900 background — matches the existing TraceTab style.
 *   - 'light': white/amber background — matches the story-preview narrative card.
 */

import type { renderBuyerTrace } from '@/lib/trace/render';

export type BuyerTraceView = ReturnType<typeof renderBuyerTrace>;

interface BuyerDecisionCardProps {
  view: BuyerTraceView;
  /** Visual theme: 'dark' = TraceTab dark bg; 'light' = story amber/white. Default: 'dark'. */
  theme?: 'dark' | 'light';
}

export function BuyerDecisionCard({ view, theme = 'dark' }: BuyerDecisionCardProps) {
  if (theme === 'light') {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-base">ℹ️</span>
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Before adding to cart</span>
        </div>
        <div className="font-semibold text-slate-900 text-base leading-snug">
          {view.headline}
        </div>
        {view.detail && (
          <div className="text-sm text-slate-700 leading-relaxed">
            {view.detail}
          </div>
        )}
        {view.nextStep && (
          <div className="pt-1 border-t border-amber-100">
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Next step</div>
            <div className="text-sm text-slate-800 font-medium">
              {view.nextStep}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Dark theme — identical to the original BuyerView in TraceTab
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
          view.canPurchase
            ? 'bg-emerald-900/60 text-emerald-300'
            : 'bg-rose-900/60 text-rose-300'
        }`}>
          {view.canPurchase ? '✓' : '✕'}
        </div>
        <div>
          <div className={`font-semibold text-sm ${view.canPurchase ? 'text-emerald-300' : 'text-rose-300'}`}>
            {view.headline}
          </div>
          {view.detail && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{view.detail}</p>
          )}
        </div>
      </div>
      {view.nextStep && (
        <div className="bg-slate-900/60 border border-slate-700 rounded p-3 text-xs text-slate-300">
          <span className="font-semibold text-slate-400">Next step: </span>
          {view.nextStep}
        </div>
      )}
      {view.canPurchase && !view.nextStep && (
        <div className="text-xs text-slate-500 italic">
          No buyer action required.
        </div>
      )}
    </div>
  );
}
