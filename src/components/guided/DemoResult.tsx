export type DemoResultStatus = 'proceed' | 'blocked' | 'needs-info';

const STATUS_META: Record<DemoResultStatus, { label: string; badgeClass: string; cardClass: string }> = {
  proceed: {
    label: 'Can proceed',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cardClass: 'border-emerald-200 bg-emerald-50/60',
  },
  blocked: {
    label: 'Blocked',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
    cardClass: 'border-rose-200 bg-rose-50/60',
  },
  'needs-info': {
    label: 'Needs information',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    cardClass: 'border-amber-200 bg-amber-50/60',
  },
};

interface DemoResultProps {
  status: DemoResultStatus;
  /** e.g. product or offer name */
  title: string;
  /** e.g. merchant name, shown above the title */
  meta?: string;
  /** e.g. applicable price, when supported */
  subtitle?: string;
  reason: string;
}

/**
 * A single evaluated-offer result card. Status is always spelled out in text
 * ("Can proceed" / "Blocked" / "Needs information") in addition to color, so
 * the state never depends on color alone.
 */
export function DemoResult({ status, title, meta, subtitle, reason }: DemoResultProps) {
  const s = STATUS_META[status];
  return (
    <div className={`rounded-xl border p-5 space-y-2 ${s.cardClass}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          {meta && <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{meta}</div>}
          <div className="font-semibold text-slate-900 text-sm leading-snug">{title}</div>
        </div>
        <span
          className={`shrink-0 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${s.badgeClass}`}
        >
          {s.label}
        </span>
      </div>
      {subtitle && <div className="text-lg font-bold text-slate-900">{subtitle}</div>}
      <p className="text-sm text-slate-700 leading-relaxed">{reason}</p>
    </div>
  );
}
