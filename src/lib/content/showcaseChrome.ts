// Single source of truth for the OpenAI WebMCP Challenge showcase's identity, chrome, and
// judge-facing anchors. The canonical route is `/webmcp-showcase`; `/agent-ready-storefront`
// is a compatibility entry point that renders the identical showcase with the identical
// focused chrome (AGENTS.md). Nav labels, anchor ids, external links, and the optional video
// URL live here so a header, footer, hero, page metadata, and tests never drift apart.

/** Routes that render the focused challenge chrome instead of the normal company nav/footer. */
export const SHOWCASE_ROUTES = ['/webmcp-showcase', '/agent-ready-storefront'] as const;

/** Canonical judge-facing route. Metadata, documentation, and public links must point here. */
export const SHOWCASE_CANONICAL_PATH = '/webmcp-showcase';
export const SHOWCASE_CANONICAL_URL = 'https://www.retailagentos.com/webmcp-showcase';

/** Public source repository for the challenge submission. */
export const SHOWCASE_SOURCE_URL = 'https://github.com/rikbanerjee/ucp-extension-agentos';

/** Navigation label used everywhere the broader website points at the demo. */
export const SHOWCASE_NAV_LABEL = 'WebMCP Live Demo';

/** Page/product label. RetailAgentOS itself is never renamed to "WebMCP Storefront". */
export const SHOWCASE_PAGE_LABEL = 'RetailAgentOS WebMCP Agent Storefront';

/** Browser/document title for the canonical route (and the compatibility route's identity). */
export const SHOWCASE_DOCUMENT_TITLE =
  'RetailAgentOS WebMCP Agent Storefront | OpenAI WebMCP Challenge';

export const SHOWCASE_DESCRIPTION =
  'See RetailAgentOS use WebMCP to expose only the next merchant-safe browser action across inventory repair, shopper approval, cart preparation, cart revision, and quote-only custom commerce.';

export const SHOWCASE_EYEBROW = 'OPENAI WEBMCP CHALLENGE · LIVE IMPLEMENTATION';

export const SHOWCASE_HEADLINE =
  'The browser agent asks. RetailAgentOS checks what the retailer can actually promise.';

export const SHOWCASE_SUPPORTING_COPY =
  'WebMCP exposes only the next safe browser action while RetailAgentOS validates inventory, pricing, fulfillment, quote requirements, shopper constraints, and merchant policy.';

/**
 * Truthful challenge badge. "Built for" states intent, never endorsement, certification,
 * partnership, or selection by OpenAI — and no OpenAI logo or mark is used anywhere.
 */
export const SHOWCASE_BADGE_SHORT = 'OpenAI WebMCP Challenge';
export const SHOWCASE_BADGE_LONG = 'Built for the OpenAI WebMCP Challenge';

/** The product relationship that must never invert: reasoning layer vs. browser action surface. */
export const SHOWCASE_RELATIONSHIP_LINE =
  'RetailAgentOS is the merchant reasoning layer. WebMCP is the browser action surface.';

export const SHOWCASE_BUILT_IN_PUBLIC_LINE = 'Built in public for the OpenAI WebMCP Challenge.';

/** Stable semantic anchor ids. Anchor targets carry `scroll-margin-top` for the sticky header. */
export const SHOWCASE_ANCHORS = {
  mission: 'webmcp-mission',
  whyWebMcp: 'why-webmcp',
  developerEvidence: 'developer-evidence',
} as const;

export interface ShowcaseNavLink {
  label: string;
  href: string;
  /** True for links that leave the site and must open in a new tab with rel="noopener noreferrer". */
  external?: boolean;
}

/**
 * Focused challenge navigation, shared verbatim by the desktop header row and the mobile menu
 * so the two navigation systems never disagree (and never render at once).
 */
export const SHOWCASE_NAV_LINKS: ShowcaseNavLink[] = [
  { label: 'Run Demo', href: `#${SHOWCASE_ANCHORS.mission}` },
  { label: 'How It Works', href: `#${SHOWCASE_ANCHORS.whyWebMcp}` },
  { label: 'Developer Evidence', href: `#${SHOWCASE_ANCHORS.developerEvidence}` },
  { label: 'GitHub', href: SHOWCASE_SOURCE_URL, external: true },
];

export const SHOWCASE_BACK_LINK: ShowcaseNavLink = { label: 'Back to RetailAgentOS', href: '/' };

/** Compact challenge-footer links. Deliberately short: UCP is not the message on this route. */
export const SHOWCASE_FOOTER_LINKS: ShowcaseNavLink[] = [
  { label: SHOWCASE_NAV_LABEL, href: SHOWCASE_CANONICAL_PATH },
  { label: 'Source Code', href: SHOWCASE_SOURCE_URL, external: true },
  { label: 'Build Log', href: '/buildlog' },
  { label: 'Technical Evidence', href: '/evidence' },
  { label: '/agents.md', href: '/agents.md' },
  SHOWCASE_BACK_LINK,
];

/** True when `pathname` is one of the two showcase routes (exact match — no nested showcase routes). */
export function isShowcaseRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (SHOWCASE_ROUTES as readonly string[]).includes(pathname);
}

/**
 * The optional public demo-video URL, configured once through `NEXT_PUBLIC_WEBMCP_VIDEO_URL`.
 *
 * Returns `null` — so the "Watch video" action is not rendered at all — unless the value is a
 * real, absolute `https:` URL. A blank value, a bare `#`, or a `[VIDEO LINK]`-style placeholder
 * is treated as "not configured yet"; nothing here ever renders a dead or "coming soon" link.
 * Once a genuine URL is supplied the button appears with no further structural change.
 */
export function getShowcaseVideoUrl(
  raw: string | undefined = process.env.NEXT_PUBLIC_WEBMCP_VIDEO_URL,
): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}
