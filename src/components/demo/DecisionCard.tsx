import { ComputedVisibility, ComputedEligibility, ComputedPriceState } from '@/lib/types/extensions';
import { CheckCircle, XCircle, AlertCircle, ShoppingCart, Eye, EyeOff, Tag } from 'lucide-react';

interface DecisionCardProps {
  merchantHumanName: string;
  productTitle: string;
  visibility: ComputedVisibility;
  eligibility: ComputedEligibility;
  priceState: ComputedPriceState;
  onSwitchToTechnical?: () => void;
}

function priceLabel(priceState: ComputedPriceState): string {
  switch (priceState.priceSource) {
    case 'member': return 'Member pricing';
    case 'bulk_tier': return `Volume pricing · ${priceState.appliedTier ? priceState.appliedTier.minQuantity + '+ units' : ''}`;
    case 'promo_sale': return 'Weekly sale';
    case 'promo_tier': return 'Mix & match promo';
    default: return 'Public pricing';
  }
}

function agentAction(visibility: ComputedVisibility, eligibility: ComputedEligibility): {
  label: string;
  detail: string;
  positive: boolean;
} {
  if (visibility.status === 'HIDDEN') {
    return {
      label: 'Will not surface to this buyer',
      detail: visibility.reason || 'Item is not visible in this context.',
      positive: false,
    };
  }
  if (eligibility.status === 'BLOCKED') {
    const reason = eligibility.reasons.find(r => r.blocking);
    return {
      label: 'Cannot facilitate purchase',
      detail: reason?.message || 'Buyer does not meet requirements.',
      positive: false,
    };
  }
  if (eligibility.status === 'CONDITIONAL') {
    const reason = eligibility.reasons[0];
    return {
      label: 'Can show — purchase requires action',
      detail: reason?.message || 'Buyer must meet additional requirements to complete purchase.',
      positive: false,
    };
  }
  return {
    label: 'Can recommend and add to cart',
    detail: 'No restrictions. Agent can proceed freely.',
    positive: true,
  };
}

export function DecisionCard({
  merchantHumanName,
  productTitle,
  visibility,
  eligibility,
  priceState,
  onSwitchToTechnical,
}: DecisionCardProps) {
  const action = agentAction(visibility, eligibility);
  const isVisible = visibility.status === 'VISIBLE';

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 bg-slate-900">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
          {merchantHumanName}
        </div>
        <div className="font-semibold text-white text-sm">{productTitle}</div>
      </div>

      {/* Decision rows */}
      <div className="px-4 py-4 space-y-3">

        {/* Visibility */}
        <div className="flex items-start gap-3">
          {isVisible
            ? <Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            : <EyeOff className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          }
          <div>
            <div className="text-xs font-semibold text-slate-300">
              {isVisible ? 'Visible to this buyer' : 'Hidden from this buyer'}
            </div>
            {!isVisible && visibility.reason && (
              <div className="text-xs text-slate-500 mt-0.5">{visibility.reason}</div>
            )}
          </div>
        </div>

        {/* Eligibility — only shown if visible */}
        {isVisible && (
          <div className="flex items-start gap-3">
            {eligibility.status === 'ELIGIBLE'
              ? <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              : eligibility.status === 'CONDITIONAL'
              ? <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              : <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            }
            <div>
              <div className="text-xs font-semibold text-slate-300">
                {eligibility.status === 'ELIGIBLE' && 'Eligible — no restrictions'}
                {eligibility.status === 'CONDITIONAL' && 'Conditionally eligible'}
                {eligibility.status === 'BLOCKED' && 'Purchase blocked'}
              </div>
              {eligibility.reasons.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {eligibility.reasons.map((r, i) => (
                    <li key={i} className="text-xs text-slate-500">{r.message}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* Price — only shown if visible */}
        {isVisible && (
          <div className="flex items-start gap-3">
            <Tag className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-300">
                ${priceState.unitPrice.toFixed(2)}{' '}
                <span className="font-normal text-slate-500">· {priceLabel(priceState)}</span>
              </div>
              {priceState.teaser && (
                <div className="text-xs text-emerald-400 mt-0.5">{priceState.teaser.message}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Agent action */}
      <div className={`px-4 py-3 border-t border-slate-700 ${action.positive ? 'bg-emerald-950/40' : 'bg-slate-900'}`}>
        <div className="flex items-start gap-2">
          <ShoppingCart className={`w-4 h-4 shrink-0 mt-0.5 ${action.positive ? 'text-emerald-400' : 'text-slate-500'}`} />
          <div>
            <div className={`text-xs font-semibold ${action.positive ? 'text-emerald-300' : 'text-slate-400'}`}>
              Agent: {action.label}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{action.detail}</div>
          </div>
        </div>
      </div>

      {/* Switch to technical */}
      {onSwitchToTechnical && (
        <div className="px-4 py-2.5 border-t border-slate-700/50 bg-slate-900/50">
          <button
            onClick={onSwitchToTechnical}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Switch to Technical view for raw payload →
          </button>
        </div>
      )}
    </div>
  );
}
