import type { Metadata } from 'next';
import AgentReadyStorefront from '../agent-ready-storefront/storefront-client';

export const metadata: Metadata = {
  title: 'Agent Storefront | RetailAgentOS',
  description: 'Watch an AI agent use a retailer’s real selling rules before it prepares a cart or requests a quote.',
};

/** Canonical Phase 1 route. The older route remains a compatibility entry point. */
export default function WebMcpShowcasePage() {
  return <AgentReadyStorefront />;
}
