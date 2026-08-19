'use client';

/**
 * /guided/independent — Boutique & Specialty Retailers guided demo.
 *
 * AgentDemoStrip stays the central visual (Scene 3) exactly as it does on
 * /solutions/independent-retail#agent-demo — reused here in embedded mode
 * with its internal CTA hidden, since this track's own completion scene
 * supplies the single next action instead.
 */

import { useState } from 'react';
import AgentDemoStrip from '@/components/AgentDemoStrip';
import { GuidedDemoShell, type GuidedNav } from '@/components/guided/GuidedDemoShell';
import { DemoRequest } from '@/components/guided/DemoRequest';
import { NextBestAction } from '@/components/guided/NextBestAction';

const QUERY = "Find me a personalized T-shirt for Father's Day gifting under $50, ships to California.";

function PrimaryButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="flex justify-center">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-semibold text-base px-8 py-3.5 rounded-xl transition-colors shadow-sm min-h-[44px]"
      >
        {children}
      </button>
    </div>
  );
}

function DiscoveryScene({ onNext }: { onNext: () => void }) {
  const [seen, setSeen] = useState(false);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-7">
      <div className="text-center space-y-1">
        <div className="inline-block rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 py-1">
          Watch the search
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mt-3">What can the AI find?</h2>
        <p className="text-slate-500 text-sm">Step through the phases below — or let it play.</p>
      </div>
      <AgentDemoStrip embedded showCta={false} onComplete={() => setSeen(true)} />
      <PrimaryButton onClick={onNext}>
        {seen ? 'See what this means for your store →' : 'Continue →'}
      </PrimaryButton>
    </div>
  );
}

export function IndependentTrack() {
  const scenes = [
    {
      stepLabel: 'Introduction',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-14 text-center space-y-6">
          <div className="inline-block rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 py-1">
            Independent Retail
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">
            See what changes when your store becomes understandable to AI.
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed max-w-xl mx-auto">
            A shopper asks an AI for a product like yours. Watch what the assistant can — and
            cannot — find.
          </p>
          <PrimaryButton onClick={nav.onNext}>Start the boutique demo →</PrimaryButton>
        </div>
      ),
    },
    {
      stepLabel: 'Request',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10 space-y-7">
          <div className="text-center space-y-1">
            <div className="inline-block rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-widest px-3 py-1">
              Discovery request
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-3">What the shopper wants</h2>
          </div>
          <DemoRequest eyebrow="Shopper asks an AI assistant" query={QUERY} />
          <PrimaryButton onClick={nav.onNext}>Watch the search →</PrimaryButton>
        </div>
      ),
    },
    {
      stepLabel: 'Decision',
      render: (nav: GuidedNav) => <DiscoveryScene onNext={nav.onNext} />,
    },
    {
      stepLabel: 'Result',
      render: (nav: GuidedNav) => (
        <div className="max-w-2xl mx-auto px-4 py-10">
          <NextBestAction
            heading="Now see what AI understands about your store."
            body="Check whether an AI shopping assistant can find your store and understand the information it needs to represent it correctly."
            primaryLabel="Check my store"
            primaryHref="/aeo-score"
            secondaryLabel="See how this works for retailers"
            secondaryHref="/solutions/independent-retail"
            tertiaryLabel="Try another demo"
            tertiaryHref="/see-it-work"
            onReplay={nav.onRestart}
          />
        </div>
      ),
    },
  ];

  return <GuidedDemoShell trackLabel="Independent Retailers" duration="90 seconds" scenes={scenes} />;
}
