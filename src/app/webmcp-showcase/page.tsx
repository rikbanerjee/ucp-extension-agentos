import type { Metadata } from 'next';
import AgentReadyStorefront from '../agent-ready-storefront/storefront-client';
import { showcaseMetadata } from '@/lib/content/showcaseMetadata';

/**
 * Canonical judge-facing route. `/agent-ready-storefront` renders the identical showcase as a
 * compatibility entry point and points its canonical identity back here.
 */
export const metadata: Metadata = showcaseMetadata;

export default function WebMcpShowcasePage() {
  return <AgentReadyStorefront />;
}
