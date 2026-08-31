// Shared "Developers" link set — used by the primary nav dropdown, the
// footer Developers column, and the homepage developer-gateway section.
// Keeping one list means adding a developer-facing route only requires an
// edit here (AGENTS.md: avoid duplicating audience/content between nav,
// homepage and solution pages).

export interface DeveloperLink {
  label: string;
  href: string;
  description?: string;
}

export const DEVELOPER_LINKS: DeveloperLink[] = [
  { label: 'Developer Overview', href: '/developers', description: 'The technical gateway: architecture, pipeline, specs, playground.' },
  { label: 'WebMCP implementation', href: '/webmcp-showcase', description: 'Native browser-tool registration, deterministic decisions, and the interactive fallback.' },
  { label: 'Specifications', href: '/specs', description: 'Open RAOS specs — eligibility, pricing, inventory, quote integrity, trust.' },
  { label: 'Live Playground', href: '/demo', description: 'Run real buyer contexts against the reference engine.' },
  { label: 'Adoption Guide', href: '/adopt', description: 'The tiered adoption ladder, from discoverable to fully integrated.' },
  { label: 'Conformance', href: '/evidence/conformance', description: 'What a conformant implementation must satisfy, checked against the code.' },
];

export interface EvidenceLink {
  label: string;
  href: string;
}

export const EVIDENCE_LINKS: EvidenceLink[] = [
  { label: 'Public Scorecard', href: '/evidence' },
  { label: 'Conformance Scoreboard', href: '/evidence/conformance' },
  { label: 'Build Log', href: '/buildlog' },
];
