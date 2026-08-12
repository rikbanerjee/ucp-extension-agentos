export interface BuildLogEntry {
  id: string;
  week: string;
  date: string;
  current?: boolean;
  title: string;
  shipped: string;
  narrative: string;
  /** Optional: id of a diagram component to render between narrative and bullets. See buildlog/page.tsx's DIAGRAMS map. */
  diagramId?: string;
  bullets: string[];
  proves: string;
  next?: string;
}

export const buildLog: BuildLogEntry[] = [
  {
    id: 'week-7',
    week: 'Week 7',
    date: 'August 2026',
    current: true,
    title: 'The manifest said one thing, the engine did another',
    shipped: 'Manifest projection fixed + region allowlist folded into the engine',
    narrative:
      "TheCustomHub pilot audit found the failure mode I was most worried about: not a missing feature, but two true things quietly disagreeing. buildManifest() was a bare pass-through — it never copied a merchant's endpoints or servesRegions into the document an agent actually reads, so an agent had no reliable way to find checkout or know which regions were served. Worse, evaluateOffer() — the shared engine every integration is supposed to call — never enforced the region allowlist at all. It only worked because one pilot partner had bolted a manual pre-check onto their own server, outside the engine. Any other integration got silent, unenforced region gating. For an agent placing an order unattended, that's not a rough edge — it's the difference between a merchant's declared rules and what the merchant actually does.",
    diagramId: 'manifest-engine-fix',
    bullets: [
      "buildManifest() now composes endpoints + servesRegions into the manifest instead of passing profile.manifest through untouched — the /.well-known/ucp document is complete by construction",
      'servesRegions is now a required field on MerchantProfile — TypeScript refuses to compile a merchant profile that forgot to declare where it ships',
      'Region allowlist enforced as a short-circuit inside evaluateOffer() itself — every caller of the shared engine gets region enforcement, not just the one partner who remembered to pre-check',
      "Undeclared servesRegions (JS/JSON callers only, past the TypeScript gate) isn't silently permissive — a one-time REGION_POLICY_UNDECLARED (INFO) reason surfaces on the manifest, and Tier 1 conformance now requires the field",
      '348 tests passing (+20) — engine bumped to 0.2.0 as a breaking change: required field, manifest shape, and evaluateOffer behavior all changed',
    ],
    proves:
      "Declaration and enforcement have to be the same code path, or they drift — a rule that's merely documented and separately re-implemented per integration will eventually diverge, not from malice but because \"remembered to pre-check\" doesn't scale past one partner.",
    next: 'The engine and specs are real, tested, and now closing the gaps a real pilot surfaces rather than the gaps I imagined in advance. Next: the remaining Track B closeout items, then the same discipline applied to the MCP server and crypto signing seams already flagged as simulated.',
  },
  {
    id: 'week-6',
    week: 'Week 6',
    date: 'June 2026',
    title: 'One front door, one story',
    shipped: 'Guided demo rebuilt + reference cookbook live',
    narrative:
      "At some point you have to face the gap between what you've built and what someone new can absorb in sixty seconds. The engine was real, the specs were live, the playground was rich — and still I was watching people bounce. The problem wasn't the work; it was the entry point. So I stopped adding and started cutting, rebuilding the guided experience around a single question: what happens to a real shopper in a world where the agent knows the rules upfront, versus one where it doesn't? That contrast, told as one story, turned out to be the thing that lands.",
    bullets: [
      "Guided demo rebuilt around one shopper, two worlds — agent hits a dead end at checkout vs. agent that's told the rules upfront and can unlock the path",
      'Three follow-on scenes: right price upfront (promo surfaced before cart), can-it-ship-here (region block surfaced early), and will-the-quote-hold (price honored at checkout)',
      'Audience fork at the end — retailers and builders each land somewhere that speaks to them',
      'Nav entry simplified to "See it (90s)" — the primary front door is now unambiguous',
      'Stale secondary landing page retired; one canonical entry into the guided experience',
      'Reference cookbook live at /sandbox/reference — each spec\'s minimal implementation runs against the real engine, copy-pasteable, and guaranteed to stay in sync with the rules',
    ],
    proves:
      'A tool people can\'t enter in thirty seconds isn\'t ready yet, no matter how much is working underneath it.',
    next: 'The engine and the specs are real. The remaining seam is that crypto signing and the MCP server are still running behind simulated interfaces. The next honest step is making those real — a live server that agents can actually query, and signatures that a third party can verify.',
  },
  {
    id: 'week-5',
    week: 'Week 5',
    date: 'June 2026',
    title: 'The specs become executable',
    shipped: 'Deterministic pipeline + Decision Trace + provenance envelope',
    narrative:
      "Publishing specs is easy. The harder question is whether the rules in the spec and the rules the engine actually runs are the same thing — and whether you can prove it. I spent this week collapsing that gap: building a staged reasoning pipeline (visibility, then eligibility, then price, then fulfillment, then quote) that runs exactly what the specs describe, backed by a test suite so the same inputs always produce the same answer. The output isn't just a decision anymore. It's a decision with a provenance tag — who issued it, when, how fresh the underlying data is — and a three-audience explanation: plain language for the shopper, action steps for the merchant, raw detail for the developer.",
    bullets: [
      'Staged reasoning pipeline: visibility → eligibility → pricing → fulfillment → quote, in that order, deterministic',
      'Full test coverage — the same inputs always produce the same outputs, no surprises at integration time',
      'Provenance envelope on every answer: issuer, timestamp, per-stage TTL, and a staleness flag agents can act on',
      'Price-lock quote: the price an agent sees is the price honored at checkout, with a configurable lock window',
      'Three-audience Decision Trace — one decision, explained three ways: plain language (shopper), operational (merchant), structured detail (developer)',
      'Crypto signing and the MCP server are behind real interfaces — but still simulated, not production keys. The seam is clearly marked.',
    ],
    proves:
      'A spec that isn\'t testable is just a wish. The moment the same inputs always produce the same answer, you have something buildable.',
  },
  {
    id: 'week-4',
    week: 'Week 4',
    date: 'May 2026',
    title: 'The specs go live',
    shipped: 'Seven open specs published as versioned, linkable pages',
    narrative:
      "The drafts had been sitting in the repo for a while — close enough to share, not quite right to ship. I kept finding reasons to wait: one more example, one more edge case, one more pass on the reason codes. Eventually I realized the waiting was the problem. Specs that only exist in a private folder can't attract the disagreement they need to get better. So I pushed them live, open questions and all: Foundations, Eligibility and Visibility, Contextual Pricing, Inventory and Availability, Quote Integrity, Trust and Provenance, and a Decision Trace spec. Each one has a reason-code vocabulary, worked examples across all three merchant archetypes, and the open questions I genuinely don't have answers to.",
    bullets: [
      'Seven specs published as first-class, linkable pages — each versioned and permalinkable',
      'Spec index page at /specs with status labels (draft, review, stable)',
      'Reason-code registries: machine-readable short codes for every visibility, eligibility, pricing, and fulfillment outcome',
      'Worked examples for all three merchant archetypes (boutique, wholesaler, grocer) in each spec',
      'Open questions surfaced inline — I\'m not pretending these are settled',
      'Decision Trace spec: the three-audience format defined before it was implemented',
    ],
    proves:
      'Drafts that live only in a private repo can\'t be challenged. Pushing with open questions is more honest — and more useful — than waiting for a version that feels finished.',
    next: 'Week 5 — making the specs executable: the reasoning pipeline runs what the specs describe, and a test suite proves it.',
  },
  {
    id: 'week-3',
    week: 'Week 3',
    date: 'May 2026',
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
