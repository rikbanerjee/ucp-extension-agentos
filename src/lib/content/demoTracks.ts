// Shared guided-demo track metadata — single source of truth for the
// /see-it-work hub cards, solution-page demo CTAs, and "try another demo"
// links. Kept intentionally data-only (no React nodes, no engine callbacks)
// per AGENTS.md guidance on this module.

export type DemoTrackId = 'enterprise' | 'independent' | 'platform' | 'developer';

export interface DemoTrackSummary {
  id: DemoTrackId;
  audience: string;
  title: string;
  description: string;
  /** Human-readable estimated duration, e.g. "2 minutes". Empty for the developer track (open-ended). */
  duration: string;
  href: string;
  ctaLabel: string;
}

export const DEMO_TRACKS: DemoTrackSummary[] = [
  {
    id: 'enterprise',
    audience: 'Enterprise Retail Leaders',
    title: 'Keep AI shopping channels aligned with your retail policies.',
    description:
      'See how customer qualification, contextual pricing and quote integrity can be handled before checkout.',
    duration: '2 minutes',
    href: '/guided/enterprise',
    ctaLabel: 'See the enterprise scenario',
  },
  {
    id: 'independent',
    audience: 'Independent Retailers',
    title: 'Help AI find your products and represent your store correctly.',
    description:
      'See how a boutique becomes understandable and discoverable to an AI shopping assistant.',
    duration: '90 seconds',
    href: '/guided/independent',
    ctaLabel: 'See the boutique demo',
  },
  {
    id: 'platform',
    audience: 'Commerce & Fulfilment Platforms',
    title: 'Make time-sensitive local commerce reliable across every merchant.',
    description:
      'See a late-night NYC pizza request evaluated across a RetailAgentOS-enabled local pizzeria, an unverified local shop and a platform-connected chain.',
    duration: '2 minutes',
    href: '/guided/platform',
    ctaLabel: 'See the late-night delivery scenario',
  },
  {
    id: 'developer',
    audience: 'Developers & Platform Architects',
    title: 'Inspect the real decision engine.',
    description:
      'Change buyer context, run scenarios and inspect business and technical decision traces.',
    duration: '',
    href: '/demo',
    ctaLabel: 'Open the technical playground',
  },
];

/** Convenience lookup for the three commercial tracks (excludes the developer entry). */
export const COMMERCIAL_DEMO_TRACKS = DEMO_TRACKS.filter(
  (t): t is DemoTrackSummary & { id: 'enterprise' | 'independent' | 'platform' } =>
    t.id !== 'developer',
);

export const DEVELOPER_DEMO_TRACK = DEMO_TRACKS.find((t) => t.id === 'developer')!;

/** Entry-point CTA label used consistently everywhere a track is entered (nav, hero, hub). */
export const ENTRY_CTA_LABEL: Record<'enterprise' | 'independent' | 'platform', string> = {
  enterprise: 'See the enterprise scenario — 2 min',
  independent: 'See the boutique demo — 90 sec',
  platform: 'See the late-night delivery scenario — 2 min',
};

// ---------------------------------------------------------------------------
// Prefilled mailto links — single source of truth shared by guided-demo
// completion scenes and solution-page bottom next-action panels.
// ---------------------------------------------------------------------------

const CONTACT_EMAIL = 'rikbanerjee007@gmail.com';

function buildMailto(subject: string, bodyLines: string[]): string {
  const body = bodyLines.join('\n');
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const ENTERPRISE_MAILTO = buildMailto('RetailAgentOS — enterprise architecture fit', [
  'Company:',
  'Current commerce platform:',
  'AI shopping use case:',
  'Retail policy that creates the most complexity:',
]);

export const PLATFORM_MAILTO = buildMailto('RetailAgentOS — commerce platform pilot', [
  'Platform:',
  'Approximate merchant count:',
  'First AI-commerce use case:',
  'Current cart or fulfilment failure:',
  'Systems that own pricing, inventory and fulfilment truth:',
]);
