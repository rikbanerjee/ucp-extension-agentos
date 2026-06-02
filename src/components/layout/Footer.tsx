'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();
  if (pathname === '/demo') return null;
  return (
    <footer className="border-t border-slate-200 bg-white shrink-0">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between flex-wrap gap-y-2 gap-x-6">

        <p className="text-xs text-slate-400">
          <a href="mailto:rikbanerjee007@gmail.com" className="text-slate-500 hover:text-slate-700 transition-colors font-medium">
            Rik Banerjee
          </a>
          {' '}· UCP = the rails · <span className="font-semibold text-slate-600">RetailAgent<span className="text-emerald-600">OS</span></span> = the reasoning layer · Building in public
        </p>

        <nav className="flex items-center gap-4 text-xs text-slate-500">
          <Link href="/for-merchants" className="hover:text-slate-800 transition-colors">For Merchants</Link>
          <Link href="/buildlog" className="hover:text-slate-800 transition-colors">Build Log</Link>
          <a href="https://www.linkedin.com/in/rik-banerjee/" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800 transition-colors">LinkedIn</a>
          <a href="https://rikngeek.substack.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800 transition-colors">Substack</a>
          <a href="mailto:rikbanerjee007@gmail.com" className="hover:text-slate-800 transition-colors">Get in touch</a>
        </nav>

      </div>
    </footer>
  );
}
