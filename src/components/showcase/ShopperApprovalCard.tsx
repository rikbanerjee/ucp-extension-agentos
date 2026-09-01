'use client';

import { Check, CircleDashed, ShieldCheck } from 'lucide-react';
import type { RegistrationSource, RepairProposal } from '../../../packages/webmcp/src';

export interface Approval {
  proposal: RepairProposal;
  resolve: (value: 'approved' | 'declined') => void;
}

interface ShopperApprovalCardProps {
  /** A currently pending decision — the mission is paused, waiting for a click. */
  approval: Approval | null;
  /** The repair the shopper approved this mission, kept visible as a completed step (not cleared
   * the instant the button is clicked) until the next reset or mission run. */
  approvedProposal?: RepairProposal | null;
  /** True once WebMCP's own lifecycle registration actually exposes `prepare_validated_cart` — a
   * real telemetry-driven transition, never inferred from the approval click itself. */
  cartCapabilityUnlocked?: boolean;
  /** True once the prepared cart is visible — RetailAgentOS has revalidated and returned it. */
  cartPrepared?: boolean;
  /** Which actor invoked cart preparation: the real browser agent ('native') or the guided replay
   * ('replay'). Never set from a UI click — only from the WebMCP `invoked` telemetry event. */
  invocationSource?: RegistrationSource | null;
}

/**
 * Shopper approval is real: the mission pauses here and waits for a click, and nothing auto-approves.
 * Once the shopper decides, the card keeps a visible completed record rather than disappearing —
 * followed by the real, telemetry-driven steps that follow it. Each step is attributed to its actual
 * actor (a human click is never relabeled as a WebMCP invocation).
 */
export function ShopperApprovalCard({ approval, approvedProposal = null, cartCapabilityUnlocked = false, cartPrepared = false, invocationSource = null }: ShopperApprovalCardProps) {
  if (!approval && !approvedProposal) return null;

  if (approval) {
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

  // approvedProposal is set: the shopper has approved. Show the completed decision plus the real
  // sequence of steps that follow it, each attributed to its actual actor.
  return (
    <div aria-live="polite" className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3">
      <b className="flex items-center gap-1.5 text-emerald-900"><ShieldCheck size={16} aria-hidden="true" /> Approved by shopper</b>
      <p className="mt-1 text-sm text-emerald-900">{approvedProposal!.title}</p>
      <ol className="mt-3 space-y-1.5 text-xs text-emerald-900">
        <SequenceStep done label="Human approval" detail="Approved by shopper" />
        <SequenceStep
          done={cartCapabilityUnlocked}
          label="WebMCP lifecycle registration"
          detail={cartCapabilityUnlocked ? 'Cart preparation unlocked' : 'Waiting for RetailAgentOS to register cart preparation…'}
        />
        <SequenceStep
          done={cartPrepared}
          label="RetailAgentOS validation"
          detail={cartPrepared ? 'Cart revalidated and prepared' : 'Pending'}
        />
        <SequenceStep
          done={Boolean(invocationSource)}
          label={invocationSource === 'native' ? 'Browser agent invocation' : invocationSource === 'replay' ? 'Guided replay invocation' : 'Browser agent / guided replay invocation'}
          detail={invocationSource === 'native' ? 'Invoked by the native browser agent' : invocationSource === 'replay' ? 'Invoked by guided replay' : 'Pending'}
        />
      </ol>
    </div>
  );
}

function SequenceStep({ done, label, detail }: { done: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-1.5">
      {done ? <Check size={13} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" /> : <CircleDashed size={13} className="mt-0.5 shrink-0 text-emerald-500/60" aria-hidden="true" />}
      <span><b className="font-semibold">{label}:</b> {detail}</span>
    </li>
  );
}
