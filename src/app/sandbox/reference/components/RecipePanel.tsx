'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import type { Recipe, ControlDef, RecipeResult } from '../recipes/index';
import { CodeBlock } from './CodeBlock';
import { OutputView } from './OutputView';

// ---------------------------------------------------------------------------
// Control renderers
// ---------------------------------------------------------------------------

interface ControlRendererProps {
  def: ControlDef;
  value: unknown;
  onChange: (id: string, value: unknown) => void;
}

function ControlRenderer({ def, value, onChange }: ControlRendererProps) {
  const baseInput =
    'w-full rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500';

  if (def.type === 'select') {
    return (
      <select
        className={baseInput}
        value={String(value ?? def.defaultValue)}
        onChange={e => onChange(def.id, e.target.value)}
      >
        {def.options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (def.type === 'toggle') {
    const checked = Boolean(value ?? def.defaultValue);
    return (
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            className="sr-only"
            checked={checked}
            onChange={e => onChange(def.id, e.target.checked)}
          />
          <div
            className={`w-10 h-5 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-300'}`}
          />
          <div
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
          />
        </div>
        <span className="text-sm text-slate-700">{checked ? 'On' : 'Off'}</span>
      </label>
    );
  }

  if (def.type === 'number') {
    return (
      <div className="space-y-1">
        <input
          type="range"
          min={def.min}
          max={def.max}
          step={def.step}
          value={Number(value ?? def.defaultValue)}
          onChange={e => onChange(def.id, Number(e.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="text-xs text-slate-500 font-mono">
          {Number(value ?? def.defaultValue)} (range: {def.min}–{def.max})
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// RecipePanel
// ---------------------------------------------------------------------------

interface RecipePanelProps {
  recipe: Recipe;
}

type Tab = 'source' | 'output';

export function RecipePanel({ recipe }: RecipePanelProps) {
  // Initialise control values from defaults
  const initialValues = useMemo(() => {
    const vals: Record<string, unknown> = {};
    for (const ctrl of recipe.controls) {
      vals[ctrl.id] = ctrl.defaultValue;
    }
    return vals;
  }, [recipe]);

  const [controlValues, setControlValues] = useState<Record<string, unknown>>(initialValues);
  const [activeTab, setActiveTab] = useState<Tab>('output');

  // Reset controls when recipe changes
  const handleControlChange = useCallback((id: string, value: unknown) => {
    setControlValues(prev => ({ ...prev, [id]: value }));
  }, []);

  // Reset to defaults when recipe changes
  const resetToDefaults = useCallback(() => {
    setControlValues(initialValues);
  }, [initialValues]);

  // Compute result live from current control values
  const result: RecipeResult = useMemo(() => {
    try {
      return recipe.run(controlValues);
    } catch (err) {
      return {
        summary: `Error running recipe: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }, [recipe, controlValues]);

  // For 0013-trace, extract the audience from the audience control
  const traceAudience = recipe.id === '0013-trace'
    ? (controlValues['audience'] as 'developer' | 'merchant' | 'buyer' | undefined)
    : undefined;

  const tabBtn = (tab: Tab, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
        activeTab === tab
          ? 'bg-white text-slate-900 border border-b-white border-slate-200'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Recipe header */}
      <div className="shrink-0 p-6 border-b border-slate-200 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-emerald-600 font-semibold mb-1">
              {recipe.specRef}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{recipe.title}</h2>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">{recipe.whatThisProves}</p>
          </div>
          <Link
            href={recipe.specPageHref}
            className="shrink-0 text-xs text-emerald-600 hover:text-emerald-800 font-medium border border-emerald-200 rounded px-3 py-1.5 hover:bg-emerald-50 transition-colors"
          >
            View spec
          </Link>
        </div>
      </div>

      {/* Body: controls left, output right */}
      <div className="flex-1 min-h-0 flex">
        {/* Controls sidebar */}
        <div className="w-64 shrink-0 border-r border-slate-200 bg-slate-50 p-4 space-y-4 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Controls
            </div>
            <button
              onClick={resetToDefaults}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Reset
            </button>
          </div>

          {recipe.controls.map(ctrl => (
            <div key={ctrl.id}>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {ctrl.label}
              </label>
              <ControlRenderer
                def={ctrl}
                value={controlValues[ctrl.id]}
                onChange={handleControlChange}
              />
            </div>
          ))}

          {recipe.controls.length === 0 && (
            <div className="text-xs text-slate-400 italic">No controls for this recipe.</div>
          )}
        </div>

        {/* Main panel */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {/* Tabs */}
          <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-4 pt-2 flex gap-1">
            {tabBtn('output', 'Live Output')}
            {tabBtn('source', 'Recipe Source')}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'output' && (
              <OutputView result={result} traceAudience={traceAudience} />
            )}
            {activeTab === 'source' && (
              <CodeBlock code={recipe.shownSource} label={`${recipe.specRef} — minimal implementation`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
