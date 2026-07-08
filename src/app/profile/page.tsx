'use client';

import { useState } from 'react';
import { mockMerchants } from '@/lib/mock/merchants';
import { Panel } from '@/components/ui/Panel';
import { JsonViewer } from '@/components/ui/JsonViewer';
import { Badge } from '@/components/ui/Badge';

export default function ProfilePage() {
  const [activeMerchantId, setActiveMerchantId] = useState(mockMerchants[0].merchantId);
  
  const activeMerchant = mockMerchants.find(m => m.merchantId === activeMerchantId)!;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-8 items-start">
      <div className="w-full md:w-2/3 flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            UCP Profile Viewer
          </h1>
          <div className="flex gap-2">
            {mockMerchants.map(merchant => (
              <button
                key={merchant.merchantId}
                onClick={() => setActiveMerchantId(merchant.merchantId)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeMerchantId === merchant.merchantId
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {merchant.merchantName}
              </button>
            ))}
          </div>
        </div>

        <Panel title="Core UCP Capabilities">
          <div className="grid gap-4 sm:grid-cols-2">
            {activeMerchant.capabilities.map(cap => (
              <div key={cap.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900">{cap.name}</span>
                  <Badge variant="neutral">v{cap.version}</Badge>
                </div>
                <div className="text-sm font-mono text-slate-500 mb-2">{cap.id}</div>
                <p className="text-sm text-slate-600">{cap.description}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title={`Manifest · Headline Tier ${activeMerchant.manifest.tier} · capabilities[]`}>
          <p className="text-xs text-slate-500 mb-4">
            The headline <span className="font-mono">tier</span> is an advisory maturity summary.
            Agents negotiate against the authoritative{' '}
            <span className="font-mono">capabilities[]</span> list below
            (each <span className="font-mono">namespace@version</span>), never against the tier number.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {activeMerchant.manifest.capabilities.map(ext => (
              <div key={ext.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-900">{ext.name}</span>
                  <Badge variant={ext.required ? 'warning' : 'neutral'}>
                    {ext.required ? 'Required' : 'Optional'}
                  </Badge>
                </div>
                <div className="text-xs font-mono text-slate-500 mb-1">{ext.id}</div>
                <div className="text-xs font-mono text-emerald-600 mb-3 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                  {ext.namespace}
                </div>
                <p className="text-sm text-slate-600">{ext.description}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="w-full md:w-1/3 flex flex-col md:sticky md:top-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Raw Payload (/.well-known/ucp)</h3>
        <JsonViewer 
          data={activeMerchant} 
          className="flex-1 min-h-[500px]" 
        />
      </div>
    </div>
  );
}
