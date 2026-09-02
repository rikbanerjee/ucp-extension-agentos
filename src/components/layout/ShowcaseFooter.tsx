import Link from 'next/link';
import {
  SHOWCASE_BUILT_IN_PUBLIC_LINE,
  SHOWCASE_FOOTER_LINKS,
  SHOWCASE_RELATIONSHIP_LINE,
} from '@/lib/content/showcaseChrome';

/**
 * Compact challenge footer for `/webmcp-showcase` and `/agent-ready-storefront`.
 *
 * It replaces — never accompanies — the large multi-column company footer on these two routes
 * (AppShell picks exactly one). UCP stays available in the developer documentation and on the
 * rest of the site; it is deliberately not the message a challenge judge reads here.
 */
export function ShowcaseFooter() {
  return (
    <footer className="shrink-0 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">
            RetailAgent<span className="text-emerald-600">OS</span>
          </span>{' '}
          · {SHOWCASE_RELATIONSHIP_LINE}
        </p>
        <nav
          aria-label="WebMCP demo footer"
          className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600"
        >
          {SHOWCASE_FOOTER_LINKS.map(({ href, label, external }) =>
            external ? (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-slate-900"
              >
                {label} <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <Link key={href} href={href} className="transition-colors hover:text-slate-900">
                {label}
              </Link>
            ),
          )}
        </nav>
        <p className="text-xs text-slate-400">{SHOWCASE_BUILT_IN_PUBLIC_LINE}</p>
      </div>
    </footer>
  );
}
