/**
 * AEO/GEO Scorer — shared types.
 *
 * These types live in src/lib/aeo/ and are entirely independent of the RAOS
 * engine (src/lib/rules, src/lib/extensions, src/lib/types). Do NOT import
 * from the RAOS engine here; the AEO analyzer is a separate concern.
 */

export type AuditStatus = 'pass' | 'warn' | 'fail';

export type AuditCategory =
  | 'schema'
  | 'format'
  | 'readability'
  | 'eeat'
  | 'metadata'
  | 'retailagentos';

export interface AuditItem {
  category: AuditCategory;
  status: AuditStatus;
  name: string;
  message: string;
  /** Present on 'fail' items that have a recommended fix. */
  fix: string | null;
  /** Present on RetailAgentOS checkout failure items. */
  agentFailureExplanation?: string;
}

export interface CategoryScore {
  score: number;
  max: number;
  name: string;
}

export interface EngineCompatibility {
  score: number;
  status: 'Excellent' | 'Good' | 'Moderate' | 'Needs Work';
  details: string;
}

export interface AeoResult {
  url: string;
  siteName: string;
  score: number;
  grade: string;
  /** Set to true when the site returned a WAF/firewall block. */
  isBlocked?: boolean;
  categories: {
    schema: CategoryScore;
    format: CategoryScore;
    readability: CategoryScore;
    eeat: CategoryScore;
    metadata: CategoryScore;
    retailagentos: CategoryScore;
  };
  audit: AuditItem[];
  engineCompatibility: {
    perplexity: EngineCompatibility;
    gemini: EngineCompatibility;
    chatgpt: EngineCompatibility;
    sge: EngineCompatibility;
    ucp: EngineCompatibility;
  };
  /** Simulated LLM scraper digest text. */
  llmView: string;
}
