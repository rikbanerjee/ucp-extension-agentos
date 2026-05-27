import { CartLine } from './core';

export type CustomerType = 'guest' | 'member' | 'wholesale' | 'b2b';
export type MembershipTier = 'none' | 'gold' | 'reseller_plus' | 'distributor';
export type FulfillmentMode = 'shipping' | 'pickup' | 'local_delivery';

// The active context modifying rules
export interface PricingContext {
  customerType: CustomerType;
  membershipTier: MembershipTier;
  marketRegion: string;
  fulfillmentMode: FulfillmentMode;
  accountLinked: boolean;
  taxExempt: boolean;
  resaleCertificateOnFile: boolean;
  activeExtensions: string[];
}

// Requirements & Rules (Input configs)
export interface EligibilityRules {
  hideFromGuests?: boolean;
  requireWholesale?: boolean;
  requiredTier?: MembershipTier;
  requireResaleCertificate?: boolean;
}

export interface Requirement {
  type: 'customer_type' | 'membership_tier' | 'tax_exempt' | 'resale_certificate' | 'moq' | 'quantity_increment';
  value: any;
  message?: string;
}

export interface PriceTier {
  minQuantity: number;
  maxQuantity?: number;
  price: number;
}

export interface MemberPricing {
  available: boolean;
  teaserPrice?: number;
  memberPrice?: number;
  requiredTier?: MembershipTier;
}

export interface BulkPricing {
  available: boolean;
  tiers?: PriceTier[];
  moq?: number;
  quantityIncrement?: number;
}

export interface FulfillmentConstraints {
  availableModes?: FulfillmentMode[];
  restrictedRegions?: string[]; // e.g., states or country codes where it cannot be sold
}

export interface PromoTier {
  minQuantity: number;
  promoPrice: number; // e.g., $2.50 each if you buy 2
  description?: string;
}

export interface PromoPricing {
  available: boolean;
  salePrice?: number; // simple markdown
  tiers?: PromoTier[]; // quantity-based promos
  description?: string; // e.g., "Weekly Ad Sale"
}

// Computed Output Contracts (UI-ready)

export interface EligibilityReason {
  code: string;
  message: string;
  blocking: boolean;
  requirements?: Requirement[];
}

export interface ComputedVisibility {
  status: 'VISIBLE' | 'HIDDEN';
  reason?: string;
}

export interface ComputedEligibility {
  status: 'ELIGIBLE' | 'CONDITIONAL' | 'BLOCKED';
  reasons: EligibilityReason[];
}

export interface ComputedPriceState {
  unitPrice: number;
  isMemberPrice: boolean;
  appliedTier?: PriceTier | PromoTier;
  priceSource: 'base' | 'member' | 'bulk_tier' | 'promo_sale' | 'promo_tier';
  appliedOfferState?: string;
  teaser?: {
    message: string;
    price: number;
  };
}

export interface CartValidationResult {
  valid: boolean;
  lines: {
    lineId: string;
    valid: boolean;
    unitPrice: number;
    lineTotal: number;
    eligibility: ComputedEligibility;
    appliedTier?: PriceTier | PromoTier;
    priceSource: 'base' | 'member' | 'bulk_tier' | 'promo_sale' | 'promo_tier';
    appliedOfferState?: string;
    messages: string[];
  }[];
  cartTotal: number;
  messages: string[];
}
