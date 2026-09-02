'use client';

import { Check, CircleDashed, ShieldCheck } from 'lucide-react';
import type { RefObject } from 'react';
import type { RegistrationSource, RepairProposal } from '../../../packages/webmcp/src';

export interface Approval {
  proposal: RepairProposal;
  resolve: (value: 'approved' | 'declined') => void;
}

interface ShopperApprovalCardProps {
  /** A currently pending decision — the mission is paused, waiting for a click. */
  approval: Approval | null;
  approvalHeadingRef?: RefObject<HTMLHeadingElement | null>;
  /** The repair the shopper approved this mission, kept visible as a completed step (not cleared
   * the instant the button is clicked) until the next reset or mission run. */
  approvedProposal?: RepairProposal | null;
  /** True once WebMCP's own lifecycle registration actually exposes `prepare_validated_cart` — a
   * real telemetry-driven `registered` event, never inferred from the approval click itself and
   * never from the decision status alone (that would race ahead of the actual registration). */
  cartCapabilityUnlocked?: boolean;
  /** True once the prepared cart is visible — RetailAgentOS has revalidated and returned it. */
  cartPrepared?: boolean;
  /** Which actor invoked `prepare_validated_cart`: the real browser agent ('native') or the guided
   * replay ('replay'). Never set from a UI click — only from the WebMCP `invoked` telemetry event. */
  invocationSource?: RegistrationSource | null;
  /** Cross-agent recovery state (see AGENTS.md "recovery is explicit and truthfully labelled
   * replay"): 'none' before the capability registers or once invocation/cart exists; 'waiting'
   * during the ~5s grace window after registration; 'timeout' once that window has elapsed with no
   * invocation and no cart. */
  recoveryPhase?: 'none' | 'waiting' | 'timeout';
  /** Copies the continuation prompt for the shopper to hand back to a paused browser agent. */
  onCopyContinuationPrompt?: () => void;
  /** Explicit-click-only fallback: invokes `prepare_validated_cart` via `registration.invoke()`
   * (source: 'replay') through the identical canonical descriptor/gateway handler. Never runs
   * automatically. */
  onGuidedFallback?: () => void;
  /** Disabled once native cart preparation begins (or a cart already exists), so a resuming browser
   * agent and a shopper's fallback click can never race into two carts. */
  guidedFallbackDisabled?: boolean;
  /** Cart-preparation outcome state, distinct from mere invocation attribution — see
   * `storefront-client.tsx`'s `cartPreparationState`. Drives the failed-attempt retry banner below,
   * independent of `recoveryPhase` (which only governs the pre-invocation waiting/timeout banner and
   * would otherwise stay 'none' once any invocation — including a failed one — has been attempted). */
  cartPreparationState?: 'idle' | 'invoking' | 'failed' | 'prepared';
  /** The failed attempt's own truthful, bounded RetailAgentOS code/nextAction (or a WebMCP
   * cancellation/failure telemetry reason) — never invented copy. */
  fallbackError?: { code: string; nextAction: string } | null;
}

/**
 * Shopper approval is real: the mission pauses here and waits for a click, and nothing auto-approves.
 * Once the shopper decides, the card keeps a visible completed record rather than disappearing —
 * followed by the real, telemetry-driven steps that follow it. Each step is attributed to its actual
 * actor (a human click is never relabeled as a WebMCP invocation).
 */
export function ShopperApprovalCard({ approval, approvalHeadingRef, approvedProposal = null, cartCapabilityUnlocked = false, cartPrepared = false, invocationSource = null, recoveryPhase = 'none', onCopyContinuationPrompt, onGuidedFallback, guidedFallbackDisabled = false, cartPreparationState = 'idle', fallbackError = null }: ShopperApprovalCardProps) {
  if (!approval && !approvedProposal) return null;

  if (approval) {
    return (
      <div aria-live="assertive" className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
        <h2 ref={approvalHeadingRef} tabIndex={-1} className="font-bold text-amber-950 outline-none">Approve this substitute?</h2>
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
      {/* Chronological order matters here: WebMCP capability registration must complete before
          prepare_validated_cart can be invoked, and invocation must happen before RetailAgentOS can
          revalidate and return a cart. The approval click itself never marks step 3 complete — only
          the real `invoked` telemetry event for prepare_validated_cart does. */}
      <ol className="mt-3 space-y-1.5 text-xs text-emerald-900">
        <SequenceStep done label="Human approval" detail="Approved by shopper" />
        <SequenceStep
          done={cartCapabilityUnlocked}
          label="WebMCP capability"
          detail={cartCapabilityUnlocked ? 'Cart preparation registered' : 'Waiting for RetailAgentOS to register cart preparation…'}
        />
        <SequenceStep
          done={Boolean(invocationSource)}
          label="prepare_validated_cart invocation"
          detail={invocationSource === 'native' ? 'Invoked by native browser agent' : invocationSource === 'replay' ? 'Invoked by guided replay' : 'Waiting for browser agent'}
        />
        <SequenceStep
          done={cartPrepared}
          label="RetailAgentOS validation"
          detail={cartPrepared ? 'Cart revalidated and prepared' : 'Waiting for cart preparation'}
        />
      </ol>

      {recoveryPhase !== 'none' && !invocationSource && !cartPrepared && (
        <div aria-live="polite" className="mt-3 rounded-md border border-amber-300 bg-amber-100/70 p-2.5 text-xs text-amber-950">
          <p>
            {recoveryPhase === 'waiting'
              ? 'Cart preparation is available. Waiting for the browser agent to continue.'
              : 'The browser agent paused after approval. Your approved repair is safe, but cart preparation has not been invoked.'}
          </p>
          {recoveryPhase === 'timeout' && (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onCopyContinuationPrompt}
                className="min-h-8 rounded-md border border-amber-800 px-2.5 text-xs font-semibold text-amber-950"
              >
                Copy continuation prompt
              </button>
              <button
                type="button"
                onClick={onGuidedFallback}
                disabled={guidedFallbackDisabled}
                className="min-h-8 rounded-md bg-amber-800 px-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Guided fallback · Same RetailAgentOS handler · External browser agent paused
              </button>
            </div>
          )}
        </div>
      )}

      {/* Independent of `recoveryPhase` (which reads 'none' once ANY invocation — including this
          failed one — has been attempted): a failed/cancelled attempt that produced no cart is
          always recoverable through an explicit retry, truthfully labelled, never automatic. */}
      {cartPreparationState === 'failed' && !cartPrepared && (
        <div aria-live="assertive" className="mt-3 rounded-md border border-red-300 bg-red-50 p-2.5 text-xs text-red-950">
          <p>
            <b className="font-semibold">Cart preparation failed:</b> {fallbackError?.nextAction ?? 'Review the request and try again.'}
            {fallbackError?.code ? ` (${fallbackError.code})` : ''}
          </p>
          <p className="mt-1 text-red-900">No cart was created. Nothing retries automatically — try again explicitly when ready.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGuidedFallback}
              disabled={guidedFallbackDisabled}
              className="min-h-8 rounded-md bg-red-800 px-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retry guided cart preparation
            </button>
          </div>
        </div>
      )}
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
