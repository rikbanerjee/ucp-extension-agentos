import Link from 'next/link';
import { Code2, BookOpen, PlayCircle, ClipboardCheck, Gauge } from 'lucide-react';
import { DEVELOPER_LINKS } from '@/lib/content/developerLinks';

const icons: Record<string, typeof Code2> = {
  '/developers': Code2,
  '/specs': BookOpen,
  '/demo': PlayCircle,
  '/adopt': ClipboardCheck,
  '/evidence/conformance': Gauge,
};

export function DeveloperGateway() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">Want the technical detail?</h2>
        <p className="mt-3 text-slate-500 max-w-xl mx-auto leading-relaxed">
          Explore the open specifications, reference engine, decision model and live playground.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {DEVELOPER_LINKS.map(({ href, label, description }) => {
          const Icon = icons[href] ?? Code2;
          return (
            <Link
              key={href}
              href={href}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-400 hover:shadow-sm transition-all text-left"
            >
              <Icon className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors mb-3" aria-hidden="true" />
              <span className="text-sm font-semibold text-slate-900">{label}</span>
              {description && <span className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</span>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
