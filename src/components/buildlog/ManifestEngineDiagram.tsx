// Build log diagram — Week 7: manifest projection + region allowlist fix.
// Shows one MerchantProfile through two doors an agent meets it by (the
// manifest it reads, the engine that decides an order) — before the fix,
// when those two doors disagreed, and after, when they were made to agree.
// Self-contained inline SVG, matches the palette/pattern of DemoInfographics.tsx.

const C = {
  slate: '#0f172a',
  slateMid: '#64748b',
  slateLine: '#cbd5e1',
  slateFill: '#f1f5f9',
  emerald: '#059669',
  emeraldDark: '#047857',
  emeraldFill: '#ecfdf5',
  rose: '#e11d48',
  roseFill: '#fff1f2',
  white: '#ffffff',
};

function Row({
  y,
  fromLabel1,
  fromLabel2,
  arrowLabel1,
  arrowLabel2,
  toLabel1,
  toLabel2,
  toLabel3,
  resultLabel1,
  resultLabel2,
  tone,
  arrowId,
}: {
  y: number;
  fromLabel1: string;
  fromLabel2: string;
  arrowLabel1: string;
  arrowLabel2: string;
  toLabel1: string;
  toLabel2: string;
  toLabel3?: string;
  resultLabel1: string;
  resultLabel2: string;
  tone: 'before' | 'after';
  arrowId: string;
}) {
  const isAfter = tone === 'after';
  const fill = isAfter ? C.emeraldFill : C.roseFill;
  const stroke = isAfter ? C.emerald : C.rose;
  const labelColor = isAfter ? C.emeraldDark : C.rose;

  return (
    <g>
      {/* MerchantProfile -> process box */}
      <line x1="150" y1={y} x2="168" y2={y} stroke={C.slateMid} markerEnd="url(#dot-arrow)" />
      <rect x="170" y={y - 26} width="140" height="52" rx="6" fill={C.slateFill} stroke={C.slateLine} />
      <text x="240" y={y - 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={C.slate}>{fromLabel1}</text>
      <text x="240" y={y + 12} textAnchor="middle" fontSize="9.5" fill={C.slateMid}>{fromLabel2}</text>

      {/* process box -> output box */}
      <line
        x1="310" y1={y} x2="398" y2={y}
        stroke={stroke}
        strokeDasharray={isAfter ? undefined : '5 4'}
        markerEnd={`url(#${arrowId})`}
      />
      <text x="354" y={y - 12} textAnchor="middle" fontSize="9" fill={labelColor}>{arrowLabel1}</text>
      <text x="354" y={y} textAnchor="middle" fontSize="9" fill={labelColor}>{arrowLabel2}</text>

      <rect x="400" y={y - 30} width="210" height="60" rx="6" fill={fill} stroke={stroke} />
      <text x="505" y={y - 10} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={C.slate}>{toLabel1}</text>
      <text x="505" y={y + 5} textAnchor="middle" fontSize="9.5" fill={C.slateMid}>{toLabel2}</text>
      {toLabel3 && <text x="505" y={y + 19} textAnchor="middle" fontSize="9" fontWeight="600" fill={labelColor}>{toLabel3}</text>}

      {/* output box -> result */}
      <line x1="610" y1={y} x2="628" y2={y} stroke={C.slateMid} markerEnd="url(#dot-arrow)" />
      <rect x="630" y={y - 26} width="180" height="52" rx="6" fill={C.white} stroke={stroke} strokeWidth="1.5" />
      <text x="720" y={y - 5} textAnchor="middle" fontSize="10" fontWeight="700" fill={labelColor}>{resultLabel1}</text>
      <text x="720" y={y + 10} textAnchor="middle" fontSize="9.5" fill={labelColor}>{resultLabel2}</text>
    </g>
  );
}

export default function ManifestEngineDiagram() {
  return (
    <figure className="my-2">
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-4 sm:px-5 overflow-x-auto">
        <svg
          viewBox="0 0 820 400"
          className="w-full h-auto min-w-[640px]"
          role="img"
          aria-labelledby="mfe-title mfe-desc"
        >
          <title id="mfe-title">One MerchantProfile, two doors — before and after the fix</title>
          <desc id="mfe-desc">
            Before the fix, buildManifest dropped endpoints and servesRegions from the public
            manifest, and evaluateOffer never checked region at all, so a Hawaii buyer was
            wrongly cleared to buy a Hawaii-restricted item. After the fix, buildManifest
            composes the full manifest and evaluateOffer short-circuits on a region allowlist
            check, correctly blocking the order.
          </desc>
          <defs>
            <marker id="dot-arrow" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill={C.slateMid} />
            </marker>
            <marker id="rose-arrow" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill={C.rose} />
            </marker>
            <marker id="emerald-arrow" markerWidth="7" markerHeight="7" refX="5" refY="2.5" orient="auto">
              <path d="M0,0 L5,2.5 L0,5 Z" fill={C.emerald} />
            </marker>
          </defs>

          {/* Shared input, spans both sections */}
          <rect x="8" y="14" width="142" height="372" rx="10" fill={C.slate} />
          <text x="79" y="192" textAnchor="middle" fontSize="11.5" fontWeight="700" fill={C.white}>MerchantProfile</text>
          <text x="79" y="210" textAnchor="middle" fontSize="9.5" fill="#94a3b8">endpoints {'{'}catalog,</text>
          <text x="79" y="223" textAnchor="middle" fontSize="9.5" fill="#94a3b8">cart, checkout{'}'}</text>
          <text x="79" y="241" textAnchor="middle" fontSize="9.5" fill="#94a3b8">servesRegions:</text>
          <text x="79" y="254" textAnchor="middle" fontSize="9.5" fill="#94a3b8">[&apos;US&apos;,&apos;CA&apos;]</text>

          {/* Section labels */}
          <text x="170" y="26" fontSize="11" fontWeight="700" letterSpacing="0.5" fill={C.rose}>BEFORE — pre 2026-08-02</text>
          <line x1="8" y1="200" x2="812" y2="200" stroke={C.slateLine} strokeDasharray="2 4" />
          <text x="170" y="216" fontSize="11" fontWeight="700" letterSpacing="0.5" fill={C.emeraldDark}>AFTER — commit 1891ad3</text>

          {/* BEFORE rows */}
          <Row
            y={70}
            fromLabel1="buildManifest()"
            fromLabel2="pass-through"
            arrowLabel1="drops endpoints,"
            arrowLabel2="servesRegions"
            toLabel1="/.well-known/ucp"
            toLabel2="{ protocol, tier, keys }"
            toLabel3="no endpoints · no servesRegions"
            resultLabel1="Agent"
            resultLabel2="can't locate checkout ✗"
            tone="before"
            arrowId="rose-arrow"
          />
          <Row
            y={150}
            fromLabel1="evaluateOffer()"
            fromLabel2="no region check"
            arrowLabel1="region never"
            arrowLabel2="evaluated"
            toLabel1="Decision"
            toLabel2="status: ELIGIBLE"
            resultLabel1="HI buyer, HI-restricted item"
            resultLabel2="wrongly cleared to buy ✗"
            tone="before"
            arrowId="rose-arrow"
          />

          {/* AFTER rows */}
          <Row
            y={266}
            fromLabel1="buildManifest()"
            fromLabel2="composes"
            arrowLabel1="+ endpoints"
            arrowLabel2="+ servesRegions"
            toLabel1="/.well-known/ucp"
            toLabel2="{ ...+ endpoints, servesRegions }"
            toLabel3="complete by construction"
            resultLabel1="Agent"
            resultLabel2="locates + pre-filters ✓"
            tone="after"
            arrowId="emerald-arrow"
          />
          <Row
            y={346}
            fromLabel1="evaluateOffer()"
            fromLabel2="checkServesRegion()"
            arrowLabel1="checked first,"
            arrowLabel2="before variants"
            toLabel1="Decision"
            toLabel2="status: BLOCKED"
            toLabel3="[REGION_RESTRICTED]"
            resultLabel1="HI buyer, HI-restricted item"
            resultLabel2="correctly stopped ✓"
            tone="after"
            arrowId="emerald-arrow"
          />
        </svg>
      </div>
      <figcaption className="mt-2.5 text-xs text-slate-500 max-w-2xl">
        Same <code className="text-[11px] bg-slate-100 rounded px-1 py-0.5">MerchantProfile</code>,
        two doors an agent walks through — the manifest it reads, and the engine that decides an
        order. Before the fix the manifest silently dropped fields and the engine never checked
        region; after, the manifest is complete by construction and the engine checks region
        first, once, for every caller.
      </figcaption>
    </figure>
  );
}
