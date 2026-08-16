import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { VerificationStatus, EvidenceSource } from '@/lib/demo/platformQuickCommerceScenario';

const STATUS_META: Record<VerificationStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  verified: { label: 'Verified', className: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  blocked: { label: 'Cannot proceed', className: 'bg-rose-50 text-rose-700 border-rose-200', Icon: XCircle },
  unknown: { label: 'Unable to verify', className: 'bg-amber-50 text-amber-800 border-amber-200', Icon: AlertTriangle },
};

/** Status pill — always paired with a text label, never color alone (WCAG). */
export function StatusBadge({ status }: { status: VerificationStatus }) {
  const { label, className, Icon } = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

const SOURCE_LABELS: Record<EvidenceSource, string> = {
  raos_engine: 'RetailAgentOS',
  raos_proposed: 'RAOS (proposed)',
  platform_feed: 'Platform-native feed',
  platform_live: 'Platform live signal',
  listing: 'Unverified listing',
};

/** Small, visually secondary but discoverable source-attribution tag. */
export function SourceTag({ source }: { source: EvidenceSource }) {
  return (
    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
      {SOURCE_LABELS[source]}
    </span>
  );
}

const FRESHNESS_LABELS: Record<'fresh' | 'stale' | 'unknown', string> = {
  fresh: 'Fresh',
  stale: 'May be outdated',
  unknown: 'Unknown',
};

export function FreshnessTag({ status }: { status: 'fresh' | 'stale' | 'unknown' }) {
  const cls =
    status === 'fresh'
      ? 'text-emerald-600'
      : status === 'stale'
      ? 'text-amber-600'
      : 'text-slate-400';
  return <span className={`text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{FRESHNESS_LABELS[status]}</span>;
}
