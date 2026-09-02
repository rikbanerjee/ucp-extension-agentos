import { PlayCircle } from 'lucide-react';
import {
  SHOWCASE_ANCHORS,
  SHOWCASE_EYEBROW,
  SHOWCASE_HEADLINE,
  SHOWCASE_PAGE_LABEL,
  SHOWCASE_SOURCE_URL,
  SHOWCASE_SUPPORTING_COPY,
  getShowcaseVideoUrl,
} from '@/lib/content/showcaseChrome';

/**
 * Judge-facing page identity: challenge context, then the product label, then the business
 * outcome. Protocol history, schemas, and architecture stay progressively disclosed in Mission
 * Control and Developer Evidence — never in this hero.
 */
export function ShowcaseHero() {
  // Configured once, centrally. When no real public URL exists the action is simply absent —
  // never a placeholder, a `#` link, or an unactionable "coming soon".
  const videoUrl = getShowcaseVideoUrl();

  return (
    <header className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-xs font-bold tracking-wider text-emerald-700 uppercase">
        {SHOWCASE_EYEBROW}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-500">{SHOWCASE_PAGE_LABEL}</p>
      <h1 className="mt-1 max-w-4xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {SHOWCASE_HEADLINE}
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
        {SHOWCASE_SUPPORTING_COPY}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {/* Scrolls to the mission launcher. It never starts native WebMCP or guided replay —
            choosing which of those to run stays an explicit action inside the launcher. */}
        <a
          href={`#${SHOWCASE_ANCHORS.mission}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          <PlayCircle size={16} aria-hidden="true" /> Start the 90-second demo
        </a>
        <a
          href={SHOWCASE_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
        >
          View source <span className="sr-only">on GitHub (opens in a new tab)</span>
        </a>
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
          >
            Watch video <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-500">
        Choose a native browser-agent mission or the guided replay.
      </p>
    </header>
  );
}
