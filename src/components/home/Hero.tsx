import Link from 'next/link';

const proofStrip = [
  'Same question, same answer',
  'Every decision explained',
  'Open specifications',
  'Tested reference engine',
];

export function Hero() {
  return (
    <div className="relative">
      {/* Decorative hero background band — native CSS/SVG, no image asset.
          Faint emerald glow in the lower-right, purely decorative: sits
          behind the hero content, never intercepts pointer events, and is
          clipped so it can't cause horizontal scroll. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] overflow-hidden"
      >
        <div
          className="absolute top-[-10%] h-[640px] w-[640px] rounded-full blur-3xl"
          style={{ right: '0%', background: 'radial-gradient(circle, rgba(16,185,129,0.55) 0%, rgba(16,185,129,0.22) 40%, rgba(16,185,129,0) 70%)' }}
        />
      </div>

      <div className="hero-content-above relative mx-auto max-w-4xl px-4 pt-16 pb-4 sm:px-6 lg:px-8 text-center">
        <div className="flex items-center justify-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
            For retailers and commerce platforms
          </span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl leading-tight">
          Right product. Right price.
          <br className="hidden sm:block" /> A cart that works.
        </h1>

        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          RetailAgentOS helps AI shopping assistants understand each retailer&rsquo;s products,
          prices and purchase rules&mdash;before checkout.
        </p>

        <p className="mt-3 text-sm font-medium text-slate-500">
          For one store or thousands.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          <Link
            href="/see-it-work"
            className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
          >
            See it work &rarr;
          </Link>
          <Link
            href="/webmcp-showcase"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            See an agent operate a store &rarr;
          </Link>
          <a
            href="#audiences"
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Find your path &rarr;
          </a>
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
          {proofStrip.map((item) => (
            <li key={item} className="inline-flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
