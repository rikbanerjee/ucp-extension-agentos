'use client';

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GuidedProgress } from './GuidedProgress';

export interface GuidedNav {
  onNext: () => void;
  onBack: () => void;
  onRestart: () => void;
  isFirst: boolean;
  isLast: boolean;
  index: number;
}

export interface GuidedScene {
  /** Short label shown in the progress rail for this scene, e.g. "Request". */
  stepLabel: string;
  render: (nav: GuidedNav) => ReactNode;
}

interface GuidedDemoShellProps {
  trackLabel: string;
  duration: string;
  scenes: GuidedScene[];
}

/**
 * Shared guided-demo shell: track chrome (label, duration, "try another
 * demo"), descriptive step progress, and manual back/restart controls. Scene
 * content and forward navigation stay with each track — every scene supplies
 * its own primary CTA copy, so the shell never renders a competing generic
 * "Next" button.
 */
export function GuidedDemoShell({ trackLabel, duration, scenes }: GuidedDemoShellProps) {
  const [index, setIndex] = useState(0);
  const liveRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  const steps = scenes.map((s) => s.stepLabel);

  const goTo = useCallback(
    (next: number) => {
      setIndex(Math.max(0, Math.min(next, scenes.length - 1)));
    },
    [scenes.length],
  );

  // Announce scene changes to assistive technology. Skipped on first mount
  // so the page doesn't immediately talk over its own initial render.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (liveRef.current) {
      liveRef.current.textContent = `Step ${index + 1} of ${scenes.length}: ${steps[index]}`;
    }
  }, [index, scenes.length, steps]);

  const nav: GuidedNav = {
    onNext: () => goTo(index + 1),
    onBack: () => goTo(index - 1),
    onRestart: () => goTo(0),
    isFirst: index === 0,
    isLast: index === scenes.length - 1,
    index,
  };

  return (
    <div className="min-h-full bg-slate-50">
      {/* Polite live region — announces scene transitions without moving focus */}
      <div ref={liveRef} className="sr-only" role="status" aria-live="polite" />

      {/* Track chrome */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          <Link
            href="/see-it-work"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors min-h-[44px] px-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Try another demo</span>
            <span className="sm:hidden">Demos</span>
          </Link>
          <div className="text-center min-w-0">
            <div className="text-xs font-semibold text-slate-900 truncate">{trackLabel}</div>
            <div className="text-[11px] text-slate-400">{duration}</div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {!nav.isFirst && (
              <button
                type="button"
                onClick={nav.onBack}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors min-h-[44px] px-2"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={nav.onRestart}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors min-h-[44px] px-2"
            >
              Restart
            </button>
          </div>
        </div>
        <GuidedProgress steps={steps} currentIndex={index} />
      </div>

      <div className="py-2">{scenes[index]?.render(nav)}</div>
    </div>
  );
}
