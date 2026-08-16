'use client';

import { Check } from 'lucide-react';

interface GuidedProgressProps {
  steps: string[];
  currentIndex: number;
}

/**
 * Descriptive step rail for guided demos — labeled steps (never unlabeled
 * dots), aria-current="step" on the active step, done/upcoming visually and
 * textually distinguished (not by color alone).
 */
export function GuidedProgress({ steps, currentIndex }: GuidedProgressProps) {
  return (
    <ol
      className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap px-3 py-3 sm:py-4"
      aria-label="Guided demo progress"
    >
      {steps.map((label, i) => {
        const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming';
        return (
          <li key={`${label}-${i}`} className="flex items-center gap-1 sm:gap-2">
            {i > 0 && <span className="w-3 sm:w-6 h-px bg-slate-300 shrink-0" aria-hidden="true" />}
            <span
              aria-current={state === 'current' ? 'step' : undefined}
              className={`inline-flex items-center gap-1 rounded-full px-2 sm:px-2.5 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide transition-colors ${
                state === 'current'
                  ? 'bg-slate-900 text-white'
                  : state === 'done'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              {state === 'done' && <Check className="w-3 h-3 shrink-0" aria-hidden="true" />}
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
