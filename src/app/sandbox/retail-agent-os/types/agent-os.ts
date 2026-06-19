export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'BACKORDERED' | 'MADE_TO_ORDER' | 'OUT_OF_STOCK';
export type IntentAction = 'add_to_cart' | 'request_quote' | 'contact_sales' | 'configure_custom';

export interface InventoryState {
  status: InventoryStatus;
  leadTimeDays?: number;
  guaranteedDeliveryBy?: string;
  perishability?: 'high' | 'medium' | 'none';
}

export interface ProductRelations {
  requires?: string[]; // Array of product IDs that MUST be bought with this
  suggests?: string[]; // Array of recommended add-ons
  isCompatibleWith?: string[]; // Array of system IDs this works with
}

export interface IntentRouting {
  action: IntentAction;
  primaryChannel?: 'web_checkout' | 'whatsapp' | 'email_quote';
  requiredInputs?: string[]; // e.g. ['tax_id', 'custom_text', 'logo_file']
}

export interface ReturnPolicy {
  isFinalSale: boolean;
  returnWindowDays?: number;
  restockingFeePercent?: number;
  conditionRequirements?: string[];
}

export interface FulfillmentPromises {
  coldChainRequired: boolean;
  maxTransitHours?: number;
  supportedRegions: string[];
}

// Base product interface mapped to these extensions
export interface SandboxProduct {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  currency: string;
  extensions: {
    inventory_state?: InventoryState;
    product_relations?: ProductRelations;
    intent_routing?: IntentRouting;
    return_policy?: ReturnPolicy;
    fulfillment_promises?: FulfillmentPromises;
  };
}
