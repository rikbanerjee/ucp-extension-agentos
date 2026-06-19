'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RECIPES } from './recipes/index';
import { RecipePanel } from './components/RecipePanel';

export default function ReferenceCookbookPage() {
  const [activeRecipeId, setActiveRecipeId] = useState<string>(RECIPES[0].id);

  const activeRecipe = RECIPES.find(r => r.id === activeRecipeId) ?? RECIPES[0];

  return (
    <div className="flex h-[calc(100vh-64px)] min-h-0 bg-white">
      {/* Left rail — recipe selector */}
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col min-h-0">
        {/* Cookbook header */}
        <div className="p-4 border-b border-slate-200">
          <Link
            href="/sandbox/retail-agent-os"
            className="text-xs text-slate-400 hover:text-slate-600 mb-3 block"
          >
            ← Back to Playground
          </Link>
          <div className="text-xs font-mono text-emerald-600 font-semibold mb-1">
            RAOS Reference Cookbook
          </div>
          <h1 className="text-base font-bold text-slate-900 leading-tight">
            Spec Cookbook
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-snug">
            7 live recipes — each calls the real pipeline, never re-implements logic.
          </p>
        </div>

        {/* Recipe list */}
        <nav className="flex-1 overflow-y-auto py-2">
          {RECIPES.map(recipe => {
            const isActive = recipe.id === activeRecipeId;
            return (
              <button
                key={recipe.id}
                onClick={() => setActiveRecipeId(recipe.id)}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  isActive
                    ? 'bg-white border-r-2 border-emerald-500 text-slate-900'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <div className="text-[10px] font-mono text-emerald-600 font-semibold mb-0.5">
                  {recipe.specRef}
                </div>
                <div className="text-sm font-medium leading-snug">{recipe.title}</div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 text-xs text-slate-400 space-y-1">
          <div>All recipes import from:</div>
          <div className="font-mono text-[10px] text-slate-500">@/lib/extensions</div>
          <div className="font-mono text-[10px] text-slate-500">@/lib/rules/quote</div>
          <div className="font-mono text-[10px] text-slate-500">@/lib/trace</div>
        </div>
      </aside>

      {/* Main panel */}
      <main className="flex-1 min-w-0 overflow-hidden">
        <RecipePanel key={activeRecipeId} recipe={activeRecipe} />
      </main>
    </div>
  );
}
