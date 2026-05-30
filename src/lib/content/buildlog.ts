export interface BuildLogEntry {
  id: string;
  week: string;
  date: string;
  current?: boolean;
  title: string;
  shipped: string;
  narrative: string;
  bullets: string[];
  proves: string;
  next?: string;
}

export const buildLog: BuildLogEntry[] = [
  {
    id: 'week-3',
    week: 'Week 3',
    date: 'May 2026',
    current: true,
    title: 'Build in public layer',
    shipped: 'Build Log + audience layer',
    narrative:
      "I hit the point where the next decisions — what the specs should say, who configures this layer — aren't ones I can answer alone, or honestly want to. So I stopped polishing toward a launch and started showing the work as it happens, open question and all.",
    bullets: [
      '/buildlog page — chronological record of what ships each week',
      'Homepage updated with building-in-public signal and ecosystem framing',
      '"Where RetailAgentOS fits" — stacked visual showing UCP rails → gap → reasoning layer',
      'Global footer with Follow the Build, three audience doors, and founder identity',
      'Agent-Readiness diagnostic added to /for-merchants — shareable rubric for leaders',
      'Plain-language "Why" line on Playground decisions — makes the gap visible in real time',
    ],
    proves:
      'The right way to grow this audience is through transparent iteration and visible reasoning, not polished launches.',
    next: 'Week 4 — the Specs page: publishing the first open spec (Eligibility & Visibility Semantics) on-site — versioned, with a reason-code registry and open questions for comment. The drafts already live in /specs in the repo; next is making them a first-class, linkable surface. The Agent Reasoning Console (Phase 2) follows.',
  },
  {
    id: 'week-2',
    week: 'Week 2',
    date: 'May 2026',
    title: 'Dual-narrative site redesign',
    shipped: 'Business/Technical toggle',
    narrative:
      "Showing the early build to people, I kept watching the same split: merchants wanted to know what it did for their store, builders wanted to know how it worked. Trying to serve both in one voice served neither, so I gave the site two lenses instead of watering down one.",
    bullets: [
      'Business / Technical toggle across all pages — two audiences, one platform',
      'Business mode leads with merchant value and implementation direction',
      'Technical mode preserves the learning journey and spec framing',
      '"Get Visible to Agents" merchant page with five service tiers (Audit → Managed Pilot)',
      'RetailAgentOS vision page with dual narrative and six-phase roadmap',
    ],
    proves:
      'The same platform story works for both merchants and builders — they just need different lenses.',
    next: 'Build-in-public layer: make the site a living artifact, not a finished product.',
  },
  {
    id: 'week-1',
    week: 'Week 1',
    date: 'May 2026',
    title: 'Core UCP extension demo',
    shipped: 'UCP merchant profile + context simulator',
    narrative:
      "I wanted to know if one idea would actually hold: that the same protocol foundation could carry three completely different merchants — a boutique, a wholesaler, a grocer — without bending. So I built the smallest thing that could prove or break it, with the rules and the machine payloads visible side by side.",
    bullets: [
      'Merchant profile viewer with UCP capabilities and vendor-scoped extension declarations',
      'Three merchant archetypes: Sara\'s Boutique (discovery), B&T Wholesale (qualification), Fresh Corner Market (contextual offers)',
      'Context simulator — customer type, region, fulfillment mode, quantity controls',
      'Context-driven visibility, eligibility, pricing, bulk semantics, fulfillment constraints',
      'Dual human + machine payloads in the Playground inspector',
    ],
    proves:
      'The same UCP foundation can express radically different merchant behaviors based on context — and those differences are machine-readable.',
  },
];
