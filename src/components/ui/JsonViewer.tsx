'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from './Badge';

interface JsonViewerProps {
  data: any;
  className?: string;
  title?: string;
}

export function JsonViewer({ data, className, title }: JsonViewerProps) {
  return (
    <div className={cn('rounded-md border border-slate-700 bg-[#1e1e1e] overflow-hidden', className)}>
      {title && (
        <div className="bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 border-b border-slate-700">
          {title}
        </div>
      )}
      <SyntaxHighlighter
        language="json"
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          background: 'transparent',
        }}
      >
        {JSON.stringify(data, null, 2)}
      </SyntaxHighlighter>
    </div>
  );
}
