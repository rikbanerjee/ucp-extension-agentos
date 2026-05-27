'use client';

import { createContext, useContext, useState } from 'react';

export type ViewMode = 'business' | 'technical';

interface ViewContextValue {
  view: ViewMode;
  setView: (v: ViewMode) => void;
}

const ViewContext = createContext<ViewContextValue>({
  view: 'business',
  setView: () => {},
});

export function ViewProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<ViewMode>('business');
  return (
    <ViewContext.Provider value={{ view, setView }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useView() {
  return useContext(ViewContext);
}
