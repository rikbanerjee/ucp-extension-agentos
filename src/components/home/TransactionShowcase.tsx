import { MessageCircle, Search, ListChecks, CheckCircle2, ShoppingCart } from 'lucide-react';

const flow = [
  { icon: MessageCircle, title: 'A shopper asks an AI', body: 'For something specific — a product, a price limit, a delivery need.' },
  { icon: Search, title: 'The AI discovers a retailer', body: 'It finds a retailer and product that could match the request.' },
  { icon: ListChecks, title: 'RetailAgentOS evaluates the rules', body: "It checks that retailer's eligibility, pricing, inventory and fulfilment rules." },
  { icon: CheckCircle2, title: 'It returns a decision and a reason', body: 'A clear answer — not a guess — with an explanation attached.' },
  { icon: ShoppingCart, title: 'The AI builds a cart that can proceed', body: 'No dead-end orders, no checkout surprises.' },
];

const decisions = [
  { label: 'Customer eligible' },
  { label: 'Correct price applied' },
  { label: 'Inventory available' },
  { label: 'Delivery mode supported' },
  { label: 'Quote validity explained' },
];

export function TransactionShowcase() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">One transaction, start to finish</h2>
        <p className="mt-3 text-slate-500 max-w-xl mx-auto leading-relaxed">
          Here is what happens behind a single shopping request.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-6 sm:p-8 shadow-xl mb-10">
        <p className="text-xs text-slate-500 font-mono mb-2">buyer query</p>
        <p className="font-mono text-sm sm:text-base text-emerald-300 leading-relaxed">
          &ldquo;Find groceries for tonight under $80, use my membership price and only include
          items deliverable to my address.&rdquo;
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-5 mb-12">
        {flow.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="rounded-xl border border-slate-200 bg-white p-4 flex sm:flex-col gap-3 sm:gap-2">
            <div className="shrink-0 flex sm:flex-col items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700">
                {i + 1}
              </span>
              <Icon className="w-4 h-4 text-slate-400 hidden sm:block" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 leading-snug">{title}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div>
        <p className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          What RetailAgentOS decides
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {decisions.map(({ label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-medium text-emerald-800"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
