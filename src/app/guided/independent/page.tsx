import type { Metadata } from 'next';
import { IndependentTrack } from '@/components/guided/tracks/IndependentTrack';

export const metadata: Metadata = {
  title: 'Independent Retail Guided Demo | RetailAgentOS',
  description:
    'See how a boutique becomes understandable and discoverable to an AI shopping assistant — no setup, no signup, 90 seconds.',
};

export default function GuidedIndependentPage() {
  return <IndependentTrack />;
}
