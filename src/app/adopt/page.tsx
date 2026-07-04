import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  Mail,
  BookOpen,
  PlayCircle,
  FlaskConical,
} from 'lucide-react';

const twoContracts = `import { evaluateOffer, buildManifest, toSchemaOrgProduct } from '@retailagentos/engine';

// 1. Map YOUR catalog to canonical variants
interface MerchantCatalogAdapter<TSource> {
  merchantProfile(): MerchantProfile;      // tier + capabilities[] + endpoints + servesRegions
  toVariants(source: TSource): Variant[];  // one of your products -> 1+ RAOS variants
  listVariants(): Variant[];               // your whole normalized catalog
}

// 2. Resolve who is shopping (region, fulfillment mode, claims)
interface BuyerContextResolver {
  resolve(input: { region?: string; fulfillmentMode?: string }): PartialBuyerContext;
}`;

const derivedSurfaces = [
  { call: 'buildManifest(profile)', get: 'UCP discovery manifest', servedAt: 'GET /.well-known/ucp' },
  { call: 'toSchemaOrgProduct(variant)', get: 'Product + Offer JSON-LD', servedAt: 'each product URL (server-rendered)' },
  { call: 'toProductFeed(variants)', get: 'Google-format feed rows', servedAt: 'wherever you publish feeds' },
  { call: 'evaluateOffer({merchant, variant, quantity, context, now})', get: 'full DecisionRecord with reasons', servedAt: 'your API / MCP tools' },
  { call: 'issueQuote(record, now) / validateQuote(...)', get: 'price-lock tokens', servedAt: 'quote + checkout handoff' },
  { call: 'buildDecisionTrace(record) + 3 renderers', get: 'buyer / merchant-ops / developer views of any decision', servedAt: 'UI, support tooling, logs' },
];

type TierSpec = { code: string; title: string; href: string | null };

type Tier = {
  tier: string;
  name: string;
  promise: string;
  effort?: string;
  planned?: boolean;
  items: { do: string; specs: TierSpec[] }[];
  acceptance: string[];
};

const tiers: Tier[] = [
  {
    tier: 'Tier 0',
    name: 'Discoverable',
    promise: 'an agent can find and correctly read my catalog',
    effort: 'Typical effort: ~1 day once your adapter maps the catalog.',
    items: [
      { do: 'Implement MerchantCatalogAdapter over your existing product data', specs: [{ code: 'RAOS-0000', title: 'Protocol Foundations', href: '/specs/0000-foundations' }] },
      { do: 'Serve buildManifest() at /.well-known/ucp', specs: [{ code: 'RAOS-0000', title: 'Protocol Foundations', href: '/specs/0000-foundations' }] },
      { do: 'Serve toSchemaOrgProduct() JSON-LD on product pages (prerender or edge function if you’re an SPA)', specs: [{ code: 'RAOS-0000', title: 'Protocol Foundations', href: '/specs/0000-foundations' }] },
    ],
    acceptance: [
      'curl https://yourstore.com/.well-known/ucp returns tier + capabilities',
      'curl on a product URL returns valid JSON-LD without JavaScript',
    ],
  },
  {
    tier: 'Tier 1',
    name: 'Qualified',
    promise: 'no dead-end carts',
    effort: 'Only eligible, in-stock items surface, with a reason for everything hidden or blocked.',
    items: [
      { do: 'Populate eligibilityRules on variants (visibility, region, qualification)', specs: [{ code: 'RAOS-0001', title: 'Eligibility & Visibility Semantics', href: '/specs/0001-eligibility' }] },
      { do: 'Populate inventory state (+ freshness TTL, optional soft-hold reservation)', specs: [{ code: 'RAOS-0005', title: 'Inventory & Availability', href: '/specs/0005-inventory' }] },
      { do: 'Implement BuyerContextResolver; call evaluateOffer per product view / cart line', specs: [{ code: 'RAOS-0000 §4', title: 'Protocol Foundations', href: '/specs/0000-foundations' }] },
    ],
    acceptance: [
      'An out-of-region or out-of-stock request returns a ReasonEntry (e.g. REGION_RESTRICTED, OUT_OF_STOCK) with severity and resolution path — not a silent miss or a checkout failure',
    ],
  },
  {
    tier: 'Tier 2',
    name: 'Priced',
    promise: 'the right price per buyer, honored at checkout',
    items: [
      { do: 'Configure member / bulk pricing (MOQ, increments, tiers, teaser prices, purchase limits)', specs: [{ code: 'RAOS-0002', title: 'Contextual Pricing', href: '/specs/0002-contextual-pricing' }] },
      { do: 'Issue and validate quote tokens; declare your honor policy (grace / requote / reject)', specs: [{ code: 'RAOS-0007', title: 'Quote Integrity & Price Lock', href: '/specs/0007-quote-integrity' }] },
      { do: 'Attach the trust/freshness envelope (simulated signing is fine to start — it’s labeled)', specs: [{ code: 'RAOS-0008', title: 'Trust, Provenance & Freshness', href: '/specs/0008-trust-provenance' }] },
    ],
    acceptance: [
      'The price an agent shows is bound in a TTL’d QuoteToken',
      'A stale or context-changed quote is re-quoted per your declared policy, never silently repriced',
    ],
  },
  {
    tier: 'Tier 3',
    name: 'Member-aware',
    promise: 'supports member/loyalty-aware pricing and earn preview',
    planned: true,
    items: [
      { do: 'Loyalty earn/burn preview', specs: [{ code: 'RAOS-0009', title: 'Loyalty & Rewards — planned', href: null }] },
      { do: 'Subscriptions & recurring', specs: [{ code: 'RAOS-0010', title: 'Subscriptions & Recurring — planned', href: null }] },
      { do: 'Promo stacking', specs: [{ code: 'RAOS-0006', title: 'Promotional Pricing & Stacking — planned', href: null }] },
    ],
    acceptance: [],
  },
  {
    tier: 'Tier 4',
    name: 'Assisted',
    promise: 'full commerce: fulfillment, handoff, intent, returns',
    planned: true,
    items: [
      { do: 'Fulfillment feasibility', specs: [{ code: 'RAOS-0003', title: 'Fulfillment Feasibility — planned', href: null }] },
      { do: 'Cart bridge & checkout handoff', specs: [{ code: 'RAOS-0012', title: 'Cart Bridge & Checkout Handoff — planned', href: null }] },
      { do: 'Intent capture routing (part 2)', specs: [{ code: 'RAOS-0013 pt 2', title: 'Intent Capture & Assisted Commerce — planned', href: null }] },
      { do: 'Returns & post-purchase policy', specs: [{ code: 'RAOS-0014', title: 'Returns & Post-Purchase Policy — planned', href: null }] },
    ],
    acceptance: [],
  },
];

const worked = [
  { step: 'Adapter', detail: 'CustomHubAdapter: products.json → variants; compareAtPrice → applied offer; inventoryQty → inventory state; null variant rows stripped' },
  { step: 'Buyer context', detail: 'region (US/CA allowlist via checkServesRegion) + fulfillment mode' },
  { step: 'Tier 0', detail: 'manifest via Cloud Function; JSON-LD via prerender (the SPA is invisible to agents otherwise)' },
  { step: 'Tier 1–2', detail: 'eligibility + inventory + quote via evaluateOffer/issueQuote behind a Cloud Run MCP server' },
  { step: 'Differentiator', detail: 'callForPrice: true custom/bulk SKUs route to structured intent capture instead of dead-ending at a contact form' },
];

export default function AdoptPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* Hero */}
        <div className="mb-14">
          <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">
            For platform engineers &amp; builders
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 mb-5">
            Implement two contracts. Pick a tier. Everything else is derived.
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
            RetailAgentOS is a reasoning layer on top of UCP (Universal Commerce Protocol).
            You write a <code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded font-mono">MerchantCatalogAdapter</code> and
            a <code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded font-mono">BuyerContextResolver</code>; the engine
            derives your manifest, JSON-LD, product feed, decision pipeline, quotes, and traces.
            You never re-implement commerce reasoning.
          </p>
          <p className="mt-4 text-base text-slate-500 max-w-2xl">
            This page renders <code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded font-mono">ADOPTION-GUIDE.md</code>{' '}
            as a product page. That file in the repo is canonical &mdash; this is the same content,
            laid out for reading without cloning anything. See{' '}
            <Link href="/specs" className="text-emerald-600 hover:underline">the spec catalog</Link>{' '}
            for the exact contracts.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/specs"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 hover:bg-slate-800 transition-colors"
            >
              <BookOpen size={16} />
              Read the specs
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold px-5 py-2.5 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
            >
              <PlayCircle size={16} />
              Open the Playground
            </Link>
            <a
              href="mailto:rikbanerjee007@gmail.com?subject=RetailAgentOS%20pilot%20inquiry"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold px-5 py-2.5 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
            >
              <Mail size={16} />
              Ask about a pilot
            </a>
          </div>
        </div>

        {/* Mental model strip */}
        <section className="mb-14 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">The mental model, 60 seconds</p>
          <p className="text-slate-700 leading-relaxed text-sm">
            UCP gives commerce its rails: discovery, catalog, cart, checkout handoff. RetailAgentOS
            adds the layer UCP doesn&apos;t carry &mdash; the merchant&apos;s <em>reasoning</em>: who
            may see an item, who may buy it, at what price, in what stock, shipped where &mdash; moved
            from checkout-time to <strong>catalog-time</strong>, as deterministic, machine-readable
            contracts with a reason code on every decision.
          </p>
          <p className="mt-3 font-mono text-xs text-slate-500 tracking-wide">
            VISIBILITY &rarr; ELIGIBILITY &rarr; PRICE &rarr; FULFILLMENT &rarr; QUOTE
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Same inputs, byte-identical output, always. No model in the loop, no clock reads inside
            the engine. One axis to remember: the <strong>conformance tier (0&ndash;4)</strong> describes
            your store&apos;s maturity &mdash; a buyer&apos;s gold/silver/guest loyalty standing is a
            separate, orthogonal claim, never a tier.
          </p>
        </section>

        {/* Two contracts */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">What you implement: two contracts, nothing else</h2>
          <p className="text-sm text-slate-500 mb-4">
            The engine package is <code className="font-mono">@retailagentos/engine</code>. Zero runtime
            dependencies; importing it self-registers all evaluators.
          </p>
          <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{twoContracts}</pre>

          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold mb-1">Two rules you must not break:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Never call the system clock inside evaluation &mdash; read <code className="font-mono">Date.now()</code> once at your server boundary and pass it in as <code className="font-mono">now</code>.</li>
              <li>Never fork the reasoning. If a spec doesn&apos;t fit your store, raise it as an Open Question on the spec &mdash; don&apos;t quietly re-implement a decision outside the engine.</li>
            </ol>
          </div>
        </section>

        {/* Derived surfaces table */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Everything else is derived</h2>
          <p className="text-sm text-slate-500 mb-4">From the two contracts, the engine derives every agent-facing surface.</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">You call</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">You get</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Serve it at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {derivedSurfaces.map((row) => (
                  <tr key={row.call} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{row.call}</code>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{row.get}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{row.servedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            The trace renderer (developer / merchant-ops / buyer views) is backed by{' '}
            <Link href="/specs/0013-intent-capture" className="text-emerald-600 hover:underline">RAOS-0013</Link>.
          </p>
        </section>

        {/* Tier ladder */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">The adoption ladder &mdash; pick your tier, ship in steps</h2>
          <p className="text-sm text-slate-500 mb-8 max-w-2xl">
            Each tier is cumulative and independently valuable. A one-person boutique can stop at
            Tier 1 and already be agent-safe. You declare a headline tier plus an authoritative{' '}
            <code className="font-mono">capabilities[]</code> list in your manifest; agents negotiate
            against it and degrade gracefully for anything you don&apos;t support &mdash; partial
            adoption is first-class.
          </p>

          <ol className="space-y-6">
            {tiers.map((t, i) => (
              <li key={t.tier} className="relative rounded-xl border border-slate-200 overflow-hidden">
                <div className={`px-5 py-4 border-b border-slate-200 ${t.planned ? 'bg-slate-50' : 'bg-white'}`}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      {i}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">
                      {t.tier} &middot; {t.name}
                    </h3>
                    {t.planned && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        specs planned &middot; don&apos;t build ahead
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm text-slate-600">&ldquo;{t.promise}&rdquo;</p>
                  {t.effort && <p className="mt-1 text-xs text-slate-400">{t.effort}</p>}
                </div>

                <div className="p-5">
                  <div className="space-y-3 mb-4">
                    {t.items.map((item) => (
                      <div key={item.do} className="flex items-start gap-2.5">
                        <div className={`shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${t.planned ? 'bg-slate-300' : 'bg-emerald-400'}`} />
                        <div>
                          <p className="text-sm text-slate-700">{item.do}</p>
                          <p className="mt-1 flex flex-wrap gap-1.5">
                            {item.specs.map((s) => (
                              s.href ? (
                                <Link
                                  key={s.code}
                                  href={s.href}
                                  className="text-xs font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors"
                                >
                                  {s.code}
                                </Link>
                              ) : (
                                <span
                                  key={s.code}
                                  className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded"
                                  title={s.title}
                                >
                                  {s.code}
                                </span>
                              )
                            ))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {t.acceptance.length > 0 && (
                    <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 px-4 py-3">
                      <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">Acceptance</p>
                      <ul className="space-y-1.5">
                        {t.acceptance.map((a) => (
                          <li key={a} className="flex items-start gap-2 text-sm text-emerald-900">
                            <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                            <span>{a}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {t.planned && (
                    <p className="text-xs text-slate-500 italic">
                      Catalogued and designed but not yet published or built. Track status on the{' '}
                      <Link href="/specs" className="underline">specs index</Link>. Don&apos;t build
                      ahead of a published spec &mdash; the contracts may still move.
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Transport story */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-3">How agents actually reach you</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-1">Minimum (Tier 0)</p>
              <p className="text-sm text-slate-600">Static surfaces &mdash; manifest + JSON-LD + feed. Crawlable agents work with zero live endpoints.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-1">Interactive</p>
              <p className="text-sm text-slate-600">Expose <code className="font-mono text-xs">evaluateOffer</code> and <code className="font-mono text-xs">issueQuote</code> as MCP tools on a long-lived server. The MCP layer is a thin adapter: authenticate, inject <code className="font-mono text-xs">now</code>, call the engine, return its output unmodified.</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-800 mb-1">Checkout</p>
              <p className="text-sm text-slate-600">Hand off to your existing checkout (e.g. Stripe session), carrying quote tokens. RAOS carries reasoning + locked prices; checkout owns payment and tax.</p>
            </div>
          </div>
        </section>

        {/* Worked example */}
        <section className="mb-16">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-slate-900">Worked example: TheCustomHub</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
              <FlaskConical size={12} />
              pilot in progress
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-5 max-w-2xl leading-relaxed">
            A real made-to-order apparel merchant (Vite/React SPA on Firebase, Stripe checkout,
            ~59-product Shopify-shaped <code className="font-mono text-xs">products.json</code>) adopting
            the ladder as a pilot. This is in-progress integration work, not a completed live
            deployment &mdash; nothing here claims a completed real purchase or a live MCP endpoint.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ladder step</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">What it looked like there</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {worked.map((row) => (
                  <tr key={row.step} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap align-top">{row.step}</td>
                    <td className="px-4 py-3 text-slate-600 align-top">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Full detail lives in the repo:{' '}
            <code className="font-mono">specs/reference-implementation/thecustomhub/</code> (discovery
            &rarr; spine design &rarr; implementation plan &rarr; the self-contained brief you can hand
            to a coding agent for any new merchant integration).
          </p>
        </section>

        {/* Build once band */}
        <section className="mb-16 rounded-xl border border-emerald-200 bg-emerald-50/40 p-8">
          <p className="text-sm font-semibold text-emerald-700 uppercase tracking-wider mb-2">For platforms</p>
          <h2 className="text-xl font-bold text-slate-900 mb-3">Build it once, every merchant inherits it</h2>
          <p className="text-slate-700 leading-relaxed max-w-2xl text-sm">
            A single merchant integrating this ladder gets one agent-ready store. A commerce
            platform that implements the adapter and resolver once &mdash; against its own
            multi-tenant catalog and buyer-context model &mdash; makes every merchant on that
            platform agent-ready with zero additional work per store. The spec is the leverage: the
            hard part (deterministic reasoning, reason codes, quote integrity) lives in the engine and
            the specs, not in each integration.
          </p>
        </section>

        {/* Ground rules */}
        <section className="mb-16">
          <h2 className="text-xl font-bold text-slate-900 mb-3">Ground rules the whole architecture depends on</h2>
          <p className="text-sm text-slate-500 mb-4">
            From <Link href="/specs/0000-foundations" className="text-emerald-600 hover:underline">RAOS-0000</Link>, applying to every tier.
          </p>
          <ul className="space-y-2">
            {[
              'Determinism: same (BuyerContext, manifest, catalog, now) → identical output.',
              'Most-restrictive default: unknown/missing/untrusted context degrades to guest. Asserted (unsigned) privilege claims are downgraded for transaction-gating stages.',
              'Fail-degraded, never crash: a failing safety-critical evaluator blocks; a failing advisory evaluator is omitted.',
              'Additive-only evolution: reason codes never change meaning; semver per namespace; deprecation via supersededBy.',
              'Namespace: com.os.retailagent.shopping.*, vendor-neutral, written as UCP upstream candidates.',
              'v1 seams: USD-only (currency field exists as a seam), single-merchant cart.',
            ].map((rule) => (
              <li key={rule} className="flex items-start gap-2.5 text-sm text-slate-700">
                <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-slate-100 pt-10">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Where to go next</p>
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <Link href="/specs" className="group rounded-lg border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all">
              <p className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <BookOpen size={14} className="text-emerald-500" />
                Read the specs
              </p>
              <p className="text-xs text-slate-500">The exact contract for every RFC, plus the catalog and status of all specs.</p>
            </Link>
            <Link href="/demo" className="group rounded-lg border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all">
              <p className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <PlayCircle size={14} className="text-emerald-500" />
                Open the Playground
              </p>
              <p className="text-xs text-slate-500">See evaluateOffer, quotes, and the manifest running against real archetypes.</p>
            </Link>
            <a
              href="mailto:rikbanerjee007@gmail.com?subject=RetailAgentOS%20pilot%20inquiry"
              className="group rounded-lg border border-slate-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all"
            >
              <p className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <Mail size={14} className="text-emerald-500" />
                Ask about a pilot
              </p>
              <p className="text-xs text-slate-500">Running a real catalog and want help adopting the ladder? Email me directly.</p>
            </a>
          </div>
          <div className="flex items-center justify-between">
            <Link href="/specs" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
              All Specs
            </Link>
            <a
              href="mailto:rikbanerjee007@gmail.com"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <Mail size={14} />
              rikbanerjee007@gmail.com
              <ArrowRight size={14} />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
