'use client';

import { usePathname } from 'next/navigation';
import { NavBar } from '@/components/layout/NavBar';
import { Footer } from '@/components/layout/Footer';

// /demo is a full-screen, app-like experience: it fills exactly one viewport
// and scrolls its own internal panels, so it needs `main` pinned to h-full
// with overflow handled internally. Every other page is ordinary content —
// it should scroll normally, with the footer appearing at the end of the
// content instead of being pinned to the bottom of the viewport on load.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullScreen = pathname === '/demo';

  if (isFullScreen) {
    return (
      <div className="flex h-full flex-col">
        <NavBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <NavBar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
