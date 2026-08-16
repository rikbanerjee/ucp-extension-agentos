'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown } from 'lucide-react';
import { AUDIENCES } from '@/lib/content/audiences';
import { DEVELOPER_LINKS, EVIDENCE_LINKS } from '@/lib/content/developerLinks';

type NavLink = { href: string; label: string };
type NavDropdown = { id: string; label: string; items: NavLink[] };
type NavEntry =
  | { kind: 'link'; href: string; label: string }
  | { kind: 'dropdown'; dropdown: NavDropdown };

// New top-level IA (replaces the audience-grouped nav): Product / Solutions /
// Developers / Evidence / About, plus the primary "See it work" CTA.
const navEntries: NavEntry[] = [
  { kind: 'link', href: '/#how-it-works', label: 'Product' },
  {
    kind: 'dropdown',
    dropdown: {
      id: 'solutions',
      label: 'Solutions',
      items: AUDIENCES.map((a) => ({ href: a.href, label: a.navLabel })),
    },
  },
  {
    kind: 'dropdown',
    dropdown: {
      id: 'developers',
      label: 'Developers',
      items: DEVELOPER_LINKS.map(({ href, label }) => ({ href, label })),
    },
  },
  {
    kind: 'dropdown',
    dropdown: {
      id: 'evidence',
      label: 'Evidence',
      items: EVIDENCE_LINKS.map(({ href, label }) => ({ href, label })),
    },
  },
  {
    kind: 'dropdown',
    dropdown: {
      id: 'about',
      label: 'About',
      items: [
        { href: '/vision', label: 'Vision' },
        { href: '/vision#founder', label: 'Founder Story' },
        { href: 'mailto:rikbanerjee007@gmail.com', label: 'Contact' },
      ],
    },
  },
];

function isActiveHref(pathname: string, href: string) {
  if (href.startsWith('mailto:')) return false;
  const path = href.split('#')[0] || '/';
  if (path === '/') return pathname === '/';
  // Nested-route matching: /solutions/enterprise-retail should keep the
  // Solutions group (and /for-merchants compat redirect target) marked active
  // for any deeper path under it, e.g. future sub-pages.
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function NavBar() {
  const pathname = usePathname();
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

  const isDropdownActive = (dropdown: NavDropdown) =>
    dropdown.items.some(({ href }) => isActiveHref(pathname, href)) ||
    (dropdown.id === 'solutions' && pathname.startsWith('/for-merchants'));

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
          {navEntries.map((entry) => {
            if (entry.kind === 'link') {
              const active = isActiveHref(pathname, entry.href);
              return (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className={`px-3 py-1.5 rounded-md transition-colors text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                    active
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {entry.label}
                </Link>
              );
            }

            const { dropdown } = entry;
            const active = isDropdownActive(dropdown);
            const open = openGroup === dropdown.id;
            return (
              <div key={dropdown.id} className="relative">
                <button
                  type="button"
                  onClick={() => setOpenGroup(open ? null : dropdown.id)}
                  aria-haspopup="menu"
                  aria-expanded={open}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 ${
                    active
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {dropdown.label}
                  <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div
                    role="menu"
                    className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-slate-200 bg-white py-1.5 shadow-lg z-50"
                  >
                    {dropdown.items.map(({ href, label }) => {
                      const isActive = isActiveHref(pathname, href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          role="menuitem"
                          onClick={closeGroup}
                          className={`block px-4 py-2 text-sm transition-colors ${
                            isActive
                              ? 'bg-slate-100 text-slate-900 font-semibold'
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

        {/* Primary CTA — desktop only, mirrored inside the mobile drawer below */}
        <Link
          href="/see-it-work"
          className="hidden md:inline-flex ml-auto items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          See it work
        </Link>

        {/* Hamburger — visible on mobile only */}
        <button
          className="flex md:hidden ml-auto items-center justify-center w-11 h-11 rounded-md text-slate-600 hover:bg-slate-50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
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

      {/* Mobile dropdown — absolute, anchored to header bottom. Mirrors the
          same Product / Solutions / Developers / Evidence / About hierarchy
          as desktop, so mobile visitors see the identical information order. */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-md md:hidden z-50 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <nav className="flex flex-col px-4 pt-2 pb-3">
            <Link
              href="/see-it-work"
              onClick={close}
              className="flex items-center justify-center min-h-[44px] mt-1 mb-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              See it work
            </Link>

            {navEntries.map((entry) => {
              if (entry.kind === 'link') {
                const active = isActiveHref(pathname, entry.href);
                return (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    onClick={close}
                    className={`flex items-center min-h-[44px] px-3 py-2 rounded-md transition-colors text-sm font-semibold ${
                      active ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {entry.label}
                  </Link>
                );
              }

              const { dropdown } = entry;
              return (
                <div key={dropdown.id} className="py-2 first:pt-0">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 px-3">
                    {dropdown.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {dropdown.items.map(({ href, label }) => {
                      const isActive = isActiveHref(pathname, href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={close}
                          className={`flex items-center min-h-[44px] px-3 py-2 rounded-md transition-colors text-sm font-medium ${
                            isActive
                              ? 'bg-slate-100 text-slate-900 font-semibold'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
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
