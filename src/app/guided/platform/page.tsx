import type { Metadata } from 'next';
import { PlatformTrack } from '@/components/guided/tracks/PlatformTrack';

export const metadata: Metadata = {
  title: 'Commerce Platform Guided Demo | RetailAgentOS',
  description:
    'See how a platform can compare candidate offers across merchants and explain why some can proceed and others cannot — no setup, no signup, 2 minutes.',
};

export default function GuidedPlatformPage() {
  return <PlatformTrack />;
}
