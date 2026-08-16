import { Store, Radio } from 'lucide-react';
import type { QuickCommerceCandidate, PlatformInterpretedIntent } from '@/lib/demo/platformQuickCommerceScenario';
import { formatUsd } from '@/lib/demo/platformQuickCommerceScenario';
import { StatusBadge } from './StatusBadge';

const MERCHANT_FACT_LABELS = [
  'Store operating schedule',
  'Order-acceptance cutoff',
  'Item availability',
  'Item price',
  'Preparation time',
  'Merchant-supported fulfilment mode',
  'Merchant-declared serviceability',
  'Provenance & freshness',
];

const PLATFORM_FACT_LABELS = [
  'Customer location',
  'Courier availability',
  'Pickup travel time',
  'Delivery travel time',
  'Estimated arrival',
  'Platform fees',
  'Ranking policy',
];

/**
 * Scene 4 — the responsibility-boundary visualization: RAOS facts and
 * platform facts are two visually separate columns, never merged into one
 * undifferentiated list. RetailAgentOS is never shown "ranking" anything —
 * only the platform's applied-constraints + final result rows below do that.
 */
export function PlatformSignalPanel({
  candidates,
  intent,
}: {
  candidates: QuickCommerceCandidate[];
  intent: PlatformInterpretedIntent;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
            <Store className="w-4 h-4" aria-hidden="true" />
            RetailAgentOS explains
          </div>
          <ul className="space-y-1.5 text-sm text-emerald-900/80">
            {MERCHANT_FACT_LABELS.map(l => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
            <Radio className="w-4 h-4" aria-hidden="true" />
            The platform decides
          </div>
          <ul className="space-y-1.5 text-sm text-slate-600">
            {PLATFORM_FACT_LABELS.map(l => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">The platform applies the customer&rsquo;s constraints</div>
        <ul className="text-sm text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Item price must be {formatUsd(intent.maxItemPriceCents)} or less</li>
          <li>Need-by time is {intent.needByLabel.toLowerCase()}</li>
          <li>Merchant must keep accepting orders for at least {intent.minimumAcceptanceWindowMinutes} more minutes</li>
          <li>Delivery ETA must meet the need-by time</li>
          <li>Merchant data must be sufficiently fresh, or explicitly handled as unknown</li>
        </ul>
      </div>

      <div className="space-y-2">
        {candidates.map(c => (
          <div key={c.merchantId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <span className="text-sm font-medium text-slate-900">{c.merchantName}</span>
            <StatusBadge status={c.verification} />
          </div>
        ))}
      </div>
    </div>
  );
}
