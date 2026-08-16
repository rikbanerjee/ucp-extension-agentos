import Link from 'next/link';

const steps = [
  { step: '01', title: 'The retailer publishes what it can support.', body: 'Prices, buyer eligibility, inventory and fulfilment rules — declared once, in a form machines can read.' },
  { step: '02', title: 'The shopping agent provides the customer and transaction context.', body: 'Who is buying, where, and what they are trying to do.' },
  { step: '03', title: 'RetailAgentOS returns a consistent answer with a reason.', body: 'The same question gets the same answer, every time — and every answer explains itself.' },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          A translator between commerce systems and AI shoppers
        </h2>
        <p className="mt-4 text-slate-500 max-w-xl mx-auto leading-relaxed">
          The store remains the source of truth. RetailAgentOS makes that truth usable by AI
          shopping agents.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {steps.map(({ step, title, body }) => (
          <div key={step} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm text-left">
            <div className="text-3xl font-black text-slate-200 mb-4 font-mono">{step}</div>
            <h3 className="font-semibold text-slate-900 mb-2 leading-snug">{title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link href="/architecture" className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
          See the technical architecture &rarr;
        </Link>
      </div>
    </section>
  );
}
