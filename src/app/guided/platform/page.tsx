import type { Metadata } from 'next';
import { PlatformGuidedDemo } from '@/components/guided/platform/PlatformGuidedDemo';

export const metadata: Metadata = {
  title: 'Late-Night Delivery Guided Demo | RetailAgentOS',
  description:
    'See a late-night NYC pizza request evaluated across a RetailAgentOS-enabled local pizzeria, an unverified local shop and a platform-connected chain — no setup, no signup, 2 minutes.',
};

export default function GuidedPlatformPage() {
  return <PlatformGuidedDemo />;
}
