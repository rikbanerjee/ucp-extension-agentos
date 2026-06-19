/**
 * Reference Cookbook — Recipe Registry
 *
 * All recipes are pure data + run functions with zero React deps.
 * The UI layer imports this registry and renders generically.
 */

import type { DecisionRecord } from '@/lib/extensions/pipeline';
import type { QuoteToken, QuoteValidationResult } from '@/lib/types/quote';
import type { MerchantTraceRow, BuyerTraceView } from '@/lib/trace/types';
import type { PartialBuyerContext } from '@/lib/types/context';

// ---------------------------------------------------------------------------
// Control definition types
// ---------------------------------------------------------------------------

export interface SelectOption {
  value: string;
  label: string;
}

export type ControlDef =
  | { id: string; label: string; type: 'select'; options: SelectOption[]; defaultValue: string }
  | { id: string; label: string; type: 'toggle'; defaultValue: boolean }
  | { id: string; label: string; type: 'number'; min: number; max: number; step: number; defaultValue: number };

// ---------------------------------------------------------------------------
// Recipe result — union of all possible recipe outputs
// ---------------------------------------------------------------------------

export interface RecipeResult {
  /** The raw DecisionRecord from evaluateOffer, if applicable. */
  decisionRecord?: DecisionRecord;
  /**
   * The context as supplied to evaluateOffer (before normalization). When
   * present, NormalizedContextCard uses this to highlight fields that were
   * downgraded by the §7.2 trust enforcement — i.e. where the requested value
   * differs from record.normalizedContext.
   */
  requestedContext?: PartialBuyerContext;
  /** Issued quote token, if applicable (0007). */
  quote?: QuoteToken | null;
  /** Quote validation result, if applicable (0007). */
  validation?: QuoteValidationResult;
  /** Merchant trace rows (0013). */
  merchantTrace?: MerchantTraceRow[];
  /** Buyer trace view (0013). */
  buyerTrace?: BuyerTraceView;
  /** Developer trace JSON string (0013). */
  developerTrace?: string;
  /** Free-form summary line for quick scanning. */
  summary: string;
}

// ---------------------------------------------------------------------------
// Recipe interface
// ---------------------------------------------------------------------------

export interface Recipe {
  id: string;
  specRef: string;
  title: string;
  specPageHref: string;
  whatThisProves: string;
  /** Minimal implementation pattern shown to the user — copy-pasteable. */
  shownSource: string;
  controls: ControlDef[];
  /** Pure run function — takes control values, returns live result. */
  run: (controlValues: Record<string, unknown>) => RecipeResult;
}

// ---------------------------------------------------------------------------
// Import and export all recipes
// ---------------------------------------------------------------------------

import { recipe as recipe0000 } from './0000-foundations';
import { recipe as recipe0001 } from './0001-eligibility';
import { recipe as recipe0002 } from './0002-pricing';
import { recipe as recipe0005 } from './0005-inventory';
import { recipe as recipe0007 } from './0007-quote';
import { recipe as recipe0008 } from './0008-trust';
import { recipe as recipe0013 } from './0013-trace';

export const RECIPES: Recipe[] = [
  recipe0000,
  recipe0001,
  recipe0002,
  recipe0005,
  recipe0007,
  recipe0008,
  recipe0013,
];

export const RECIPE_MAP: Record<string, Recipe> = Object.fromEntries(
  RECIPES.map(r => [r.id, r]),
);
