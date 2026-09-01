'use client';

import type { WebMcpTelemetryEvent, WebMcpToolName } from '../../../packages/webmcp/src';

interface DeveloperEvidenceProps {
  scenario: 'fresh' | 'custom';
  storefrontId: string;
  storefrontSessionId: string;
  native: boolean;
  activeTools: WebMcpToolName[];
  browserTools: string[] | null;
  parity: string;
  events: WebMcpTelemetryEvent[];
  customHubDisclosure: boolean;
}

/** Registry parity, provenance, schemas, and raw telemetry — progressively disclosed, never above the fold. */
export function DeveloperEvidence({ scenario, storefrontId, storefrontSessionId, native, activeTools, browserTools, parity, events, customHubDisclosure }: DeveloperEvidenceProps) {
  return (
    <div className="mt-5 space-y-3">
      <details className="rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer font-semibold text-slate-900">Developer evidence</summary>
        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <span>Storefront: <code className="text-xs">{storefrontId}</code></span>
          <span>Session: <code className="text-xs break-all">{storefrontSessionId}</code></span>
          <span>Registration source: {native ? 'native browser registration' : 'no native registration observed'}</span>
          <span>Registry parity: {parity}</span>
          <span>RetailAgentOS-tracked tools: {activeTools.length}</span>
          <span>Browser-observed tools: {browserTools?.length ?? 'unavailable'}</span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Each tool descriptor carries an exact name, JSON Schema input, annotations, and lifecycle
          (registered / invoked / completed / failed / cancelled / unregistered). Native and guided
          invocations call the identical descriptor handler and RetailAgentOS gateway; only the
          telemetry <code>source</code> field differs (native vs. replay).
        </p>
        <details className="mt-3 text-xs text-slate-600">
          <summary className="cursor-pointer font-semibold">Full event log ({events.length})</summary>
          <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(events, null, 2)}</pre>
        </details>
      </details>

      {scenario === 'custom' && customHubDisclosure && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <b className="text-slate-900">TheCustomHub fixture disclosure</b>
          <p className="mt-1">
            Authorized controlled fixture. No live TheCustomHub catalog, quote, cart, or order API is
            called in this showcase. The scenario is functionally live as a controlled WebMCP
            demonstration; the merchant backend integration is not live.
          </p>
        </div>
      )}

      <ProtocolChannels />
    </div>
  );
}

function ProtocolChannels() {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer font-semibold text-slate-900">One decision, multiple channels</summary>
      <div className="mt-3 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
        <ChannelNote title="WebMCP" body="Browser-agent actions demonstrated on this page." status="Shipped for this controlled showcase" />
        <ChannelNote title="UCP" body="Commerce discovery and transaction projection foundation." status="Foundation in place" />
        <ChannelNote title="MCP" body="Remote/client integration path, designed separately." status="Designed, not shipped" />
        <ChannelNote title="Storefront UI & feeds" body="Human and machine projections of the same canonical facts." status="Partial — not every channel is live" />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        All of these derive from the same canonical merchant/catalog/policy objects and the same
        deterministic RetailAgentOS decision — no channel recalculates commerce policy on its own.
      </p>
    </details>
  );
}

function ChannelNote({ title, body, status }: { title: string; body: string; status: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <b className="text-slate-900">{title}</b>
      <p className="mt-1">{body}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{status}</p>
    </div>
  );
}
