import { Star, MapPin } from 'lucide-react';
import type { DiscoveryListing } from '@/lib/demo/platformQuickCommerceScenario';
import { formatUsd } from '@/lib/demo/platformQuickCommerceScenario';

/**
 * Scene 2 — a plain conventional-listing card: what generic search/listing
 * data shows BEFORE any feasibility verification. Deliberately neutral
 * (slate only) — no verified/blocked/unknown status yet, because none has
 * been computed at this point in the story.
 */
export function CandidateMerchantCard({ listing }: { listing: DiscoveryListing }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="font-semibold text-slate-900 text-sm">{listing.merchantName}</div>
        <div className="text-base font-bold text-slate-900">{formatUsd(listing.displayedPriceCents)}</div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          {listing.distanceLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <Star className="w-3.5 h-3.5" aria-hidden="true" />
          {listing.ratingLabel}
        </span>
      </div>
      <p className="text-sm text-slate-700">{listing.menuMatch}</p>
      <p className="text-xs text-slate-400">{listing.listedClosingLabel}</p>
    </div>
  );
}
