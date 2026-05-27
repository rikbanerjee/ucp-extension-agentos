import Link from 'next/link';
import { ArrowRight, BookOpen, Layers, Terminal } from 'lucide-react';

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          UCP Retail Semantics Extension
        </h1>
        <p className="mt-6 text-lg leading-8 text-slate-600">
          This extends UCP. It does not replace UCP.
        </p>
        <p className="mt-4 text-base leading-7 text-slate-500 max-w-2xl mx-auto">
          A developer-facing demo exploring how merchants can add necessary retail semantics—pricing context, eligibility reasoning, and bulk logic—on top of the Unified Commerce Protocol before checkout.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/demo"
            className="rounded-md bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 flex items-center gap-2"
          >
            Launch Playground <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/architecture" className="text-sm font-semibold leading-6 text-slate-900 flex items-center gap-2">
            Read the Thesis <BookOpen className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="mt-10 pt-8 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-500">
          Exploring the bigger picture?{' '}
          <Link href="/home" className="text-slate-700 font-medium hover:text-slate-900 underline underline-offset-2 transition-colors">
            Read the full story
          </Link>
          {' '}or{' '}
          <Link href="/vision" className="text-slate-700 font-medium hover:text-slate-900 underline underline-offset-2 transition-colors">
            see the RetailAgentOS vision →
          </Link>
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Terminal className="w-8 h-8 text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">Profile Viewer</h3>
          <p className="mt-2 text-sm text-slate-600">
            Inspect a mock <code className="text-slate-800 bg-slate-100 px-1 rounded">/.well-known/ucp</code> profile demonstrating how vendor-scoped extensions are declared alongside core UCP capabilities.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <Layers className="w-8 h-8 text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">Context Simulator</h3>
          <p className="mt-2 text-sm text-slate-600">
            Mutate the active request context (customer type, tier, tax status) and watch how product visibility and prices adapt in real time.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <BookOpen className="w-8 h-8 text-slate-700 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900">Cart Validation</h3>
          <p className="mt-2 text-sm text-slate-600">
            Test complex pre-checkout logic like Minimum Order Quantities (MOQ), quantity increments, and eligibility restrictions.
          </p>
        </div>
      </div>
    </div>
  );
}
