import type { Metadata } from 'next';
import AgentReadyStorefront from './storefront-client';
import { showcaseMetadata } from '@/lib/content/showcaseMetadata';

/**
 * Compatibility entry point. It renders the exact same showcase component as the canonical
 * `/webmcp-showcase` route — one implementation, never a second divergent copy — and reuses the
 * canonical metadata, so its canonical URL points at `/webmcp-showcase` rather than competing
 * with it.
 */
export const metadata: Metadata = showcaseMetadata;

export default function AgentReadyStorefrontPage() {
  return <AgentReadyStorefront />;
}
