'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, PlayCircle, ShieldCheck } from 'lucide-react';
import { formatCartLineDisplay } from '@/lib/showcase/cartLineDisplay';

export interface DisplayCartLine { productId: string; quantity: number; title?: string; price?: number; unitPrice?: number; lineTotal?: number; }
export interface DisplayCart { reference: string; revision?: number; lines: DisplayCartLine[]; total?: number; currency?: string; budget?: { amount: number; currency: string }; remainingBudget?: number; fulfillment?: string; }
export type RevisionState = 'idle' | 'available' | 'revising' | 'revised' | 'withheld' | 'requires_approval' | 'error';

export const CART_REVISION_PROMPT = 'Using the registered WebMCP tools, revise the prepared Fresh Corner cart to contain two Artisan Sourdough Bread loaves. Keep the Cage-Free Eggs, stay under $30, preserve local delivery, and do not check out.';

interface CartRevisionPanelProps {
  visible: boolean;
  native: boolean;
  registering: boolean;
  revisionState: RevisionState;
  revisionGuidedActive: boolean;
  revisionBusy: boolean;
  cart: DisplayCart;
  previousCart: DisplayCart | null;
  withheldReason: string | null;
  onRunGuidedRevision: () => void;
}

/**
 * Deliberately secondary to the primary $15.99-cart success state: a first-time judge can stop at
 * the cart above and understand the complete WebMCP + human-in-the-loop journey. This panel is an
 * explicit, optional continuation — nothing here runs automatically.
 */
export function CartRevisionPanel({ visible, native, registering, revisionState, revisionGuidedActive, revisionBusy, cart, previousCart, withheldReason, onRunGuidedRevision }: CartRevisionPanelProps) {
  const [copied, setCopied] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (revisionState === 'revised') headingRef.current?.focus();
  }, [revisionState]);

  if (!visible) return null;

  async function copyPrompt() {
    try { await navigator.clipboard?.writeText(CART_REVISION_PROMPT); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* Clipboard access can be denied; the prompt remains visible to copy by hand. */ }
  }

  return (
    <section className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-4 sm:p-5" aria-labelledby="cart-revision-heading">
      <h2 id="cart-revision-heading" className="font-bold text-slate-800">Optional: See RetailAgentOS govern a cart revision</h2>
      <p className="mt-2 text-sm text-slate-600">
        Ask the browser agent to increase the bread quantity. WebMCP proposes the revised cart;
        RetailAgentOS checks inventory, price, fulfillment, and the original $30 budget before
        allowing the change.
      </p>

      <div className="mt-3 rounded-lg bg-white p-3 text-sm leading-6 text-slate-700 ring-1 ring-slate-200">{CART_REVISION_PROMPT}</div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={copyPrompt}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          <Copy size={14} aria-hidden="true" /> {copied ? 'Copied' : 'Copy prompt'}
        </button>
        <button
          onClick={onRunGuidedRevision}
          disabled={revisionBusy || registering}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md bg-slate-800 px-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          <PlayCircle size={14} aria-hidden="true" /> {revisionBusy ? 'Guided cart revision running…' : 'Watch guided cart revision'}
        </button>
      </div>
      {revisionGuidedActive && (
        <p className="mt-2 inline-flex rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
          Guided replay · Same RetailAgentOS handlers · No external agent
        </p>
      )}

      {revisionState === 'available' && native && (
        <p role="status" className="mt-3 text-sm font-medium text-slate-600">Cart revision tool available — waiting for browser agent</p>
      )}

      <div aria-live="polite">
        {revisionState === 'revising' && (
          <p className="mt-3 text-sm font-medium text-slate-600">RetailAgentOS is reevaluating the proposed cart revision…</p>
        )}

        {revisionState === 'revised' && (
          <div className="mt-4 overflow-x-auto rounded-lg border border-emerald-300 bg-emerald-50 p-3">
            <h3 ref={headingRef} tabIndex={-1} className="flex items-center gap-1.5 font-bold text-emerald-900 outline-none">
              <ShieldCheck size={16} aria-hidden="true" /> RetailAgentOS approved this revision
            </h3>
            <div className="mt-2 min-w-[16rem] space-y-1 text-sm text-emerald-900">
              {cart.lines.map((line) => {
                const { unitPriceLabel, totalLabel, showLineTotal } = formatCartLineDisplay(line);
                return (
                  <p key={line.productId}>
                    {line.quantity} × {line.title ?? line.productId} · {showLineTotal ? `${unitPriceLabel} × ${line.quantity} = ${totalLabel}` : `${unitPriceLabel} each`}
                  </p>
                );
              })}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-emerald-900 sm:grid-cols-3">
              {previousCart?.total !== undefined && <Fact label="Previous total" value={`$${previousCart.total.toFixed(2)}`} />}
              <Fact label="Revised total" value={`$${(cart.total ?? 0).toFixed(2)}`} />
              {cart.budget && <Fact label="Budget" value={`$${cart.budget.amount.toFixed(2)}`} />}
              {cart.remainingBudget !== undefined && <Fact label="Remaining" value={`$${cart.remainingBudget.toFixed(2)}`} />}
              <Fact label="Fulfillment" value="Local delivery preserved" />
              <Fact label="Cart revision" value={String(cart.revision ?? 2)} />
            </dl>
            <p className="mt-2 text-xs font-semibold text-emerald-800">Prepared for review · Checkout unavailable</p>
            <p className="mt-3 text-xs text-emerald-800">
              The agent proposed the change. RetailAgentOS recalculated the cart and allowed it only
              because the revised plan still satisfies inventory, policy, fulfillment, and budget
              constraints.
            </p>
            <ul className="mt-2 space-y-0.5 text-xs text-emerald-800">
              <li>No checkout performed</li>
              <li>No order created</li>
              <li>No payment initiated</li>
            </ul>
          </div>
        )}

        {(revisionState === 'withheld' || revisionState === 'requires_approval') && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <b>{revisionState === 'requires_approval' ? 'Revision withheld — a new repair needs shopper approval' : 'Revision withheld'}</b>
            <p className="mt-1">{withheldReason ?? 'RetailAgentOS did not allow this change. The previously valid cart is still shown above, unchanged.'}</p>
          </div>
        )}

        {revisionState === 'error' && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            <b>The revision request failed.</b>
            <p className="mt-1">The previously valid cart is still shown above, unchanged.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-emerald-700">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
