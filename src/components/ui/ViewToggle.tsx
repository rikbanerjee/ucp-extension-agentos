'use client';

import { useView } from '@/lib/context/ViewContext';

export function ViewToggle() {
  const { view, setView } = useView();
  return (
    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 w-fit">
      <button
        onClick={() => setView('business')}
        className={`min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2.5 sm:py-1.5 rounded-md text-xs font-semibold transition-colors ${
          view === 'business'
            ? 'bg-slate-900 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Business
      </button>
      <button
        onClick={() => setView('technical')}
        className={`min-h-[44px] sm:min-h-0 px-4 sm:px-3 py-2.5 sm:py-1.5 rounded-md text-xs font-semibold transition-colors ${
          view === 'technical'
            ? 'bg-slate-900 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Technical
      </button>
    </div>
  );
}
