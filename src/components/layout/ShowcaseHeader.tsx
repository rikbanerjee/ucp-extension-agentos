'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import {
  SHOWCASE_BACK_LINK,
  SHOWCASE_BADGE_SHORT,
  SHOWCASE_NAV_LINKS,
  type ShowcaseNavLink,
} from '@/lib/content/showcaseChrome';

/**
 * Focused challenge header for `/webmcp-showcase` and `/agent-ready-storefront`.
 *
 * These routes deliberately do NOT render the normal dropdown-heavy Product / Solutions /
 * Developers / Evidence / About navigation (see AppShell): a judge landing here should be able
 * to identify, run, understand, and leave the demo without meeting the whole company IA. The
 * broader site keeps its normal navigation untouched.
 *
 * Desktop and mobile navigation are mutually exclusive at the same `lg` breakpoint NavBar uses,
 * so a ~768px tablet gets the menu button rather than an overflowing row.
 */
export function ShowcaseHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  // Subscribe to a platform event (keyboard) so Escape closes the focused menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  return (
    <header className="showcase-header border-b border-slate-200 bg-white shadow-sm shrink-0">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Identity — RetailAgentOS first, challenge badge second. Never the reverse. */}
        <Link href="/" className="group flex min-w-0 shrink items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-base font-black leading-none text-emerald-950 transition-transform group-hover:scale-105">
            R
          </span>
          <span className="truncate text-lg font-extrabold tracking-tight text-slate-900">
            RetailAgent<span className="text-emerald-600">OS</span>
          </span>
        </Link>

        {/* Text-only badge — no OpenAI logo or mark, and no claim of endorsement or selection.
            Hidden below `sm` so a 320px viewport never clips it or overflows horizontally. */}
        <span className="hidden shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-emerald-800 sm:inline-flex">
          {SHOWCASE_BADGE_SHORT}
        </span>

        <nav aria-label="WebMCP demo" className="ml-auto hidden items-center gap-1 lg:flex">
          {SHOWCASE_NAV_LINKS.map((link) => (
            <ShowcaseNavAnchor
              key={link.href}
              link={link}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            />
          ))}
          <Link
            href={SHOWCASE_BACK_LINK.href}
            className="ml-2 inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            {SHOWCASE_BACK_LINK.label}
          </Link>
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close demo menu' : 'Open demo menu'}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-50 lg:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <div
          id={menuId}
          className="absolute top-full right-0 left-0 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-slate-200 bg-white shadow-md lg:hidden"
        >
          <nav aria-label="WebMCP demo (menu)" className="flex flex-col px-4 pt-2 pb-3">
            {[...SHOWCASE_NAV_LINKS, SHOWCASE_BACK_LINK].map((link) => (
              <ShowcaseNavAnchor
                key={link.href}
                link={link}
                onNavigate={close}
                className="flex min-h-[44px] items-center rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              />
            ))}
          </nav>
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 -z-10 lg:hidden" onClick={close} aria-hidden="true" />
      )}
    </header>
  );
}

/** One link renderer for both navigation systems, so their labels and destinations cannot drift. */
function ShowcaseNavAnchor({
  link,
  className,
  onNavigate,
}: {
  link: ShowcaseNavLink;
  className: string;
  onNavigate?: () => void;
}) {
  if (link.external) {
    return (
      <a
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onNavigate}
        className={className}
      >
        {link.label} <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  // In-page anchors stay plain <a> elements: the browser's own fragment navigation scrolls and
  // moves focus to the (tabbable, scroll-margin-aware) target. No timers, no scripted scrolling,
  // and nothing that could be mistaken for a WebMCP invocation.
  if (link.href.startsWith('#')) {
    return (
      <a href={link.href} onClick={onNavigate} className={className}>
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} onClick={onNavigate} className={className}>
      {link.label}
    </Link>
  );
}
