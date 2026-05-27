import { MerchantProfile } from '../types/core';

const coreCapabilities = [
  {
    id: 'ucp.catalog.discovery',
    name: 'Catalog Discovery',
    version: '1.0.0',
    description: 'Core UCP catalog browsing and search.'
  },
  {
    id: 'ucp.cart.management',
    name: 'Cart Management',
    version: '1.0.0',
    description: 'Core UCP cart lifecycle operations.'
  },
  {
    id: 'ucp.checkout.init',
    name: 'Checkout Initialization',
    version: '1.0.0',
    description: 'Core UCP checkout handoff.'
  }
];

const vendorExtensions = [
  {
    id: 'ext.pricing_context',
    name: 'Pricing Context',
    version: '1.2.0',
    namespace: 'com.ezyupload.shopping.pricing_context',
    description: 'Provides customer context to influence catalog visibility and pricing.',
    required: true
  },
  {
    id: 'ext.eligibility',
    name: 'Eligibility Rules',
    version: '1.1.0',
    namespace: 'com.ezyupload.shopping.eligibility',
    description: 'Calculates product and cart-level eligibility reasoning.',
    required: true
  },
  {
    id: 'ext.member_pricing',
    name: 'Member Pricing',
    version: '1.0.0',
    namespace: 'com.ezyupload.shopping.member_pricing',
    description: 'Supports member-exclusive teasing and locked pricing.',
    required: false
  },
  {
    id: 'ext.bulk_pricing',
    name: 'Bulk Pricing & MOQ',
    version: '1.3.0',
    namespace: 'com.ezyupload.shopping.bulk_pricing',
    description: 'Handles MOQ, quantity increments, and volume-based price tiers.',
    required: false
  },
  {
    id: 'ext.loyalty',
    name: 'Loyalty Preview',
    version: '0.9.0',
    namespace: 'com.ezyupload.shopping.loyalty',
    description: 'Preview earn/burn mechanics (Future).',
    required: false
  },
  {
    id: 'ext.intent_capture',
    name: 'Intent Capture',
    version: '0.8.0',
    namespace: 'com.ezyupload.shopping.intent_capture',
    description: 'Capture intent for out of stock or B2B negotiation (Future).',
    required: false
  },
  {
    id: 'ext.promo_pricing',
    name: 'Promotional Pricing',
    version: '1.0.0',
    namespace: 'com.ezyupload.shopping.promo_pricing',
    description: 'Supports sale pricing, mix-and-match, and quantity promo tiers.',
    required: false
  },
  {
    id: 'ext.fulfillment_constraints',
    name: 'Fulfillment Constraints',
    version: '1.0.0',
    namespace: 'com.ezyupload.shopping.fulfillment_constraints',
    description: 'Complex constraint solving for shipping/pickup modes and regional availability.',
    required: false
  }
];

export const mockMerchants: MerchantProfile[] = [
  {
    merchantId: 'm_boutique_001',
    merchantName: 'Boutique A',
    protocolVersion: '1.0.0-draft',
    endpoints: {
      catalog: 'https://api.boutique-a.test/ucp/catalog',
      cart: 'https://api.boutique-a.test/ucp/cart',
      checkout: 'https://api.boutique-a.test/ucp/checkout'
    },
    capabilities: coreCapabilities,
    extensions: vendorExtensions.filter(ext => ['ext.pricing_context', 'ext.eligibility'].includes(ext.id))
  },
  {
    merchantId: 'm_wholesale_002',
    merchantName: 'Wholesale B',
    protocolVersion: '1.0.0-draft',
    endpoints: {
      catalog: 'https://api.wholesale-b.test/ucp/catalog',
      cart: 'https://api.wholesale-b.test/ucp/cart',
      checkout: 'https://api.wholesale-b.test/ucp/checkout'
    },
    capabilities: coreCapabilities,
    extensions: vendorExtensions.filter(ext => ['ext.pricing_context', 'ext.eligibility', 'ext.bulk_pricing'].includes(ext.id))
  },
  {
    merchantId: 'm_grocery_003',
    merchantName: 'Grocery Retail C',
    protocolVersion: '1.0.0-draft',
    endpoints: {
      catalog: 'https://api.grocery-c.test/ucp/catalog',
      cart: 'https://api.grocery-c.test/ucp/cart',
      checkout: 'https://api.grocery-c.test/ucp/checkout'
    },
    capabilities: coreCapabilities,
    extensions: vendorExtensions.filter(ext => ['ext.pricing_context', 'ext.eligibility', 'ext.promo_pricing', 'ext.fulfillment_constraints'].includes(ext.id))
  }
];
