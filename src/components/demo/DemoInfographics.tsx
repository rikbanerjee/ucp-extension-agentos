// Standalone SVG infographics for the Playground / demo.
// Self-contained and portable — currently rendered at the end of /demo,
// but can be dropped into any page. Pure inline SVG + Tailwind, no deps.

const C = {
  slate: '#0f172a',
  slateMid: '#64748b',
  slateLine: '#cbd5e1',
  slateFill: '#f1f5f9',
  emerald: '#10b981',
  emeraldDark: '#047857',
  emeraldFill: '#ecfdf5',
  rose: '#f43f5e',
  roseFill: '#fff1f2',
  amber: '#f59e0b',
  amberFill: '#fffbeb',
  white: '#ffffff',
};

/* 1 — How the playground flows: what you set → what evaluates → what you inspect */
function PipelineDiagram() {
  return (
    <svg viewBox="0 0 820 170" className="w-full h-auto" role="img" aria-labelledby="pipe-title">
      <title id="pipe-title">Context controls feed extension rules, which compute a decision the agent acts on</title>
      <defs>
        <marker id="pipe-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={C.slateMid} />
        </marker>
      </defs>

      {/* Node 1 — Context (left panel) */}
      <g>
        <rect x="8" y="40" width="180" height="90" rx="10" fill={C.slateFill} stroke={C.slateLine} />
        <text x="98" y="34" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.slateMid} letterSpacing="1">YOU SET (LEFT)</text>
        <text x="98" y="68" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.slate}>Buyer Context</text>
        <text x="98" y="90" textAnchor="middle" fontSize="10" fill={C.slateMid}>customer type · tier</text>
        <text x="98" y="105" textAnchor="middle" fontSize="10" fill={C.slateMid}>region · fulfilment</text>
      </g>

      {/* Node 2 — Extension rules */}
      <g>
        <rect x="228" y="40" width="180" height="90" rx="10" fill={C.emeraldFill} stroke={C.emerald} />
        <text x="318" y="34" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.emeraldDark} letterSpacing="1">EVALUATES</text>
        <text x="318" y="68" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.slate}>Extension Rules</text>
        <text x="318" y="90" textAnchor="middle" fontSize="9" fontFamily="monospace" fill={C.emeraldDark}>ext.eligibility</text>
        <text x="318" y="104" textAnchor="middle" fontSize="9" fontFamily="monospace" fill={C.emeraldDark}>ext.pricing · ext.fulfillment</text>
      </g>

      {/* Node 3 — Computed decision */}
      <g>
        <rect x="448" y="40" width="180" height="90" rx="10" fill={C.slate} />
        <text x="538" y="34" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.slateMid} letterSpacing="1">COMPUTES</text>
        <text x="538" y="66" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.white}>Decision</text>
        <text x="538" y="88" textAnchor="middle" fontSize="9" fill="#94a3b8">visible · eligible</text>
        <text x="538" y="102" textAnchor="middle" fontSize="9" fill="#94a3b8">price · validation</text>
      </g>

      {/* Node 4 — Inspect (right panel) */}
      <g>
        <rect x="668" y="40" width="144" height="90" rx="10" fill={C.white} stroke={C.slateLine} />
        <text x="740" y="34" textAnchor="middle" fontSize="10" fontWeight="700" fill={C.slateMid} letterSpacing="1">YOU INSPECT</text>
        <text x="740" y="72" textAnchor="middle" fontSize="13" fontWeight="700" fill={C.slate}>Payload</text>
        <text x="740" y="92" textAnchor="middle" fontSize="10" fill={C.slateMid}>(right panel)</text>
      </g>

      {/* Arrows */}
      <line x1="190" y1="85" x2="224" y2="85" stroke={C.slateMid} strokeWidth="1.5" markerEnd="url(#pipe-arrow)" />
      <line x1="410" y1="85" x2="444" y2="85" stroke={C.slateMid} strokeWidth="1.5" markerEnd="url(#pipe-arrow)" />
      <line x1="630" y1="85" x2="664" y2="85" stroke={C.slateMid} strokeWidth="1.5" markerEnd="url(#pipe-arrow)" />

      <text x="410" y="158" textAnchor="middle" fontSize="11" fill={C.slateMid}>
        Every decision is deterministic — change the context, watch the payload recompute.
      </text>
    </svg>
  );
}

/* 2 — Same product, different buyers → different computed outcomes */
function DecisionMatrixDiagram() {
  const rows = [
    { ctx: 'Guest', sub: 'no qualification', outcome: 'HIDDEN', tone: 'slate', note: 'not surfaced' },
    { ctx: 'Member', sub: 'account linked', outcome: 'MEMBER PRICE', tone: 'emerald', note: 'discounted unit price' },
    { ctx: 'Wholesale', sub: '+ resale cert', outcome: 'ELIGIBLE · BULK', tone: 'emerald', note: 'tier price unlocked' },
  ];
  const toneMap: Record<string, { fill: string; stroke: string; text: string }> = {
    slate: { fill: C.slateFill, stroke: C.slateLine, text: C.slateMid },
    emerald: { fill: C.emeraldFill, stroke: C.emerald, text: C.emeraldDark },
  };
  return (
    <svg viewBox="0 0 820 240" className="w-full h-auto" role="img" aria-labelledby="matrix-title">
      <title id="matrix-title">One product yields different computed decisions depending on buyer context</title>
      <defs>
        <marker id="matrix-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={C.slateLine} />
        </marker>
      </defs>

      {/* Product source */}
      <rect x="8" y="90" width="150" height="60" rx="10" fill={C.white} stroke={C.slate} strokeWidth="1.5" />
      <text x="83" y="116" textAnchor="middle" fontSize="12" fontWeight="700" fill={C.slate}>One product</text>
      <text x="83" y="134" textAnchor="middle" fontSize="10" fill={C.slateMid}>same catalog entry</text>

      {rows.map((r, i) => {
        const y = 30 + i * 70;
        const t = toneMap[r.tone];
        return (
          <g key={r.ctx}>
            {/* connector */}
            <path d={`M158,120 C210,120 210,${y + 25} 250,${y + 25}`} fill="none" stroke={C.slateLine} strokeWidth="1.5" markerEnd="url(#matrix-arrow)" />
            {/* context chip */}
            <rect x="250" y={y} width="190" height="50" rx="8" fill={C.slateFill} stroke={C.slateLine} />
            <text x="266" y={y + 22} fontSize="12" fontWeight="700" fill={C.slate}>{r.ctx}</text>
            <text x="266" y={y + 39} fontSize="10" fill={C.slateMid}>{r.sub}</text>
            {/* arrow to outcome */}
            <line x1="440" y1={y + 25} x2="486" y2={y + 25} stroke={C.slateLine} strokeWidth="1.5" markerEnd="url(#matrix-arrow)" />
            {/* outcome chip */}
            <rect x="490" y={y} width="322" height="50" rx="8" fill={t.fill} stroke={t.stroke} />
            <text x="508" y={y + 22} fontSize="12" fontWeight="700" fill={t.text} fontFamily="monospace">{r.outcome}</text>
            <text x="508" y={y + 39} fontSize="10" fill={C.slateMid}>{r.note}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* 3 — Price resolution: how the unit price + priceSource is chosen */
function PriceWaterfallDiagram() {
  const steps = [
    { label: 'Base price', src: 'base', tone: 'slate' },
    { label: 'Member?', src: 'member', tone: 'emerald' },
    { label: 'Bulk tier?', src: 'bulk_tier', tone: 'emerald' },
    { label: 'Promo?', src: 'promo_sale', tone: 'amber' },
  ];
  return (
    <svg viewBox="0 0 820 180" className="w-full h-auto" role="img" aria-labelledby="price-title">
      <title id="price-title">Price resolution walks through each rule to select the final unit price and its source</title>
      <defs>
        <marker id="price-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={C.slateMid} />
        </marker>
      </defs>

      {steps.map((s, i) => {
        const x = 8 + i * 155;
        const stroke = s.tone === 'amber' ? C.amber : s.tone === 'emerald' ? C.emerald : C.slateLine;
        const fill = s.tone === 'amber' ? C.amberFill : s.tone === 'emerald' ? C.emeraldFill : C.slateFill;
        return (
          <g key={s.src}>
            <rect x={x} y="50" width="120" height="60" rx="10" fill={fill} stroke={stroke} />
            <text x={x + 60} y="78" textAnchor="middle" fontSize="12" fontWeight="700" fill={C.slate}>{s.label}</text>
            <text x={x + 60} y="96" textAnchor="middle" fontSize="9" fontFamily="monospace" fill={C.slateMid}>{s.src}</text>
            <line x1={x + 120} y1="80" x2={x + 151} y2="80" stroke={C.slateMid} strokeWidth="1.5" markerEnd="url(#price-arrow)" />
          </g>
        );
      })}

      {/* Resolved */}
      <rect x="628" y="50" width="184" height="60" rx="10" fill={C.slate} />
      <text x="720" y="76" textAnchor="middle" fontSize="12" fontWeight="700" fill={C.white}>Resolved price</text>
      <text x="720" y="95" textAnchor="middle" fontSize="9" fontFamily="monospace" fill="#6ee7b7">unitPrice + priceSource</text>

      <text x="410" y="150" textAnchor="middle" fontSize="11" fill={C.slateMid}>
        First matching rule wins — the result always carries the source that set it.
      </text>
    </svg>
  );
}

export function DemoInfographics() {
  return (
    <section id="playground-mechanics" className="scroll-mt-4 bg-white border-t border-slate-200">
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reading the Playground</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
            Three ways to read what you&apos;re interacting with above — the data flow, the
            context-sensitivity, and how price gets resolved.
          </p>
        </div>

        <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <figcaption className="text-sm font-semibold text-slate-800 mb-4">The flow: set context → rules evaluate → decision → inspect</figcaption>
          <PipelineDiagram />
        </figure>

        <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <figcaption className="text-sm font-semibold text-slate-800 mb-4">Same product, different buyers, different decisions</figcaption>
          <DecisionMatrixDiagram />
        </figure>

        <figure className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <figcaption className="text-sm font-semibold text-slate-800 mb-4">How a price is resolved</figcaption>
          <PriceWaterfallDiagram />
        </figure>
      </div>
    </section>
  );
}
