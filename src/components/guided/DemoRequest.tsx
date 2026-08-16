interface RequestItem {
  label: string;
  value: string;
}

interface DemoRequestProps {
  eyebrow?: string;
  /** The shopper's request in plain language, shown as a quoted line. */
  query?: string;
  /** Relevant context, shown as label/value pairs — never raw JSON. */
  items?: RequestItem[];
}

/**
 * Plain-language display of a buyer request and its relevant context.
 * Shared across guided-demo tracks so "what the shopper is asking for" is
 * always presented the same way, without jargon or raw payloads.
 */
export function DemoRequest({ eyebrow = 'Buyer request', query, items = [] }: DemoRequestProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{eyebrow}</div>
      {query && (
        <p className="text-base font-medium text-slate-900 leading-relaxed">&ldquo;{query}&rdquo;</p>
      )}
      {items.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 pt-3 border-t border-slate-100">
          {items.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</dt>
              <dd className="text-sm font-medium text-slate-800 mt-0.5">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
