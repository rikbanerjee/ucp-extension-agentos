'use client';

import { usePathname } from 'next/navigation';
import { NavBar } from '@/components/layout/NavBar';
import { Footer } from '@/components/layout/Footer';
import { ShowcaseHeader } from '@/components/layout/ShowcaseHeader';
import { ShowcaseFooter } from '@/components/layout/ShowcaseFooter';
import { isShowcaseRoute } from '@/lib/content/showcaseChrome';

// /demo is a full-screen, app-like experience: it fills exactly one viewport
// and scrolls its own internal panels, so it needs `main` pinned to h-full
// with overflow handled internally. Every other page is ordinary content —
// it should scroll normally, with the footer appearing at the end of the
// content instead of being pinned to the bottom of the viewport on load.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullScreen = pathname === '/demo';

  // The canonical `/webmcp-showcase` route and its `/agent-ready-storefront` compatibility
  // route use focused challenge chrome instead of the normal dropdown-heavy company navigation
  // and multi-column footer (AGENTS.md). This is the single place that decision is made, so
  // exactly one header and one footer can ever render on a route — never both systems.
  const showcase = isShowcaseRoute(pathname);
  const Header = showcase ? ShowcaseHeader : NavBar;
  const PageFooter = showcase ? ShowcaseFooter : Footer;

  if (isFullScreen) {
    return (
      <div className="flex h-full flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <PageFooter />
      </div>
    );
  }

  // `shrink-0` matters: `body` is a fixed-height (`h-full`) column flex container, so without it
  // this wrapper — a flex item — is shrunk back to exactly one viewport while its content
  // overflows. That capped wrapper is the sticky challenge header's containing block, which made
  // the header stop sticking roughly one viewport down the page. Growing the wrapper to its
  // content height changes nothing visually (the overflow was already painted) and lets a sticky
  // header stay pinned for the whole scroll.
  return (
    <div className="flex min-h-full shrink-0 flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <PageFooter />
    </div>
  );
}
