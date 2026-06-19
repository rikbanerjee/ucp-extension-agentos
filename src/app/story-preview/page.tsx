'use client';

import { useState } from 'react';

type Scene = 0 | 1 | 2;

// ─── Chat bubble helpers ────────────────────────────────────────────────────

function AgentBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-slate-800 text-white px-4 py-2.5 text-sm leading-relaxed shadow-sm">
        {children}
      </div>
    </div>
  );
}

function StoreBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[75%] rounded-2xl rounded-tl-sm bg-white border border-slate-200 text-slate-800 px-4 py-2.5 text-sm leading-relaxed shadow-sm">
        {children}
      </div>
    </div>
  );
}

function ChatLabel({ side, label }: { side: 'agent' | 'store'; label: string }) {
  return (
    <div className={`text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1 ${side === 'agent' ? 'text-right' : 'text-left'}`}>
      {label}
    </div>
  );
}

// ─── Scene components ────────────────────────────────────────────────────────

function Scene0({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="inline-block rounded-full bg-amber-100 text-amber-700 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 mb-2">
          Concept preview
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
          Watch an AI agent shop — once the old way, once the RetailAgentOS way.
        </h1>
        <p className="text-xl text-slate-500 leading-relaxed">
          Same shopper. Same store. Two very different endings.
        </p>
        <button
          onClick={onNext}
          className="mt-4 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors shadow-sm"
        >
          Show me →
        </button>
      </div>
    </div>
  );
}

function Scene1({ onNext }: { onNext: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Scene label */}
      <div className="text-center space-y-1">
        <div className="inline-block rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold uppercase tracking-widest px-3 py-1">
          World A — today
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mt-3">The dead end</h2>
        <p className="text-slate-500 text-sm">The agent shops the way most agents do right now.</p>
      </div>

      {/* Chat thread */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200">
          Chat thread
        </div>

        <div>
          <ChatLabel side="agent" label="Shopping agent" />
          <AgentBubble>
            Add the industrial coffee beans (case of 12) to my cart.
          </AgentBubble>
        </div>

        <div>
          <ChatLabel side="store" label="Store" />
          <StoreBubble>
            Added! Ready to check out?
          </StoreBubble>
        </div>

        <div>
          <ChatLabel side="agent" label="Shopping agent" />
          <AgentBubble>
            Checking out now.
          </AgentBubble>
        </div>

        {/* Hard stop */}
        <div className="rounded-xl bg-rose-50 border border-rose-300 px-4 py-4 mt-2">
          <div className="flex items-start gap-3">
            <span className="text-xl leading-none">❌</span>
            <div>
              <div className="font-semibold text-rose-700 text-sm">Order rejected — wholesale accounts only.</div>
              <div className="text-rose-500 text-xs mt-0.5">Checkout blocked. Purchase could not be completed.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="text-sm text-slate-600 leading-relaxed text-center px-2">
        The agent only found out at the very end. The shopper&rsquo;s trip was wasted — and there&rsquo;s no obvious way forward.
      </p>

      <div className="flex justify-center">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors shadow-sm"
        >
          Now the RetailAgentOS way →
        </button>
      </div>
    </div>
  );
}

function Scene2({ onReplay }: { onReplay: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      {/* Scene label */}
      <div className="text-center space-y-1">
        <div className="inline-block rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold uppercase tracking-widest px-3 py-1">
          World B — RetailAgentOS
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mt-3">The upfront answer</h2>
        <p className="text-slate-500 text-sm">Same request. The agent knows before it ever recommends the item.</p>
      </div>

      {/* Same request echo */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200">
          Chat thread
        </div>

        <div>
          <ChatLabel side="agent" label="Shopping agent" />
          <AgentBubble>
            Add the industrial coffee beans (case of 12) to my cart.
          </AgentBubble>
        </div>

        {/* Decision card — amber/informative, not red panic */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-base">ℹ️</span>
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Before adding to cart</span>
          </div>
          <div className="font-semibold text-slate-900 text-base leading-snug">
            This product requires a wholesale account.
          </div>
          <div className="text-sm text-slate-700 leading-relaxed">
            A resale certificate on file is required to purchase this product.
          </div>
          <div className="pt-1 border-t border-amber-100">
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1">Next step</div>
            <div className="text-sm text-slate-800 font-medium">
              Provide a resale certificate to complete your purchase.
            </div>
          </div>
        </div>
      </div>

      {/* Caption */}
      <p className="text-sm text-slate-600 leading-relaxed text-center px-2">
        The agent knew before it ever recommended the item — and it can tell the shopper exactly how to unlock it.
        No dead end, no wasted trip.
      </p>

      {/* What changed expander */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>What changed?</span>
          <span className="text-slate-400 text-base leading-none">{expanded ? '▲' : '▼'}</span>
        </button>
        {expanded && (
          <div className="px-5 pb-4 pt-1 space-y-2 border-t border-slate-100">
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <span className="shrink-0 font-semibold text-rose-500">Before:</span>
              <span>The rules lived at checkout. Agents discovered them by failing.</span>
            </div>
            <div className="flex items-start gap-3 text-sm text-slate-700">
              <span className="shrink-0 font-semibold text-emerald-600">After:</span>
              <span>The rules live in the catalog. Agents read them upfront.</span>
            </div>
          </div>
        )}
      </div>

      {/* Replay + disclaimer */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={onReplay}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors shadow-sm"
        >
          ↩ Replay
        </button>
        <span className="text-xs text-slate-400">(preview — validating the concept)</span>
      </div>
    </div>
  );
}

// ─── Progress dots ────────────────────────────────────────────────────────────

function ProgressDots({ scene }: { scene: Scene }) {
  return (
    <div className="flex justify-center gap-2 py-4">
      {([0, 1, 2] as Scene[]).map(s => (
        <span
          key={s}
          className={`w-2 h-2 rounded-full transition-colors ${s === scene ? 'bg-slate-900' : 'bg-slate-300'}`}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StoryPreviewPage() {
  const [scene, setScene] = useState<Scene>(0);

  const goNext = () => setScene(s => Math.min(s + 1, 2) as Scene);
  const replay = () => setScene(0);

  return (
    <div className="min-h-full bg-slate-50">
      <ProgressDots scene={scene} />

      <div className="transition-opacity duration-200">
        {scene === 0 && <Scene0 onNext={goNext} />}
        {scene === 1 && <Scene1 onNext={goNext} />}
        {scene === 2 && <Scene2 onReplay={replay} />}
      </div>
    </div>
  );
}
