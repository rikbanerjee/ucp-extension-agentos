import type { Metadata } from 'next';
import AgentReadyStorefront from './storefront-client';

export const metadata: Metadata = { title: 'Agent-ready storefront | RetailAgentOS', description: 'See how a retailer can let AI agents search, evaluate, prepare a cart, and hand checkout back to the shopper.' };
export default function AgentReadyStorefrontPage() { return <AgentReadyStorefront />; }
