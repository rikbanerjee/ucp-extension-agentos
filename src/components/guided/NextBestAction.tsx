import Link from 'next/link';

interface NextBestActionProps {
  eyebrow?: string;
  heading: string;
  body?: string;
  primaryLabel: string;
  /** Internal route or a mailto: link. */
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  tertiaryLabel?: string;
  tertiaryHref?: string;
  /** When provided, renders a quiet "Replay this demo" action alongside the tertiary link. */
  onReplay?: () => void;
  /** 'dark' matches the existing solution-page bottom-panel treatment; 'light' sits inside a guided-demo scene on a light background. */
  variant?: 'dark' | 'light';
}

/**
 * Reusable completion / bottom-of-page conversion panel. Exactly one
 * visually dominant action, at most one standard secondary action, and a
 * quiet tertiary text link — never more than that.
 */
export function NextBestAction({
  eyebrow,
  heading,
  body,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  tertiaryLabel,
  tertiaryHref,
  onReplay,
  variant = 'light',
}: NextBestActionProps) {
  const dark = variant === 'dark';
  const isPrimaryMail = primaryHref.startsWith('mailto:');
  const isSecondaryMail = secondaryHref?.startsWith('mailto:');

  return (
    <div
      className={`rounded-2xl p-8 sm:p-10 text-center shadow-sm ${
        dark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'
      }`}
    >
      {eyebrow && (
        <p
          className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
            dark ? 'text-emerald-400' : 'text-emerald-600'
          }`}
        >
          {eyebrow}
        </p>
      )}
      <h2 className={`text-2xl font-bold mb-3 ${dark ? 'text-white' : 'text-slate-900'}`}>{heading}</h2>
      {body && (
        <p className={`text-sm leading-relaxed max-w-md mx-auto mb-8 ${dark ? 'text-slate-400' : 'text-slate-600'}`}>
          {body}
        </p>
      )}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {isPrimaryMail ? (
          <a
            href={primaryHref}
            className={`inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
              dark ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {primaryLabel}
          </a>
        ) : (
          <Link
            href={primaryHref}
            className={`inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
              dark ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {primaryLabel}
          </Link>
        )}
        {secondaryLabel &&
          secondaryHref &&
          (isSecondaryMail ? (
            <a
              href={secondaryHref}
              className={`inline-flex items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                dark ? 'border-white/20 text-white hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              {secondaryLabel}
            </a>
          ) : (
            <Link
              href={secondaryHref}
              className={`inline-flex items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-semibold transition-colors min-h-[44px] ${
                dark ? 'border-white/20 text-white hover:bg-white/10' : 'border-slate-300 text-slate-700 hover:border-slate-400 hover:text-slate-900'
              }`}
            >
              {secondaryLabel}
            </Link>
          ))}
      </div>
      {(onReplay || (tertiaryLabel && tertiaryHref)) && (
        <div className="mt-6 flex items-center justify-center gap-5 flex-wrap text-xs">
          {onReplay && (
            <button
              type="button"
              onClick={onReplay}
              className={`underline underline-offset-2 transition-colors min-h-[44px] px-1 ${
                dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ↩ Replay this demo
            </button>
          )}
          {tertiaryLabel && tertiaryHref && (
            <Link
              href={tertiaryHref}
              className={`underline underline-offset-2 transition-colors min-h-[44px] px-1 inline-flex items-center ${
                dark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tertiaryLabel}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
