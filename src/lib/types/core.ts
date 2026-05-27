export interface UcpCapability {
  id: string;
  name: string;
  version: string;
  description: string;
}

export interface UcpExtension {
  id: string;
  name: string;
  version: string;
  namespace: string;
  description: string;
  required: boolean;
}

export interface MerchantProfile {
  merchantId: string;
  merchantName: string;
  protocolVersion: string;
  endpoints: {
    catalog: string;
    cart: string;
    checkout: string;
  };
  capabilities: UcpCapability[];
  extensions: UcpExtension[];
}

export interface Product {
  id: string;
  merchantId: string;
  title: string;
  description: string;
  category: string;
  variants: Variant[];
}

// Forward reference for variant extensions
import { MemberPricing, BulkPricing, EligibilityRules, PromoPricing, FulfillmentConstraints } from './extensions';

export interface Variant {
  id: string;
  sku: string;
  title: string;
  basePrice: number;
  currency: string;
  // Extensibility points
  memberPricing?: MemberPricing;
  bulkPricing?: BulkPricing;
  eligibilityRules?: EligibilityRules;
  promoPricing?: PromoPricing;
  fulfillmentConstraints?: FulfillmentConstraints;
}

export interface CartLine {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
}
