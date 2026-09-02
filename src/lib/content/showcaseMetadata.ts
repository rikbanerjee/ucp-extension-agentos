import type { Metadata } from 'next';
import {
  SHOWCASE_CANONICAL_URL,
  SHOWCASE_DESCRIPTION,
  SHOWCASE_DOCUMENT_TITLE,
} from '@/lib/content/showcaseChrome';

/**
 * One metadata object shared by the canonical `/webmcp-showcase` route and the
 * `/agent-ready-storefront` compatibility route, so the two can never present a divergent title,
 * description, or competing canonical URL — both point canonical identity at `/webmcp-showcase`.
 *
 * `title.absolute` bypasses any parent title template. The social image is the repository's
 * existing, verified `/og-image.png` (resolved against the root layout's `metadataBase`); no
 * showcase-specific image is invented here.
 */
export const showcaseMetadata: Metadata = {
  title: { absolute: SHOWCASE_DOCUMENT_TITLE },
  description: SHOWCASE_DESCRIPTION,
  alternates: { canonical: SHOWCASE_CANONICAL_URL },
  openGraph: {
    title: SHOWCASE_DOCUMENT_TITLE,
    description: SHOWCASE_DESCRIPTION,
    siteName: 'RetailAgentOS',
    url: SHOWCASE_CANONICAL_URL,
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RetailAgentOS — the merchant reasoning layer behind a WebMCP agent storefront.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SHOWCASE_DOCUMENT_TITLE,
    description: SHOWCASE_DESCRIPTION,
    images: ['/og-image.png'],
  },
};
