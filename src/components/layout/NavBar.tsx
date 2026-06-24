'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useView } from '@/lib/context/ViewContext';

const navLinks = [
  { href: '/architecture', label: 'How it Works' },
  { href: '/guided', label: 'See it (90s)' },
  { href: '/demo', label: 'Playground' },
  { href: '/specs', label: 'Specs' },
  { href: '/aeo-score', label: 'AEO Score' },
  { href: '/for-merchants', label: 'For Merchants', highlight: true },
  { href: '/buildlog', label: 'Build Log' },
];

export function NavBar() {
  const pathname = usePathname();
  const { view, setView } = useView();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const close = () => setMenuOpen(false);

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
          {navLinks.map(({ href, label, highlight }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md transition-colors text-sm font-medium ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : highlight
                    ? 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {label}
              </Link>
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

      {/* Mobile dropdown — absolute, anchored to header bottom */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-md md:hidden z-50">
          <nav className="flex flex-col px-4 pt-2 pb-3 gap-0.5">
            {navLinks.map(({ href, label, highlight }) => {
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

      {/* Backdrop — closes menu on outside tap */}
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
