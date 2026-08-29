import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Layers, Boxes, Sparkles } from 'lucide-react';
import StudioWizard from '@/components/readiness/StudioWizard';

export const metadata: Metadata = {
  title: 'Retailer Readiness Studio | RetailAgentOS',
  description:
    'Upload a catalog export, answer a few business questions, and see what an AI shopper can safely sell — then download a practical implementation plan for UCP and RetailAgentOS.',
};

export default async function RetailerReadinessPage({ searchParams }: { searchParams: Promise<{ audience?: string; sample?: string }> }) {
  const params = await searchParams;
  const audience = params.audience === 'boutique' || params.audience === 'enterprise' ? params.audience : 'direct';
  const sampleHref = `/retailer-readiness?${new URLSearchParams({ audience, sample: '1' }).toString()}`;
  return (
    <div>
      <section className="border-b border-slate-200 bg-gradient-to-b from-emerald-50 to-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Retailer Readiness Studio</p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Make your catalog ready for AI shopping.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Upload a catalog export, answer a few business questions and see what an AI shopper can safely sell. You’ll
            get a practical implementation plan for UCP and RetailAgentOS.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#wizard"
              className="inline-flex min-h-[44px] items-center rounded-md bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              Check my catalog
            </a>
            <a
              href={sampleHref}
              className="inline-flex min-h-[44px] items-center rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
            >
              See a sample result
            </a>
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={14} aria-hidden="true" />
            Your catalog is processed in this browser. RetailAgentOS does not upload or store your file.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 p-5">
            <Layers className="text-emerald-600" size={20} aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-slate-900">UCP foundation</h2>
            <p className="mt-2 text-sm text-slate-600">
              Gives AI shopping platforms a standard way to discover commerce capabilities and work with checkout.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <Boxes className="text-emerald-600" size={20} aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-slate-900">RetailAgentOS decision layer</h2>
            <p className="mt-2 text-sm text-slate-600">
              Gives the agent a reliable answer about which product to sell, what this customer should pay, and whether
              the order can actually be fulfilled.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 p-5">
            <Sparkles className="text-emerald-600" size={20} aria-hidden="true" />
            <h2 className="mt-3 font-semibold text-slate-900">Together</h2>
            <p className="mt-2 text-sm text-slate-600">
              The agent can recommend confidently and create a cart that is more likely to succeed.
            </p>
          </div>
        </div>
        <p className="mt-6 max-w-2xl text-xs text-slate-500">
          No developer is required to assess your catalog, map your business rules, preview the result, or create the
          implementation kit. A site administrator, commerce platform, or engineering team may still be needed to
          expose live endpoints and connect checkout. Prefer the full guided walkthrough instead?{' '}
          <Link href="/see-it-work" className="underline hover:text-slate-700">See it work</Link>.
        </p>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <StudioWizard audience={audience} loadSample={params.sample === '1'} />
      </section>
    </div>
  );
}
