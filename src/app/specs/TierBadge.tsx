import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface TierBadgeProps {
  /** "Foundation" or "Tier 0" … "Tier 4" — must match specs/README.md exactly. */
  tier: string;
  /** Tier display name, e.g. "Qualified". Omit for Foundation (it has none). */
  tierName?: string;
  /** Spec version, e.g. "1.1.0" — rendered as "Draft · RFC vX.Y.Z · built & tested". */
  version: string;
  /** Anchor id on /adopt this spec's ladder rung maps to, e.g. "tier-1" or "derived-surfaces". */
  adoptAnchor: string;
}

/**
 * Shared tier/status/adopt-link strip for the 7 built spec pages (SWP-8).
 * Keeps every spec page's tier framing in one place instead of duplicated markup.
 */
export function TierBadge({ tier, tierName, version, adoptAnchor }: TierBadgeProps) {
  const tierLabel = tierName ? `${tier} · ${tierName}` : tier;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 text-white">
        {tierLabel}
      </span>
      <span className="text-xs text-slate-500">
        Draft · RFC v{version} · built &amp; tested
      </span>
      <Link
        href={`/adopt#${adoptAnchor}`}
        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
      >
        Adopt this
        <ArrowRight size={12} />
      </Link>
    </div>
  );
}
