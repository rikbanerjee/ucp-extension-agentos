import type { Metadata } from 'next';
import { EnterpriseTrack } from '@/components/guided/tracks/EnterpriseTrack';

export const metadata: Metadata = {
  title: 'Enterprise Retail Guided Demo | RetailAgentOS',
  description:
    'See how customer qualification, contextual pricing and quote integrity can be handled before checkout — no setup, no signup, 2 minutes.',
};

export default function GuidedEnterprisePage() {
  return <EnterpriseTrack />;
}
