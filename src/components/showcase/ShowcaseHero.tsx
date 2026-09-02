export function ShowcaseHero() {
  return (
    <header className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
        Built for the OpenAI WebMCP Challenge · Live native WebMCP implementation
      </p>
      <h1 className="mt-2 max-w-4xl text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        The browser agent asks. RetailAgentOS checks what the retailer can actually promise.
      </h1>
      <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
        WebMCP exposes the next safe browser action—while RetailAgentOS validates inventory,
        pricing, fulfillment, and merchant policy.
      </p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-emerald-800">
        <a href="#mission-launcher" className="underline underline-offset-2">Judge in 90 seconds</a>
        <a href="https://github.com/rikbanerjee/ucp-extension-agentos" className="underline underline-offset-2">View source</a>
        <span className="text-slate-600">Guided fallback available</span>
      </div>
    </header>
  );
}
