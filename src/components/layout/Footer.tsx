'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AUDIENCES } from '@/lib/content/audiences';
import { DEVELOPER_LINKS, EVIDENCE_LINKS } from '@/lib/content/developerLinks';

type FooterLink = { href: string; label: string; external?: boolean };
type FooterColumn = { title: string; links: FooterLink[] };

const columns: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { href: '/#how-it-works', label: 'How it works' },
      { href: '/retailer-readiness', label: 'Readiness Studio' },
      { href: '/#retail-breadth', label: 'Retail scenarios' },
      { href: '/evidence', label: 'Evidence' },
      { href: '/#maturity', label: 'Maturity' },
    ],
  },
  {
    title: 'Solutions',
    links: AUDIENCES.map((a) => ({ href: a.href, label: a.navLabel })),
  },
  {
    title: 'Developers',
    links: DEVELOPER_LINKS.map(({ href, label }) => ({ href, label })),
  },
  {
    title: 'Company',
    links: [
      { href: '/vision', label: 'Vision' },
      { href: '/buildlog', label: 'Build Log' },
      { href: '/vision#founder', label: 'Founder' },
      { href: 'mailto:rikbanerjee007@gmail.com', label: 'Contact' },
      { href: 'https://www.linkedin.com/in/rik-banerjee/', label: 'LinkedIn', external: true },
      { href: 'https://rikngeek.substack.com', label: 'Substack', external: true },
    ],
  },
];

export function Footer() {
  const pathname = usePathname();
  if (pathname === '/demo') return null;
  return (
    <footer className="border-t border-slate-200 bg-white shrink-0">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {column.title}
              </h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-sm text-slate-600 hover:text-slate-900 transition-colors">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            <span className="font-semibold text-slate-600">RetailAgent<span className="text-emerald-600">OS</span></span>
            {' '}· UCP is the commerce rail; WebMCP is the browser action surface; RetailAgentOS is the reasoning layer · Building in public
          </p>
          <nav className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            {EVIDENCE_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} className="hover:text-slate-800 transition-colors">{label}</Link>
            ))}
            <Link href="/agents.md" className="hover:text-slate-800 transition-colors font-mono">/agents.md</Link>
            <Link href="/.well-known/ucp" className="hover:text-slate-800 transition-colors font-mono break-all">/.well-known/ucp</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
