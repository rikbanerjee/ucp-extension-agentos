'use client';

import type { RecipeResult } from '../recipes/index';
import type { DecisionRecord, QuoteToken, MerchantTraceRow, BuyerTraceView, PartialBuyerContext } from '@retailagentos/engine';
import { CodeBlock } from './CodeBlock';

// ---------------------------------------------------------------------------
// Severity badge
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    BLOCK: 'bg-red-100 text-red-800 border border-red-200',
    CONDITION: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    INFO: 'bg-blue-100 text-blue-800 border border-blue-200',
    PASS: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  };
  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-xs font-mono font-semibold rounded ${styles[severity] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {severity}
    </span>
  );
}

// ---------------------------------------------------------------------------
// DecisionRecord reasons table
// ---------------------------------------------------------------------------

function ReasonsTable({ record }: { record: DecisionRecord }) {
  const reasons = record.reasons;
  if (reasons.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">No reasons emitted.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="bg-slate-100 text-slate-600 text-left">
            <th className="px-3 py-2 font-semibold">Severity</th>
            <th className="px-3 py-2 font-semibold">Code</th>
            <th className="px-3 py-2 font-semibold">Source</th>
            <th className="px-3 py-2 font-semibold w-1/2">Message</th>
          </tr>
        </thead>
        <tbody>
          {reasons.map((r, i) => (
            <tr
              key={i}
              className={`border-t border-slate-100 ${r.severity === 'BLOCK' ? 'bg-red-50' : r.severity === 'CONDITION' ? 'bg-yellow-50' : ''}`}
            >
              <td className="px-3 py-1.5">
                <SeverityBadge severity={r.severity} />
              </td>
              <td className="px-3 py-1.5 text-slate-800 font-semibold">{r.code}</td>
              <td className="px-3 py-1.5 text-slate-500 truncate max-w-[160px]">{r.source}</td>
              <td className="px-3 py-1.5 text-slate-700 whitespace-normal">{r.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stage verdicts chips
// ---------------------------------------------------------------------------

function StageChips({ record }: { record: DecisionRecord }) {
  const stageOrder = ['VISIBILITY', 'ELIGIBILITY', 'PRICE', 'FULFILLMENT', 'QUOTE'] as const;
  return (
    <div className="flex flex-wrap gap-2">
      {stageOrder.map(stage => {
        const ran = stage in record.stages;
        return (
          <span
            key={stage}
            className={`text-xs px-2 py-1 rounded font-mono ${ran ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
          >
            {stage}{ran ? '' : ' (skipped)'}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Envelope display
// ---------------------------------------------------------------------------

function EnvelopeCard({ record }: { record: DecisionRecord }) {
  const env = record.envelope;
  if (!env) return null;
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono space-y-1">
      <div className="text-slate-500 font-semibold uppercase tracking-wide text-[10px] mb-2">
        RAOS-0008 Provenance Envelope
        {env.trustMode === 'asserted' && (
          <span className="ml-2 text-amber-600 font-bold">SIMULATED</span>
        )}
      </div>
      <div><span className="text-slate-500">issuer:</span> {env.issuer}</div>
      <div><span className="text-slate-500">keyId:</span> {env.keyId}</div>
      <div><span className="text-slate-500">signature:</span> {env.signature}</div>
      <div><span className="text-slate-500">trustMode:</span> {env.trustMode}</div>
      <div><span className="text-slate-500">ttlSeconds:</span> {env.ttlSeconds}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quote token display
// ---------------------------------------------------------------------------

function QuoteTokenCard({ token }: { token: QuoteToken }) {
  const policy = token.honorPolicy;
  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs font-mono space-y-1">
      <div className="text-indigo-700 font-semibold text-[11px] mb-2 uppercase tracking-wide">
        QuoteToken
      </div>
      <div><span className="text-slate-500">quoteId:</span> {token.quoteId}</div>
      <div><span className="text-slate-500">unitPrice:</span> ${token.unitPrice.toFixed(2)} {token.currency}</div>
      <div><span className="text-slate-500">issuedAt:</span> {new Date(token.issuedAt).toISOString()}</div>
      <div><span className="text-slate-500">ttlSeconds:</span> {token.ttlSeconds}</div>
      <div><span className="text-slate-500">buyerContextHash:</span> {token.buyerContextHash}</div>
      <div className="pt-1 text-slate-500 font-semibold">HonorPolicy:</div>
      <div className="pl-2">
        <div>onExpiry: {policy.onExpiry}{policy.graceSeconds ? ` (grace ${policy.graceSeconds}s)` : ''}</div>
        <div>onStockLoss: {policy.onStockLoss}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Merchant trace rows
// ---------------------------------------------------------------------------

function MerchantTraceTable({ rows }: { rows: MerchantTraceRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-100 text-slate-600 text-left">
            <th className="px-3 py-2 font-semibold">Stage</th>
            <th className="px-3 py-2 font-semibold">Status</th>
            <th className="px-3 py-2 font-semibold">Code</th>
            <th className="px-3 py-2 font-semibold">Action Hint</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="px-3 py-2 font-mono text-slate-700">{row.stage}</td>
              <td className="px-3 py-2">
                <SeverityBadge severity={row.status} />
              </td>
              <td className="px-3 py-2 font-mono font-semibold text-slate-800">{row.code}</td>
              <td className="px-3 py-2 text-slate-600">{row.actionHint}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buyer trace view
// ---------------------------------------------------------------------------

function BuyerTraceCard({ view }: { view: BuyerTraceView }) {
  return (
    <div
      className={`rounded-lg p-4 border ${view.canPurchase ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}
    >
      <div className={`font-semibold text-sm mb-1 ${view.canPurchase ? 'text-emerald-800' : 'text-red-800'}`}>
        {view.canPurchase ? 'Available for purchase' : 'Not available'}
      </div>
      <div className="text-sm text-slate-700">{view.headline}</div>
      {view.detail && (
        <div className="text-sm text-slate-600 mt-1">{view.detail}</div>
      )}
      {view.nextStep && (
        <div className="mt-2 text-xs text-slate-500 italic">Next step: {view.nextStep}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Normalized context display
// ---------------------------------------------------------------------------

/**
 * Renders normalizedContext with amber highlighting for fields that were
 * downgraded by §7.2 trust enforcement (i.e. the recipe requested a value that
 * differs from what normalization produced). Requires requestedContext to be
 * present in RecipeResult.
 */
function NormalizedContextCard({
  record,
  requestedContext,
}: {
  record: DecisionRecord;
  requestedContext?: PartialBuyerContext;
}) {
  const ctx = record.normalizedContext;

  // A field is downgraded when the recipe asked for a value that normalization
  // replaced. We check string-equality so booleans are handled cleanly.
  function wasDowngraded(field: keyof PartialBuyerContext): boolean {
    if (!requestedContext) return false;
    const requested = requestedContext[field];
    const normalized = ctx[field as keyof typeof ctx];
    return requested !== undefined && String(requested) !== String(normalized);
  }

  function FieldValue({
    label,
    field,
    value,
  }: {
    label: string;
    field: keyof PartialBuyerContext;
    value: string;
  }) {
    const downgraded = wasDowngraded(field);
    const requestedRaw = requestedContext?.[field];
    return (
      <div className={downgraded ? 'text-amber-700' : undefined}>
        <span className="text-slate-500">{label}:</span>{' '}
        {downgraded ? (
          <>
            <span className="line-through text-slate-400 mr-1">{String(requestedRaw)}</span>
            <span className="font-semibold">{value}</span>
            <span className="ml-1 text-[10px] text-amber-600 font-semibold">(downgraded — asserted §7.2)</span>
          </>
        ) : (
          value
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs font-mono grid grid-cols-2 gap-x-4 gap-y-1">
      <div className="col-span-2 text-slate-500 font-semibold uppercase tracking-wide text-[10px] mb-1">
        normalizedContext (after trust downgrade)
      </div>
      <FieldValue label="customerType" field="customerType" value={ctx.customerType} />
      <FieldValue label="loyaltyTier" field="loyaltyTier" value={ctx.loyaltyTier} />
      <FieldValue label="membershipTier" field="membershipTier" value={ctx.membershipTier} />
      <div><span className="text-slate-500">marketRegion:</span> {ctx.marketRegion}</div>
      <FieldValue label="taxExempt" field="taxExempt" value={String(ctx.taxExempt)} />
      <FieldValue label="resaleCert" field="resaleCertificateOnFile" value={String(ctx.resaleCertificateOnFile)} />
      <div><span className="text-slate-500">trust.mode:</span> {ctx.trust.mode}</div>
      <div><span className="text-slate-500">inputsHash:</span> {record.inputsHash}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main OutputView component
// ---------------------------------------------------------------------------

interface OutputViewProps {
  result: RecipeResult;
  /** Which audience view to show when merchantTrace/buyerTrace/developerTrace are present */
  traceAudience?: 'developer' | 'merchant' | 'buyer';
}

export function OutputView({ result, traceAudience }: OutputViewProps) {
  const { decisionRecord, requestedContext, quote, validation, merchantTrace, buyerTrace, developerTrace, summary } = result;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="bg-slate-800 text-slate-100 text-xs font-mono rounded-lg px-4 py-3 leading-relaxed">
        {summary}
      </div>

      {/* DecisionRecord output */}
      {decisionRecord && (
        <div className="space-y-3">
          {/* Stage chips */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Stages ran
            </div>
            <StageChips record={decisionRecord} />
          </div>

          {/* Reasons */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Reasons ({decisionRecord.reasons.length})
            </div>
            <ReasonsTable record={decisionRecord} />
          </div>

          {/* Normalized context */}
          <NormalizedContextCard record={decisionRecord} requestedContext={requestedContext} />

          {/* Envelope */}
          <EnvelopeCard record={decisionRecord} />
        </div>
      )}

      {/* Quote token */}
      {quote && (
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Issued QuoteToken
          </div>
          <QuoteTokenCard token={quote} />
        </div>
      )}

      {/* Quote validation result */}
      {validation && (
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Validation outcome
          </div>
          <div
            className={`rounded-lg p-3 border text-sm font-semibold ${
              validation.outcome === 'HONORED'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : validation.outcome === 'REQUOTE_REQUIRED'
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            {validation.outcome}
            {validation.honoredQuantity != null && (
              <span className="text-xs ml-2 font-normal">
                (honored qty: {validation.honoredQuantity})
              </span>
            )}
          </div>
          {validation.reasons.length > 0 && (
            <div className="mt-2 space-y-1">
              {validation.reasons.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <SeverityBadge severity={r.severity} />
                  <span className="font-mono font-semibold text-slate-700">{r.code}</span>
                  <span className="text-slate-600">{r.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trace renderers (0013) */}
      {traceAudience === 'developer' && developerTrace && (
        <CodeBlock code={developerTrace} label="renderDeveloperTrace() — stable JSON" />
      )}
      {traceAudience === 'merchant' && merchantTrace && (
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            renderMerchantTrace() — ops-actionable rows
          </div>
          <MerchantTraceTable rows={merchantTrace} />
        </div>
      )}
      {traceAudience === 'buyer' && buyerTrace && (
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            renderBuyerTrace() — plain language
          </div>
          <BuyerTraceCard view={buyerTrace} />
        </div>
      )}
    </div>
  );
}
