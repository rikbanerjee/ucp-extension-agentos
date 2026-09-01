'use client';

import type { RepairProposal } from '../../../packages/webmcp/src';

export interface Approval {
  proposal: RepairProposal;
  resolve: (value: 'approved' | 'declined') => void;
}

/** Shopper approval is real: the mission pauses here and waits for a click. Nothing auto-approves. */
export function ShopperApprovalCard({ approval }: { approval: Approval | null }) {
  if (!approval) return null;
  return (
    <div aria-live="assertive" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <b className="text-amber-950">Approve this substitute?</b>
      <p className="mt-1 text-sm text-amber-950">{approval.proposal.title}</p>
      <p className="mt-1 text-xs text-amber-900">
        ${approval.proposal.tradeoffs.priceDelta.toFixed(2)} more · {approval.proposal.tradeoffs.timingDelta}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => approval.resolve('approved')}
          className="min-h-10 rounded-md bg-amber-800 px-3 text-sm font-semibold text-white"
        >
          Approve
        </button>
        <button
          onClick={() => approval.resolve('declined')}
          className="min-h-10 rounded-md border border-amber-800 px-3 text-sm font-semibold text-amber-950"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
