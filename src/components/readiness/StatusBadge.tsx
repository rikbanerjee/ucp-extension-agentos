import { CheckCircle2, AlertTriangle, Wrench, RadioTower, MinusCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/components/ui/Badge';
import type { ReadinessStatus } from '@/lib/readiness';

const STATUS_META: Record<ReadinessStatus, { label: string; icon: typeof CheckCircle2; classes: string }> = {
  ready: { label: 'Ready', icon: CheckCircle2, classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  ready_to_implement: { label: 'Ready to implement', icon: CheckCircle2, classes: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  needs_input: { label: 'Needs input', icon: AlertTriangle, classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  needs_platform_installation: { label: 'Needs platform installation', icon: Wrench, classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  needs_live_verification: { label: 'Needs live verification', icon: RadioTower, classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  not_applicable: { label: 'Not applicable', icon: MinusCircle, classes: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export function StatusBadge({ status, className }: { status: ReadinessStatus; className?: string }) {
  const meta = STATUS_META[status] ?? { label: status, icon: HelpCircle, classes: 'bg-slate-100 text-slate-600 border-slate-200' };
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', meta.classes, className)}>
      <Icon size={13} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

const SEVERITY_META = {
  blocking: { label: 'Must fix', classes: 'bg-rose-100 text-rose-800 border-rose-200' },
  warning: { label: 'Review', classes: 'bg-amber-100 text-amber-800 border-amber-200' },
  information: { label: 'Info', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
} as const;

export function SeverityBadge({ severity, className }: { severity: keyof typeof SEVERITY_META; className?: string }) {
  const meta = SEVERITY_META[severity];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', meta.classes, className)}>
      {meta.label}
    </span>
  );
}
