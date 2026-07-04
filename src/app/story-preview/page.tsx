import type { Metadata } from 'next';
import StoryPreviewClient from './StoryPreviewClient';

// Superseded by /guided (same "watch an agent shop, old way vs RetailAgentOS way"
// concept, more fully built and wired to the real engine). Route kept live rather
// than deleted, but excluded from search indexing and not linked from nav/homepage.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function StoryPreviewPage() {
  return <StoryPreviewClient />;
}
