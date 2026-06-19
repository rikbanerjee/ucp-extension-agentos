'use client';

interface CodeBlockProps {
  code: string;
  label?: string;
}

/**
 * Minimal code display component with project-standard dark styling.
 * Matches the pattern used in specs/0008-trust-provenance/page.tsx.
 */
export function CodeBlock({ code, label }: CodeBlockProps) {
  return (
    <div className="rounded-lg overflow-hidden border border-slate-700">
      {label && (
        <div className="bg-slate-800 px-4 py-2 text-xs font-mono text-slate-400 border-b border-slate-700">
          {label}
        </div>
      )}
      <pre className="bg-slate-900 text-slate-100 text-xs p-4 overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}
