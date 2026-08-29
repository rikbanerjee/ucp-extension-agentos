/**
 * Retailer Readiness Studio — core types.
 *
 * These types are deliberately independent of the pilot-specific fixtures
 * elsewhere in the repo. Everything here is browser-only, session-scoped,
 * and pure: no I/O, no Date.now(), no Math.random() outside of the one
 * "generatedAt" timestamp captured once per analysis (see downloads.ts).
 *
 * See AGENTS.md "Retailer Readiness Studio" section for the product
 * principle this module exists to serve: simplicity for retailers and
 * executives is a product requirement.
 */

export type CatalogImportSource = 'shopify-csv' | 'generic-csv' | 'generic-json' | 'sample';
export type ReadinessAudience = 'boutique' | 'enterprise' | 'direct';

export type ReadinessLayer = 'catalog' | 'ucp' | 'raos';

export type ReadinessStatus =
  | 'ready'
  | 'needs_input'
  | 'ready_to_implement'
  | 'needs_platform_installation'
  | 'needs_live_verification'
  | 'not_applicable';

export type FindingSeverity = 'blocking' | 'warning' | 'information';

export type FindingOwner =
  | 'retail_sme'
  | 'product_operations'
  | 'site_admin'
  | 'platform'
  | 'developer';

/** A canonical, normalized catalog row — the single shape every import source converges on. */
export interface CanonicalCatalogRow {
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  description?: string;
  category?: string;
  price: number;
  currency: string;
  inventoryQuantity?: number;
  availability?: string;
  tags?: string[];
  imageUrl?: string;
  sourceRowNumber: number;
  /** True when productId/variantId/sku were deterministically generated (source lacked one). */
  generatedIds?: boolean;
}

export interface ReadinessFinding {
  id: string;
  layer: ReadinessLayer;
  status: ReadinessStatus;
  severity: FindingSeverity;
  title: string;
  explanation: string;
  nextAction: string;
  owner: FindingOwner;
  affectedVariantIds?: string[];
  /** Affected source row numbers, for import/validation findings. */
  affectedRows?: number[];
}

// ---------------------------------------------------------------------------
// Import / validation
// ---------------------------------------------------------------------------

export interface ImportWarning {
  id: string;
  message: string;
  rows?: number[];
}

export interface ImportResult {
  source: CatalogImportSource;
  rows: CanonicalCatalogRow[];
  /** Findings that MUST be fixed before continuing (missing required fields, dup IDs, etc). */
  blocking: ReadinessFinding[];
  /** Findings that can be reviewed but do not block continuing. */
  warnings: ReadinessFinding[];
  /** Rows present in the source file that could not be normalized at all. */
  unparsedRowCount: number;
}

// ---------------------------------------------------------------------------
// Store profile (Step 3)
// ---------------------------------------------------------------------------

export type FulfillmentModeId = 'shipping' | 'pickup' | 'local_delivery';

export interface StoreProfile {
  storeName: string;
  storeDomain: string;
  currency: string;
  timezone: string;
  regions: string[];
  fulfillmentModes: FulfillmentModeId[];
  catalogEndpoint?: string;
  cartEndpoint?: string;
  checkoutEndpoint?: string;
}

// ---------------------------------------------------------------------------
// Store-wide rule defaults (Step 4)
// ---------------------------------------------------------------------------

export type BuyerEligibilityMode = 'everyone' | 'members' | 'wholesale';

export interface RetailerRuleDefaults {
  // Who can buy
  eligibility: {
    mode: BuyerEligibilityMode;
    restrictToServedRegions: boolean;
  };
  // What should they pay
  pricing: {
    memberDiscountPercent?: number;
    wholesaleDiscountPercent?: number;
    minimumQuantity?: number;
    quantityIncrement?: number;
    callForPrice: boolean;
  };
  // Is it available
  inventory: {
    useImportedInventory: boolean;
    defaultAvailability: 'in_stock' | 'out_of_stock';
    freshnessNote: string;
    /**
     * How long imported inventory data may be treated as current before the
     * engine emits STOCK_STALE — wired to `Variant.inventory.dataTtlSeconds`.
     * Default mirrors the engine's own default (60s per RAOS-0008 guidance)
     * only when the retailer hasn't set an expectation; the Studio default
     * below is a more realistic "checked hourly" starting point.
     */
    freshnessSeconds: number;
  };
  // Can it be fulfilled
  fulfillment: {
    modes: FulfillmentModeId[];
    regions: string[];
    leadTimeDays?: number;
    cutoffHourLocal?: number;
    weeklySchedule?: { day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'; opensAt: string; closesAt: string }[];
    orderAcceptanceBufferMinutes?: number;
  };
  // How long is the answer valid
  quote: {
    validitySeconds: number;
  };
}

export const DEFAULT_RULE_DEFAULTS: RetailerRuleDefaults = {
  eligibility: { mode: 'everyone', restrictToServedRegions: true },
  pricing: {
    memberDiscountPercent: undefined,
    wholesaleDiscountPercent: undefined,
    minimumQuantity: undefined,
    quantityIncrement: undefined,
    callForPrice: false,
  },
  inventory: {
    useImportedInventory: true,
    defaultAvailability: 'in_stock',
    freshnessNote: 'Inventory imported from your catalog file.',
    freshnessSeconds: 3600,
  },
  fulfillment: {
    modes: ['shipping'],
    regions: ['US'],
    leadTimeDays: undefined,
    cutoffHourLocal: undefined,
  },
  quote: { validitySeconds: 900 },
};

/** Only values that differ from the store default for this product/variant. */
export interface ProductRuleOverride {
  productId: string;
  variantId?: string;
  eligibilityMode?: BuyerEligibilityMode;
  memberPrice?: number;
  wholesalePrice?: number;
  minimumQuantity?: number;
  quantityIncrement?: number;
  availability?: 'in_stock' | 'out_of_stock';
  fulfillmentModes?: FulfillmentModeId[];
  fulfillmentRegions?: string[];
  leadTimeDays?: number;
  callForPrice?: boolean;
}

// ---------------------------------------------------------------------------
// Shopper scenario preview (Step 6)
// ---------------------------------------------------------------------------

export interface ShopperScenario {
  productVariantKey: string; // `${productId}::${variantId}`
  customerType: 'guest' | 'member' | 'wholesale';
  marketRegion: string;
  quantity: number;
  fulfillmentMode: FulfillmentModeId;
  /**
   * The order's local date + time, 'datetime-local' shaped ('YYYY-MM-DD' /
   * 'HH:mm'), interpreted in the STORE's timezone. This is the explicit
   * `now` the preview evaluates against — required so cutoff, weekly
   * schedule and order-acceptance-buffer checks are actually reachable
   * (they are all no-ops at `now: 0`, which is 1970-01-01 UTC).
   */
  orderDate: string;
  orderTime: string;
  needByDate?: string;
  /** Optional exact need-by time, paired with needByDate to build needByAt. */
  needByTime?: string;
}

// ---------------------------------------------------------------------------
// Readiness result
// ---------------------------------------------------------------------------

export interface UcpReadinessResult {
  status: ReadinessStatus;
  findings: ReadinessFinding[];
}

export interface RaosReadinessResult {
  status: ReadinessStatus;
  findings: ReadinessFinding[];
}

export interface LayeredReadinessResult {
  catalog: ReadinessFinding[];
  ucp: UcpReadinessResult;
  raos: RaosReadinessResult;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Full session state — the single source of truth the wizard operates on
// ---------------------------------------------------------------------------

export interface StudioSession {
  importResult: ImportResult | null;
  storeProfile: StoreProfile | null;
  ruleDefaults: RetailerRuleDefaults;
  overrides: ProductRuleOverride[];
  scenario: ShopperScenario | null;
}

export const DEFAULT_STORE_PROFILE: StoreProfile = {
  storeName: '',
  storeDomain: '',
  currency: 'USD',
  timezone: 'America/New_York',
  regions: ['US'],
  fulfillmentModes: ['shipping'],
};
