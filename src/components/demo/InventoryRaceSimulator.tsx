'use client';

/**
 * InventoryRaceSimulator — RAOS-0005 oversell demo
 *
 * Two competing "agents" contend for the last unit of a variant.
 * Agent A reserves first → AVAILABLE. Agent B then reserves → sees
 * OUT_OF_STOCK (or the reservation held by A reduces available to 0).
 *
 * Uses Date.now() ONLY in this UI component (injected as `now` into
 * the pure evaluateInventory rule). The rules themselves never call
 * Date.now() — the determinism invariant is preserved.
 */

import { useState } from 'react';
import { evaluateInventory } from '@/lib/rules/inventory';
import type { InventoryConfig, InventoryHold } from '@/lib/types/inventory';
import type { BuyerContext } from '@/lib/types/context';
import type { ReasonEntry } from '@/lib/types/reasons';

// ---------------------------------------------------------------------------
// Static mock variant config (1 unit available, soft_hold enabled)
// ---------------------------------------------------------------------------

const DEMO_VARIANT_ID = 'race_demo_v1';

const DEMO_INVENTORY_CONFIG: InventoryConfig = {
  state: 'low_stock',
  quantityAvailable: 1,
  lowStockThreshold: 2,
  reservationPolicy: 'soft_hold',
  reservationTtlSeconds: 900,
};

const DEMO_VARIANT = {
  id: DEMO_VARIANT_ID,
  inventory: DEMO_INVENTORY_CONFIG,
  // Minimal shape — inventory evaluator only reads variant.id and variant.inventory
};

const DEMO_CONTEXT: BuyerContext = {
  customerType: 'member',
  loyaltyTier: 'guest',
  membershipTier: 'none',
  marketRegion: 'US',
  fulfillmentMode: 'shipping',
  accountLinked: true,
  taxExempt: false,
  resaleCertificateOnFile: false,
  trust: { mode: 'asserted' },
};

// ---------------------------------------------------------------------------
// Severity styling
// ---------------------------------------------------------------------------

function severityBadge(severity: string): string {
  switch (severity) {
    case 'BLOCK': return 'bg-rose-100 text-rose-700 border border-rose-200';
    case 'CONDITION': return 'bg-amber-100 text-amber-700 border border-amber-200';
    default: return 'bg-sky-100 text-sky-700 border border-sky-200';
  }
}

function stateColor(state: string): string {
  switch (state) {
    case 'out_of_stock': return 'text-rose-600 font-bold';
    case 'low_stock': return 'text-amber-600 font-bold';
    case 'in_stock': return 'text-emerald-600 font-bold';
    default: return 'text-slate-600';
  }
}

// ---------------------------------------------------------------------------
// AgentPanel — renders one agent's reservation state
// ---------------------------------------------------------------------------

interface AgentResult {
  agentId: 'A' | 'B';
  state: string;
  reasons: ReasonEntry[];
  heldAt?: number;
}

function AgentPanel({ result, onReserve, disabled }: {
  result: AgentResult | null;
  onReserve: () => void;
  disabled?: boolean;
}) {
  const agentLabel = result?.agentId ?? '?';
  const hasResult = result !== null;
  const isBlocked = result?.reasons.some(r => r.severity === 'BLOCK') ?? false;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-800 text-sm">
          Agent {agentLabel}
        </div>
        {hasResult && (
          <span className={`text-xs font-mono px-2 py-0.5 rounded ${stateColor(result!.state)}`}>
            {result!.state.replace('_', ' ').toUpperCase()}
          </span>
        )}
      </div>

      <button
        onClick={onReserve}
        disabled={disabled}
        className={`w-full py-2 px-3 text-sm font-semibold rounded-md transition-colors ${
          disabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : isBlocked
              ? 'bg-rose-100 text-rose-700 border border-rose-300 hover:bg-rose-200'
              : 'bg-slate-900 text-white hover:bg-slate-700'
        }`}
      >
        Reserve Unit
      </button>

      {hasResult && result!.reasons.length > 0 && (
        <div className="space-y-1.5">
          {result!.reasons.map((r, i) => (
            <div key={i} className="rounded p-2 text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${severityBadge(r.severity)}`}>
                  {r.severity}
                </span>
                <span className="font-mono text-slate-600">{r.code}</span>
              </div>
              <div className="text-slate-500 leading-snug pl-1">{r.message}</div>
            </div>
          ))}
        </div>
      )}

      {hasResult && result!.reasons.length === 0 && (
        <div className="text-xs text-emerald-700 bg-emerald-50 rounded p-2 border border-emerald-200">
          Unit reserved successfully — no blocking reasons.
        </div>
      )}

      {!hasResult && (
        <div className="text-xs text-slate-400 italic text-center py-2">
          Click Reserve Unit to evaluate
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InventoryRaceSimulator
// ---------------------------------------------------------------------------

export function InventoryRaceSimulator() {
  const [units, setUnits] = useState(1);
  const [holds, setHolds] = useState<InventoryHold[]>([]);
  const [agentA, setAgentA] = useState<AgentResult | null>(null);
  const [agentB, setAgentB] = useState<AgentResult | null>(null);

  const handleReserve = (agentId: 'A' | 'B') => {
    // Date.now() is intentionally called here in the UI layer only.
    // The pure evaluateInventory receives `now` as an injection.
    const now = Date.now();

    const result = evaluateInventory({
      variant: DEMO_VARIANT as Parameters<typeof evaluateInventory>[0]['variant'],
      context: DEMO_CONTEXT,
      holds,
      now,
    });

    const agentResult: AgentResult = {
      agentId,
      state: result.availability.state,
      reasons: result.reasons,
      heldAt: now,
    };

    if (agentId === 'A') {
      setAgentA(agentResult);
    } else {
      setAgentB(agentResult);
    }

    // If this reservation succeeded (not blocked) and the variant uses soft_hold,
    // add a hold for Agent A so Agent B sees a conflicting state.
    if (!result.blocked && agentId === 'A') {
      const hold: InventoryHold = {
        variantId: DEMO_VARIANT_ID,
        quantity: 1,
        heldAt: now,
        ttlSeconds: DEMO_INVENTORY_CONFIG.reservationTtlSeconds ?? 900,
      };
      setHolds(prev => [...prev, hold]);
      // Also reduce available units to simulate stock decrement
      setUnits(prev => Math.max(0, prev - 1));
    }
  };

  const handleReset = () => {
    setUnits(1);
    setHolds([]);
    setAgentA(null);
    setAgentB(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Inventory Race Simulator</h3>
          <p className="text-xs text-slate-500 mt-0.5">Two agents, one unit — demonstrates oversell prevention</p>
        </div>
        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">
          RAOS-0005
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Stock counter */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200">
          <div className="text-sm text-slate-600">Available units:</div>
          <div className={`text-xl font-bold font-mono ${units === 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {units}
          </div>
          {holds.length > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 ml-auto">
              {holds.length} soft hold{holds.length > 1 ? 's' : ''} active
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded p-3 leading-relaxed">
          <strong className="text-slate-700">How it works:</strong> Agent A reserves the last unit first.
          Agent B evaluates next and sees the hold — resulting in{' '}
          <span className="font-mono text-rose-600">OUT_OF_STOCK</span> or{' '}
          <span className="font-mono text-amber-600">LOW_STOCK</span> with a reservation conflict.
          Reset to run the scenario again.
        </div>

        {/* Two-agent panels */}
        <div className="grid grid-cols-2 gap-3">
          <AgentPanel
            result={agentA}
            onReserve={() => handleReserve('A')}
            disabled={agentA !== null}
          />
          <AgentPanel
            result={agentB}
            onReserve={() => handleReserve('B')}
            disabled={agentB !== null || agentA === null}
          />
        </div>

        {/* Step hint */}
        {!agentA && (
          <p className="text-xs text-slate-400 text-center">Step 1: Agent A reserves first.</p>
        )}
        {agentA && !agentB && (
          <p className="text-xs text-amber-700 text-center bg-amber-50 border border-amber-200 rounded p-2">
            Step 2: Agent A holds the unit. Now let Agent B try.
          </p>
        )}
        {agentA && agentB && (
          <div className="text-xs text-slate-700 bg-slate-100 border border-slate-200 rounded p-2 text-center">
            Agent B saw the hold placed by Agent A. This is how RAOS-0005 prevents oversell
            at the catalog-evaluation layer.{' '}
            <button
              onClick={handleReset}
              className="text-emerald-600 hover:underline font-semibold"
            >
              Reset to try again.
            </button>
          </div>
        )}

        {/* Reset button */}
        {(agentA !== null || agentB !== null) && (
          <button
            onClick={handleReset}
            className="w-full py-1.5 text-xs font-semibold text-slate-600 rounded-md border border-slate-200 hover:bg-white transition-colors"
          >
            Reset Scenario
          </button>
        )}
      </div>
    </div>
  );
}
