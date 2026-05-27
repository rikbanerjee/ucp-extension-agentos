import { cn } from './Badge';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  headerRight?: React.ReactNode;
}

export function Panel({ title, headerRight, className, children, ...props }: PanelProps) {
  return (
    <div className={cn('flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden', className)} {...props}>
      {(title || headerRight) && (
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}
      <div className="flex-1 p-4 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
