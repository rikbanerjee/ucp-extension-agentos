/**
 * AI-readiness level mapping — /aeo-score
 *
 * Maps the AEO/GEO analyzer's raw category scores and per-check audit
 * results (src/lib/aeo/analyzer.ts, src/lib/aeo/widgetAudit.ts) onto the
 * homepage's four-level readiness ladder (HOMEPAGE-COPY.md §4):
 *
 *   Level 1 — Visible.  AI can find you.
 *   Level 2 — Correct.  AI gets your rules right (pricing, promos, membership, shipping).
 *   Level 3 — Trusted.  AI can buy safely (price integrity, eligibility, fulfillment).
 *   Level 4 — Native.   The whole platform is ready — every store inherits 1–3.
 *
 * This module is pure (no I/O, no React) so it can be unit-tested and reused
 * between the results view and any future share/export path. It intentionally
 * does not import anything from src/lib/aeo — it only consumes the public
 * `AeoResult` shape.
 *
 * Claim discipline (EVIDENCE-PLAN §5): this module never asserts that
 * RetailAgentOS is installed on the scanned store. A missing RetailAgentOS-
 * style reasoning check is described as "what would change this score" —
 * never as an existing integration.
 *
 * Level 4 is never assigned here: "Native" is a platform-level property (every
 * store on a platform inherits it), not something a single-URL scan of one
 * store can demonstrate. The highest level this tool awards a single store is
 * Level 3.
 */

import type { AeoResult, AuditCategory, AuditItem } from '@/lib/aeo/types';

export interface ReadinessLevelDef {
  id: 0 | 1 | 2 | 3 | 4;
  badge: string;
  name: string;
  /** Verbatim from HOMEPAGE-COPY.md §4 — keep in sync with src/app/page.tsx's readinessLadder. */
  description: string;
  who: string;
}

export const READINESS_LEVELS: ReadinessLevelDef[] = [
  {
    id: 0,
    badge: 'Level 0',
    name: 'Not yet visible',
    description: "AI shopping assistants can't reliably find or read your store yet.",
    who: 'Most stores start here.',
  },
  {
    id: 1,
    badge: 'Level 1',
    name: 'Visible',
    description: 'AI can find you. Your store shows up when AI assistants go shopping.',
    who: 'For any store — takes about a day.',
  },
  {
    id: 2,
    badge: 'Level 2',
    name: 'Correct',
    description:
      'AI gets your rules right. Prices, promotions, memberships, and shipping — answered correctly before checkout.',
    who: 'For growing stores with real pricing complexity.',
  },
  {
    id: 3,
    badge: 'Level 3',
    name: 'Trusted',
    description:
      'AI can buy safely. The price the AI shows is the price you charge. Age-restricted and regulated products handled properly.',
    who: 'For grocery, wholesale, and regulated retail.',
  },
  {
    id: 4,
    badge: 'Level 4',
    name: 'Native',
    description:
      'Your whole platform is ready. Commerce platforms build it in once — every store on the platform inherits levels 1–3 automatically.',
    who: 'For platforms and marketplaces.',
  },
];

/** Shown alongside the level card — Level 4 is never awarded to a single store. */
export const LEVEL_4_NOTE =
  "Level 4 — Native isn't something one store's scan can show — it's a platform inheriting readiness for every store built on it. See how the platform path works.";

export interface Blocker {
  name: string;
  category: AuditCategory;
  /** Plain-language translation (HOMEPAGE-COPY glossary style) — no protocol jargon. */
  plain: string;
  /** The underlying technical signal, shown only in the "technical detail" disclosure. */
  technical: string;
}

export interface ReadinessAssessment {
  level: ReadinessLevelDef;
  /** 0–100, same score the analyzer already computes. */
  score: number;
  /** Fraction (0–1) across schema/format/readability/eeat/metadata — "can AI find & parse you at all." */
  discoverabilityPct: number;
  /** How many of the RetailAgentOS-style reasoning checks (pricing, eligibility, bulk, promo, fulfillment) pass. */
  reasoningPassCount: number;
  reasoningTotal: number;
  topBlockers: Blocker[];
}

const DISCOVERABILITY_CATEGORIES: AuditCategory[] = ['schema', 'format', 'readability', 'eeat', 'metadata'];

// Priority order for picking the "top 3 things holding you back": the
// retailagentos checks gate advancement past Level 1, so surface those
// first, then basic discoverability (schema/metadata), then the rest.
const BLOCKER_CATEGORY_PRIORITY: Record<AuditCategory, number> = {
  retailagentos: 0,
  schema: 1,
  metadata: 2,
  readability: 3,
  eeat: 4,
  format: 5,
};

/**
 * Plain-language translations for known check names, matching
 * HOMEPAGE-COPY.md's translation glossary style — never spec numbers or
 * protocol jargon above the fold. Keyed by AuditItem.name.
 */
const CHECK_GLOSSARY: Record<string, string> = {
  // Schema / discovery
  'Structured Data Presence': "Your store has no sign written for machines — AI shoppers can't tell what you sell.",
  'UCP Discovery Endpoint': "Your store has no sign written for machines telling AI shoppers what it can do.",
  'Q&A / FAQ Schema': "Common questions aren't answered in a way AI can quote directly.",
  'FAQ/Q&A Schema': "Common questions aren't answered in a way AI can quote directly.",
  'FAQ Schema': "Common questions aren't answered in a way AI can quote directly.",
  'Content Schema': "AI can't tell who wrote your content or when it was published.",
  'Publisher Identity Schema': "AI can't confirm who's actually behind your store.",
  'Product & Offer Schema': "AI can't reliably read your product names or prices.",
  'UCP Pricing & Stock Data': "AI can't confirm your price or whether an item's in stock before it tries to buy.",
  'Article Schema': "AI can't identify this as a real article with an author and date.",

  // Format / data density
  'Data Tables': 'Your specs and comparisons are buried in paragraphs instead of a scannable table.',
  'Tables and Specifications': 'Your specs and comparisons are buried in paragraphs instead of a scannable table.',
  'Bulleted Lists': 'Key facts are buried in long paragraphs instead of a quick list.',
  'Bullet Lists': 'Key facts are buried in long paragraphs instead of a quick list.',
  'Visual Emphasis (Bold text)': "Nothing on the page signals to AI which facts matter most.",
  'Quantitative Data Density': 'The page is light on the concrete numbers AI shoppers trust.',

  // Readability
  'Direct Q&A Structure': "Your headings don't ask and answer the questions shoppers actually have.",
  'Direct Answers': "Your headings don't ask and answer the questions shoppers actually have.",
  'Sentence and Paragraph Length': 'Sentences run long, making it hard for AI to summarize accurately.',
  'Readability Level': 'Your writing runs long, making it hard for AI to summarize accurately.',
  'Title Hierarchy (H1)': "The page's heading structure is unclear about what the main topic is.",
  'Paragraph Word Count': 'Paragraphs are too dense for AI to summarize cleanly.',

  // EEAT / trust
  'Trust Pages': "There's no easy way for AI — or a shopper — to confirm you're a real business.",
  'External Citations': "Nothing on the page backs up its claims with outside sources.",
  'Outbound Citations': "Nothing on the page backs up its claims with outside sources.",
  'Author Profiles': "There's no way to verify who wrote this.",
  'Transparency & Legal Links': 'Basic pages like About, Contact, and Privacy Policy are missing or hard to find.',
  'Author Social Footprint': 'The author has no verifiable public presence.',

  // Metadata / technical
  'Open Graph Data': 'Your store looks broken when previewed or shared by AI tools.',
  'SEO & Metadata': "This page is missing the basic details AI relies on to describe it.",
  'HTML Page Title': 'This page has no clear title telling AI what it is.',
  'Meta Description': "There's no short summary telling AI what this page is about.",
  'Open Graph Protocol': 'Your store looks broken when previewed or shared by AI tools.',
  'HTML5 Semantic Layout': "The page's structure doesn't clearly separate header, content, and footer for machines.",
  'Scraper / Bot Blocked': 'Your store is actively blocking AI shopping assistants from reading it at all.',

  // RetailAgentOS-style reasoning (pricing / eligibility / fulfillment)
  'Pricing Context Extension':
    "No reason attached to price differences — AI can't tell why your price changes by buyer or region.",
  'Eligibility Reasoning Extension':
    "AI can't tell who's actually allowed to buy what — membership tiers and restricted items aren't explained.",
  'Bulk & Quantity Constraints Extension':
    "AI doesn't know your minimum order sizes, so it can try to buy quantities you don't allow.",
  'Promotional Reasoning Extension': 'Your active sales and bundle deals are invisible to AI shoppers.',
  'Fulfillment Constraints Extension':
    "AI doesn't know where you can't ship, so it can try to send restricted items to the wrong place.",
  'RetailAgentOS Constraints': "AI has no way to check your pricing, membership, or shipping rules before trying to buy.",
};

const CATEGORY_FALLBACK: Record<AuditCategory, string> = {
  schema: "AI can't clearly read what your store sells.",
  format: 'Your content is hard for AI to scan and summarize.',
  readability: 'Your writing is hard for AI to summarize accurately.',
  eeat: "AI has no way to confirm you're a trustworthy source.",
  metadata: 'Basic technical details AI relies on are missing.',
  retailagentos: 'AI has no way to check your pricing or policy rules before trying to buy.',
};

/** Translate a technical check name into HOMEPAGE-COPY-style plain language. */
export function translateCheck(item: Pick<AuditItem, 'name' | 'category'>): string {
  return CHECK_GLOSSARY[item.name] ?? CATEGORY_FALLBACK[item.category];
}

function pct(score: number, max: number): number {
  return max > 0 ? score / max : 0;
}

/**
 * Compute the readiness level + top blockers for a completed analysis.
 * Ladder logic (deliberately simple and explainable):
 *   - Level 0: the store isn't reliably discoverable/parseable yet
 *     (average of schema/format/readability/eeat/metadata < 50%).
 *   - Level 1: discoverable, but fewer than 2 of the 5 RetailAgentOS-style
 *     reasoning checks (pricing, eligibility, bulk, promo, fulfillment) pass.
 *   - Level 2: discoverable and at least 2 (but not all 5) reasoning checks pass —
 *     some rules are answered correctly, not all.
 *   - Level 3: all 5 reasoning checks pass — full price/eligibility/fulfillment
 *     integrity. This is the highest level a single-store scan can award;
 *     Level 4 is a platform property (see LEVEL_4_NOTE).
 */
export function assessReadiness(result: AeoResult): ReadinessAssessment {
  const discoverabilityPct =
    DISCOVERABILITY_CATEGORIES.reduce((sum, cat) => sum + pct(result.categories[cat].score, result.categories[cat].max), 0) /
    DISCOVERABILITY_CATEGORIES.length;

  const reasoningAudits = result.audit.filter((a) => a.category === 'retailagentos');
  const reasoningTotal = reasoningAudits.length || 5;
  const reasoningPassCount = reasoningAudits.filter((a) => a.status === 'pass').length;

  let levelId: 0 | 1 | 2 | 3;
  if (discoverabilityPct < 0.5) {
    levelId = 0;
  } else if (reasoningPassCount < 2) {
    levelId = 1;
  } else if (reasoningPassCount < reasoningTotal) {
    levelId = 2;
  } else {
    levelId = 3;
  }

  const failing = result.audit.filter((a) => a.status !== 'pass');
  const sorted = [...failing].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'fail' ? -1 : 1;
    return (BLOCKER_CATEGORY_PRIORITY[a.category] ?? 9) - (BLOCKER_CATEGORY_PRIORITY[b.category] ?? 9);
  });

  const topBlockers: Blocker[] = sorted.slice(0, 3).map((a) => ({
    name: a.name,
    category: a.category,
    plain: translateCheck(a),
    technical: a.message,
  }));

  return {
    level: READINESS_LEVELS[levelId],
    score: result.score,
    discoverabilityPct,
    reasoningPassCount,
    reasoningTotal,
    topBlockers,
  };
}
