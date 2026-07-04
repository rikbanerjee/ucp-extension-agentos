'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useView } from '@/lib/context/ViewContext';

type NavItem = { href: string; label: string; highlight?: boolean };
type NavGroup = { id: string; label: string; items: NavItem[] };

// Audience-based IA (SITE-PLAN SWP-7): retailers, builders, evidence, about.
const navGroups: NavGroup[] = [
  {
    id: 'retailers',
    label: 'For Retailers',
    items: [
      { href: '/aeo-score', label: 'AI-readiness score' },
      { href: '/for-merchants', label: 'For Merchants', highlight: true },
      { href: '/guided', label: 'See it (90s)' },
    ],
  },
  {
    id: 'builders',
    label: 'For Builders',
    items: [
      { href: '/adopt', label: 'Adopt' },
      { href: '/specs', label: 'Specs' },
      { href: '/demo', label: 'Playground' },
      { href: '/architecture', label: 'How it Works' },
      { href: '/sandbox/reference', label: 'Cookbook' },
    ],
  },
  {
    id: 'evidence',
    label: 'Evidence',
    items: [
      { href: '/evidence', label: 'Scorecard' },
      { href: '/buildlog', label: 'Build Log' },
    ],
  },
  {
    id: 'about',
    label: 'About',
    items: [
      { href: '/vision', label: 'Vision' },
      { href: '/profile', label: 'Founder Story' },
    ],
  },
];

export function NavBar() {
  const pathname = usePathname();
  const { view, setView } = useView();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  // Close any open menu on navigation. Adjusting state during render (rather
  // than in an effect) avoids the extra cascading render an effect would cost.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMenuOpen(false);
    setOpenGroup(null);
  }

  const close = () => setMenuOpen(false);
  const closeGroup = () => setOpenGroup(null);

  // Subscribe to a platform event (keyboard) — a legitimate effect, unlike the
  // pathname sync above.
  useEffect(() => {
    if (!openGroup && !menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpenGroup(null); setMenuOpen(false); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openGroup, menuOpen]);

  const isGroupActive = (group: NavGroup) => group.items.some(({ href }) => pathname === href);

  return (
    <header className="relative border-b border-slate-200 bg-white shadow-sm shrink-0 z-50">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="group mr-6 flex shrink-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-base font-black leading-none text-emerald-950 transition-transform group-hover:scale-105">
            R
          </span>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            RetailAgent<span className="text-emerald-600">OS</span>
          </span>
        </Link>

        {/* Desktop nav — hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
          {navGroups.map((group) => {
            const active = isGroupActive(group);
            const open = openGroup === group.id;
            return (
              <div key={group.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenGroup(open ? null : group.id)}
                  aria-haspopup="menu"
                  aria-expanded={open}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${
                    active
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {group.label}
                  <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full mt-1 w-56 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg z-50"
                  >
                    {group.items.map(({ href, label, highlight }) => {
                      const isActive = pathname === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          role="menuitem"
                          onClick={closeGroup}
                          className={`block px-4 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-slate-100 text-slate-900 font-semibold'
                              : highlight
                              ? 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Hamburger — visible on mobile only */}
        <button
          className="flex md:hidden ml-auto items-center justify-center w-11 h-11 rounded-md text-slate-600 hover:bg-slate-50 transition-colors"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Backdrop for desktop dropdown — closes menu on outside click */}
      {openGroup && (
        <div
          className="fixed inset-0 z-40 hidden md:block"
          onClick={closeGroup}
          aria-hidden="true"
        />
      )}

      {/* Mobile dropdown — absolute, anchored to header bottom */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-md md:hidden z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="flex flex-col px-4 pt-2 pb-3">
            {navGroups.map((group) => (
              <div key={group.id} className="py-2 first:pt-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 px-3">
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map(({ href, label, highlight }) => {
                    const isActive = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={close}
                        className={`flex items-center min-h-[44px] px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                          isActive
                            ? 'bg-slate-100 text-slate-900 font-semibold'
                            : highlight
                            ? 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Business / Technical toggle */}
          <div className="px-4 pb-5 pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 px-3">View</p>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 mx-3">
              <button
                onClick={() => { setView('business'); close(); }}
                className={`flex-1 min-h-[44px] rounded-md text-sm font-semibold transition-colors ${
                  view === 'business' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Business
              </button>
              <button
                onClick={() => { setView('technical'); close(); }}
                className={`flex-1 min-h-[44px] rounded-md text-sm font-semibold transition-colors ${
                  view === 'technical' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500'
                }`}
              >
                Technical
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop — closes mobile menu on outside tap */}
      {menuOpen && (
        <div
          className="fixed inset-0 -z-10 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}
    </header>
  );
}
