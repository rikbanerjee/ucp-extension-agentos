import type { QuickCommerceCandidate, SourcedFact } from '@/lib/demo/platformQuickCommerceScenario';
import { formatUsd } from '@/lib/demo/platformQuickCommerceScenario';
import { StatusBadge, SourceTag, FreshnessTag } from './StatusBadge';

function displayFact(f: SourcedFact<unknown>, kind: 'bool' | 'text' | 'price' | 'minutes' = 'text'): string {
  if (f.status === 'unknown' || f.value === undefined) return 'Unknown';
  if (kind === 'bool') return f.value ? 'Yes' : 'No';
  if (kind === 'price') return formatUsd(f.value as number);
  if (kind === 'minutes') return `${f.value as number} min`;
  return String(f.value);
}

interface Row {
  label: string;
  fact: SourcedFact<unknown>;
  kind?: 'bool' | 'text' | 'price' | 'minutes';
}

/**
 * Scene 3 — normalizes RAOS-native, platform-native, and unverified-listing
 * merchant data into ONE comparison shape. Stacked per-merchant cards (not a
 * compressed table) so this stays readable at 375px, per AGENTS UX
 * requirements. Business view only — no raw JSON, no pipeline stage names,
 * no protocol namespaces.
 */
export function MerchantComparison({ candidates }: { candidates: QuickCommerceCandidate[] }) {
  return (
    <div className="space-y-4">
      {candidates.map(c => {
        const rows: Row[] = [
          { label: 'Accepting orders', fact: c.merchantFacts.acceptingOrders, kind: 'bool' },
          { label: 'Acceptance cutoff', fact: c.merchantFacts.acceptanceCutoffLabel },
          { label: 'Item available', fact: c.merchantFacts.itemAvailable, kind: 'bool' },
          { label: 'Item price', fact: c.merchantFacts.itemPrice, kind: 'price' },
          { label: 'Preparation time', fact: c.merchantFacts.preparationTimeMinutes, kind: 'minutes' },
          { label: 'Local delivery supported', fact: c.merchantFacts.localDeliverySupported, kind: 'bool' },
          { label: 'Customer area serviceable', fact: c.merchantFacts.areaServiceable, kind: 'bool' },
          { label: 'Accepting for 30+ more minutes', fact: c.merchantFacts.acceptingFor30MoreMinutes, kind: 'bool' },
        ];
        return (
          <div key={c.merchantId} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-semibold text-slate-900 text-sm">{c.merchantName}</div>
                <SourceTag source={rows[0].fact.source} />
              </div>
              <StatusBadge status={c.verification} />
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
              {rows.map(row => (
                <div key={row.label} className="flex items-start justify-between gap-2 border-b border-slate-50 pb-2 sm:border-0 sm:pb-0">
                  <dt className="text-xs text-slate-500">{row.label}</dt>
                  <dd className="text-right shrink-0">
                    <div className="text-sm font-medium text-slate-800">{displayFact(row.fact, row.kind)}</div>
                    <FreshnessTag status={row.fact.status} />
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{c.explanation}</p>
          </div>
        );
      })}
    </div>
  );
}
