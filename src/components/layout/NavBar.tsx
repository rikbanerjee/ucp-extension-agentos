'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useView } from '@/lib/context/ViewContext';

const navLinks = [
  { href: '/', label: 'Overview' },
  { href: '/profile', label: 'Merchant Profile' },
  { href: '/demo', label: 'Playground' },
  { href: '/guided', label: 'Guided Demo' },
  { href: '/architecture', label: 'Architecture' },
  { href: '/vision', label: 'RetailAgentOS' },
];

export function NavBar() {
  const pathname = usePathname();
  const { view, setView } = useView();

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm shrink-0">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold text-lg tracking-tight text-slate-900">
            RetailAgentOS
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium text-slate-600">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Business / Technical toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            onClick={() => setView('business')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              view === 'business'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Business
          </button>
          <button
            onClick={() => setView('technical')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              view === 'technical'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Technical
          </button>
        </div>
      </div>
    </header>
  );
}
