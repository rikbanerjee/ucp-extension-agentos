'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle, XCircle, AlertCircle, Mail, Shield } from 'lucide-react';
import { useView } from '@/lib/context/ViewContext';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { TierBadge } from '../TierBadge';

const reasonCodes = [
  {
    code: 'TRUST_SIMULATED',
    namespace: '…trust',
    meaning: 'Crypto is simulated. Every envelope produced while B3/D2 is in effect carries this INFO code. Always emitted — it is the "this is not real security" label that prevents simulation being mistaken for production trust.',
    severity: 'INFO',
    resolvable: false,
    resolution: null,
    fixtureReachable: true,
  },
  {
    code: 'DATA_STALE',
    namespace: '…trust',
    meaning: 'Data has exceeded its TTL. For advisory stages (PRICE, ELIGIBILITY): degrade and flag. For QUOTE stage: refuse. The agent must re-fetch before acting.',
    severity: 'CONDITION',
    resolvable: true,
    resolution: 'Re-fetch and re-evaluate with a fresh envelope',
    fixtureReachable: true,
  },
  {
    code: 'SIGNATURE_INVALID',
    namespace: '…trust',
    meaning: 'Signature does not match the canonicalized payload. The payload may have been tampered with. Most-restrictive: BLOCK.',
    severity: 'BLOCK',
    resolvable: false,
    resolution: null,
    fixtureReachable: false,
  },
  {
    code: 'ISSUER_UNKNOWN',
    namespace: '…trust',
    meaning: 'The keyId in the envelope does not match any key in the merchant\'s published keys[]. Cannot verify provenance of this data.',
    severity: 'BLOCK',
    resolvable: false,
    resolution: null,
    fixtureReachable: false,
  },
  {
    code: 'KEY_EXPIRED',
    namespace: '…trust',
    meaning: 'Key found in merchant manifest but validTo < now (±60s skew allowance). The merchant must rotate to a new key.',
    severity: 'BLOCK',
    resolvable: true,
    resolution: 'Merchant rotates to a new key in keys[]; re-issue envelope with new keyId',
    fixtureReachable: false,
  },
  {
    code: 'CLOCK_SKEW_SUSPECTED',
    namespace: '…trust',
    meaning: 'computedAt is in the future beyond the clock-skew tolerance (±60s). The agent and merchant clocks may be out of sync.',
    severity: 'CONDITION',
    resolvable: true,
    resolution: 'Re-synchronize agent clock; re-request with correct now',
    fixtureReachable: false,
  },
];

const severityStyles: Record<string, string> = {
  INFO: 'bg-sky-50 text-sky-700 border border-sky-200',
  CONDITION: 'bg-amber-50 text-amber-700 border border-amber-200',
  BLOCK: 'bg-orange-50 text-orange-700 border border-orange-200',
};

const openQuestions = [
  {
    number: 1,
    question: 'Real crypto seam — HMAC-SHA256 or ECDSA-P256?',
    resolved: false,
    resolvedDate: null,
    body: 'The interface is real; the simulation is the placeholder. WP-19 swaps in real crypto. HMAC-SHA256 is simpler (shared secret per merchant); ECDSA-P256 enables decentralized verification (public key published in manifest, no shared secret distribution).',
    proposed: 'Leaning: HMAC-SHA256 for v1 (simpler key management for small merchants), ECDSA as a v2 upgrade path. The seam makes either mechanical.',
  },
  {
    number: 2,
    question: 'Per-field freshness vs per-result freshness',
    resolved: false,
    resolvedDate: null,
    body: 'The envelope today attaches to each ExtensionResult (per-evaluator). A richer model would expose per-field freshness (price is fresh, inventory is stale within the same result). WP-05 already has per-item freshness on ComputedAvailability. Should the outer envelope gain a fieldFreshness slot?',
    proposed: 'Defer to WP-07 (Quote Integrity) which has the most pressing need for field-level trust. Quote tokens need to know whether the price they are locking was fresh at issue time.',
  },
  {
    number: 3,
    question: 'Clock-skew tolerance: ±60s uniform or tighter for QUOTE?',
    resolved: false,
    resolvedDate: null,
    body: 'Banking systems use ±5s; mobile agents in intermittent connectivity can drift more. ±60s may be generous for high-stakes data (QUOTE). Should the tolerance be configurable per stage?',
    proposed: 'Leaning: tighten to ±30s for QUOTE-stage data, ±60s for advisory stages. Stage-configurable tolerance is cleaner than one global value.',
  },
  {
    number: 4,
    question: 'DATA_STALE vs STOCK_STALE disambiguation',
    resolved: false,
    resolvedDate: null,
    body: 'RAOS-0008 emits DATA_STALE (trust namespace) and RAOS-0005 emits STOCK_STALE (inventory namespace). Both can fire in the same evaluation. Are they additive? Does one supersede the other?',
    proposed: 'Additive — they are genuinely different signals. STOCK_STALE is the inventory-domain code (the data source is stale); DATA_STALE is the trust-domain code (the pipeline evaluation result is stale). Agents reading both get richer information.',
  },
];

const threatModel = [
  {
    attack: 'Spoofed merchant',
    description: 'A malicious agent presents a crafted payload claiming to be from a known merchant',
    defeatedBy: 'keyId lookup in merchant keys[]. Unknown key → ISSUER_UNKNOWN BLOCK. The agent rejects data from issuers it cannot verify.',
  },
  {
    attack: 'Replayed envelope',
    description: 'A valid envelope from an earlier evaluation is replayed with a newer payload',
    defeatedBy: 'computedAt + TTL freshness. Replayed envelopes expire. At QUOTE stage all stale envelopes are refused (not just flagged).',
  },
  {
    attack: 'Stale promo served as fresh',
    description: 'A promotional price computed 10 minutes ago is served with a fresh-looking timestamp',
    defeatedBy: 'computedAt comes from injected now (never wall-clock). Manipulating computedAt is detectable via CLOCK_SKEW_SUSPECTED if the agent\'s clock differs.',
  },
  {
    attack: 'Tampered price',
    description: 'The unitPrice field is modified after signing',
    defeatedBy: 'signEnvelope canonicalizes the entire payload including unitPrice. A single-character change → different signature → SIGNATURE_INVALID BLOCK.',
  },
];

const ttlDefaults = [
  { stage: 'ELIGIBILITY / VISIBILITY', ttl: '3600s (1h)', rationale: 'Eligibility rules are stable within a session; membership tiers rarely change mid-browse' },
  { stage: 'PRICE', ttl: '300s (5m)', rationale: 'Promotions can end at any minute; price data is time-sensitive' },
  { stage: 'INVENTORY', ttl: '60s (1m)', rationale: 'Stock is the most volatile signal; must be fresh before cart add' },
  { stage: 'QUOTE', ttl: 'verified at use', rationale: 'Quotes own their own TTL in the QuoteToken; freshness is checked at validation time' },
];

const envelopeShape = `{
  "provenance": {
    "issuer":    "https://api.boutique-a.test",
    "keyId":     "k1",
    "signature": "sim:4a7f0c2b",   // SIMULATED — prefix marks it as non-real
    "trustMode": "asserted"         // always "asserted" while crypto is simulated
  },
  "freshness": {
    "computedAt": 1718000000000,    // from injected now — NEVER Date.now()
    "ttlSeconds": 300               // per-stage default, merchant-overridable
  }
}`;

const keyManifestShape = `// GET /.well-known/ucp
{
  "protocol": "1.0",
  "tier": 2,
  "capabilities": [ ... ],
  "keys": [
    {
      "keyId": "k1",
      "validFrom": 1700000000000,   // Unix ms — inclusive
      "validTo":   1800000000000    // Unix ms — exclusive; null = no expiry
    },
    {
      "keyId": "k2",
      "validFrom": 1750000000000,   // rotation key, overlaps k1
      "validTo": null
    }
  ]
}`;

export default function Spec0008Page() {
  const { view } = useView();
  const isTechnical = view === 'technical';

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">

        {/* Breadcrumb */}
        <Link href="/specs" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 mb-8">
          <ArrowLeft size={14} />
          All Specs
        </Link>

        {/* Spec header */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-mono font-semibold text-slate-400">RAOS-0008</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Draft · RFC
            </span>
            <span className="text-xs text-slate-400">v1.0.0</span>
            <span className="text-xs text-slate-400">June 2026</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 mb-3">
            Trust, Provenance &amp; Freshness
          </h1>
          <p className="text-sm font-mono text-emerald-700 mb-4">
            com.os.retailagent.shopping.trust
          </p>
          <p className="text-sm text-slate-500">
            <Link href="/demo" className="text-emerald-600 hover:underline">Reference implementation in Playground</Link>
          </p>

          {/* SIMULATED callout */}
          <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <strong>Crypto is SIMULATED</strong> — the signing interface is real; the implementation uses a deterministic
            hash (no real cryptography). Every simulated envelope carries{' '}
            <code className="font-mono text-xs">trustMode: &quot;asserted&quot;</code> and the signature prefix{' '}
            <code className="font-mono text-xs">sim:</code>. The swap to real HMAC-SHA256 or ECDSA is mechanical
            (one function body in <code className="font-mono text-xs">trust.ts</code>). See WP-19.
          </div>

          {/* RFC callout */}
          <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
            The real-crypto algorithm (OQ#1), per-field freshness model (OQ#2), and clock-skew tolerance for QUOTE
            stage (OQ#3) are genuine design forks.{' '}
            <a href="#open-questions" className="underline font-medium">See the open questions →</a>
          </div>

          <TierBadge tier="Foundation" version="1.0.0" adoptAnchor="tier-2" />
        </div>

        {/* View toggle */}
        <div className="flex justify-end mb-10">
          <ViewToggle />
        </div>

        {/* Abstract */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">Abstract</h2>
          <p className="text-slate-700 leading-relaxed">
            RAOS-0008 operationalizes the provenance and freshness envelope that RAOS-0000 §9 defined
            at contract level. It answers three questions every trust-conscious agent must ask:
          </p>
          <ol className="mt-4 space-y-2 list-decimal list-inside">
            {[
              'Is this data from who it claims to be from? — The signed payload envelope: issuer, key identifier, and a deterministic signature.',
              'Is this data still current? — Per-stage TTL defaults (price 300s, inventory 60s, eligibility 3600s). Staleness has a behavior matrix: refuse for QUOTE, degrade+flag for advisory.',
              'Can I trust the key? — Merchant manifest carries keys[] with validity windows. Key rotation is a first-class concept.',
            ].map((item, i) => (
              <li key={i} className="text-slate-700 text-sm leading-relaxed">{item}</li>
            ))}
          </ol>
          {isTechnical && (
            <p className="mt-4 text-slate-700 leading-relaxed text-sm">
              The envelope attaches <strong>centrally in the pipeline</strong> — one change in{' '}
              <code className="font-mono text-xs">src/lib/extensions/pipeline.ts</code>, not per-evaluator.
              Every <code className="font-mono text-xs">ExtensionResult</code> gains{' '}
              <code className="font-mono text-xs">provenance</code> and{' '}
              <code className="font-mono text-xs">freshness</code> fields.
              <code className="font-mono text-xs">TRUST_SIMULATED</code> is prepended to every{' '}
              <code className="font-mono text-xs">DecisionRecord.reasons[]</code>.
            </p>
          )}
        </section>

        {/* Per-stage TTL defaults */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '3. Per-stage TTL defaults' : 'How long is data considered fresh?'}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Default TTL</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ttlDefaults.map((row) => (
                  <tr key={row.stage} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{row.stage}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                        {row.ttl}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 hidden sm:table-cell">{row.rationale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {isTechnical && (
            <p className="mt-3 text-xs text-slate-500">
              Declared in <code className="font-mono">STAGE_TTL_DEFAULTS</code> in{' '}
              <code className="font-mono">src/lib/types/envelope.ts</code>.
              Merchant-overridable per-capability in a future revision.
            </p>
          )}
        </section>

        {/* Inputs */}
        {isTechnical && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. Inputs</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.1 Envelope shape (RAOS-0000 §9, extended)</p>
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{envelopeShape}</pre>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.2 Merchant key manifest (keys[])</p>
                <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto leading-relaxed">{keyManifestShape}</pre>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">4.3 Clock-skew tolerance</p>
                <p className="text-xs text-slate-500">
                  ±60 seconds (declared as <code className="font-mono">CLOCK_SKEW_TOLERANCE_MS = 60_000</code> in{' '}
                  <code className="font-mono">trust.ts</code>). Applied to key-expiry checks and future-computedAt detection.
                  All times use the injected <code className="font-mono">now</code> — never <code className="font-mono">Date.now()</code>.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Reason code registry */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {isTechnical ? '5. Reason code registry' : 'Reason code registry'}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            One namespace, six codes. Four are synthetic-only (require injected failures; tested in{' '}
            <code className="font-mono text-xs">trust.test.ts</code>).
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Meaning</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Severity</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Resolvable?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reasonCodes.map((rc) => (
                  <tr key={rc.code} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <code className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {rc.code}
                        </code>
                        {!rc.fixtureReachable && (
                          <div className="text-[10px] text-slate-400 font-mono">synthetic-only</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">{rc.meaning}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${severityStyles[rc.severity]}`}>
                        {rc.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {rc.resolvable ? (
                        <div className="flex items-start gap-1.5">
                          <CheckCircle size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                          <span className="text-xs text-slate-600">{rc.resolution}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <XCircle size={14} className="text-slate-300" />
                          <span className="text-xs text-slate-400">Advisory / not resolvable</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Threat model */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '6. Threat model' : 'What attacks does this prevent?'}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Attack</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Defeated by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {threatModel.map((row) => (
                  <tr key={row.attack} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Shield size={14} className="text-rose-400 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800">{row.attack}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 hidden sm:table-cell">{row.description}</td>
                    <td className="px-4 py-3 text-xs text-slate-700">{row.defeatedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pipeline integration */}
        {isTechnical && (
          <section className="mb-12">
            <h2 className="text-lg font-bold text-slate-900 mb-3">7. Pipeline integration &amp; WP-05 reconciliation</h2>
            <div className="rounded-xl border border-slate-200 p-5 space-y-4 text-sm text-slate-700">
              <p>
                <strong>Central attachment:</strong> the envelope attaches once in{' '}
                <code className="font-mono text-xs">src/lib/extensions/pipeline.ts</code> — never per-evaluator.
                Each <code className="font-mono text-xs">ExtensionResult</code> gains{' '}
                <code className="font-mono text-xs">provenance</code> and{' '}
                <code className="font-mono text-xs">freshness</code> fields after the evaluator runs.
                <code className="font-mono text-xs">TRUST_SIMULATED</code> is prepended to{' '}
                <code className="font-mono text-xs">DecisionRecord.reasons[]</code>.
              </p>
              <p>
                <strong>WP-05 reconciliation:</strong>{' '}
                <code className="font-mono text-xs">ComputedAvailability.freshness</code> (RAOS-0005) is the freshness
                of the <em>inventory data payload</em> — when the stock count was last fetched from the source of truth.
                The outer envelope&apos;s <code className="font-mono text-xs">freshness</code> (RAOS-0008) is the freshness
                of the <em>evaluation result</em> — when the pipeline computed this decision. Both are preserved.
                No deduplication. <code className="font-mono text-xs">STOCK_STALE</code> (inventory namespace) and{' '}
                <code className="font-mono text-xs">DATA_STALE</code> (trust namespace) are additive, different concerns.
              </p>
              <p>
                <strong>The seam:</strong> to swap in real crypto (WP-19), replace the body of{' '}
                <code className="font-mono text-xs">simulatedSign()</code> in{' '}
                <code className="font-mono text-xs">src/lib/rules/trust.ts</code> with a real HMAC-SHA256 or ECDSA call,
                and change <code className="font-mono text-xs">trustMode</code> to{' '}
                <code className="font-mono text-xs">&apos;signed&apos;</code>. No other caller changes are required.
              </p>
            </div>
          </section>
        )}

        {/* Open questions */}
        <section id="open-questions" className="mb-12 scroll-mt-8">
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            {isTechnical ? '8. Open questions — Request for Comment' : 'Open questions'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">These are genuine forks. Tell me I&apos;m wrong.</p>

          <div className="space-y-4">
            {openQuestions.map((q) => (
              <div key={q.number} className={`rounded-xl border p-5 ${q.resolved ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                <div className="flex items-start gap-3">
                  {q.resolved
                    ? <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-500" />
                    : <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                  }
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-1">
                      <span className="text-slate-400 mr-1.5">#{q.number}</span>
                      {q.question}
                      {q.resolved && (
                        <span className="ml-2 text-xs font-normal text-emerald-600">
                          RESOLVED {q.resolvedDate}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-slate-600 mb-2">{q.body}</p>
                    {q.proposed && (
                      <p className="text-sm italic text-slate-500">{q.proposed}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl bg-slate-50 border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-700 mb-1">Have a view on any of these?</p>
            <p className="text-sm text-slate-600 mb-3">
              The real-crypto algorithm and clock-skew tolerance questions are the most consequential.
              If you&apos;ve operated a distributed commerce system and dealt with clock drift or key
              rotation in production, your experience is exactly what this spec needs.
            </p>
            <a
              href="mailto:rikbanerjee007@gmail.com"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <Mail size={14} />
              rikbanerjee007@gmail.com
            </a>
          </div>
        </section>

        {/* Why this spec */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            {isTechnical ? '9. Why this spec is Tier 0' : 'Why this is foundational'}
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm">
            Freshness and provenance are not premium features. An agent that doesn&apos;t know whether
            its data is current or authenticated cannot safely act. RAOS-0008 is Tier 0 because every
            other spec produces data that can go stale — without this spec, there is no protocol-level
            way to signal staleness to the agent. WP-07 (Quote Integrity) directly depends on the
            signing seam: a quote token is only as tamper-resistant as the envelope it carries.
            The TTL defaults are themselves a data model — they encode the merchant&apos;s implicit
            promise about data freshness.
          </p>
        </section>

        {/* Footer nav */}
        <div className="border-t border-slate-100 pt-8 flex items-center justify-between">
          <Link href="/specs/0005-inventory" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600">
            <ArrowLeft size={14} />
            0005 · Inventory &amp; Availability
          </Link>
          <Link href="/demo" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700">
            Try it in the Playground
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
