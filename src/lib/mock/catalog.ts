import { Product } from '../types/core';

export const mockProducts: Product[] = [
  {
    id: 'p_b_001',
    merchantId: 'm_boutique_001',
    title: 'Personalized T-Shirt',
    description: 'Customizable 100% organic cotton tee with your choice of embroidered initials.',
    category: 'Apparel',
    variants: [
      {
        id: 'v_b_001_1',
        sku: 'TEE-PRSNL-BLK-M',
        title: 'Black / Medium',
        basePrice: 45.00,
        currency: 'USD'
      }
    ]
  },
  {
    id: 'p_b_002',
    merchantId: 'm_boutique_001',
    title: 'Classic Graphic T-Shirt',
    description: 'Everyday comfortable cotton tee featuring our signature logo.',
    category: 'Apparel',
    variants: [
      {
        id: 'v_b_002_1',
        sku: 'TEE-GRA-WHT-L',
        title: 'White / Large',
        basePrice: 25.00,
        currency: 'USD'
      }
    ]
  },
  {
    id: 'p_b_003',
    merchantId: 'm_boutique_001',
    title: 'Ceramic Coffee Mug',
    description: 'Minimalist 12oz ceramic mug with a matte finish.',
    category: 'Accessories',
    variants: [
      {
        id: 'v_b_003_1',
        sku: 'MUG-CER-MATTE',
        title: 'Matte Grey',
        basePrice: 18.00,
        currency: 'USD'
      }
    ]
  },
  {
    id: 'p_b_004',
    merchantId: 'm_boutique_001',
    title: 'Insulated Travel Mug',
    description: 'Double-walled stainless steel travel mug. Keeps drinks hot for 12 hours.',
    category: 'Accessories',
    variants: [
      {
        id: 'v_b_004_1',
        sku: 'MUG-TRV-STL',
        title: 'Brushed Steel',
        basePrice: 32.00,
        currency: 'USD'
      }
    ]
  },
  {
    id: 'p_w_001',
    merchantId: 'm_wholesale_002',
    title: 'Industrial Coffee Beans (Wholesale Case)',
    description: 'Premium roasted coffee beans packed in wholesale cases.',
    category: 'Beverage',
    variants: [
      {
        id: 'v_w_001_1',
        sku: 'COFFEE-CASE-50',
        title: '50lb Case',
        basePrice: 400.00,
        currency: 'USD',
        eligibilityRules: {
          hideFromGuests: true,
          requireWholesale: true
        },
        bulkPricing: {
          available: true,
          moq: 10,
          quantityIncrement: 5,
          tiers: [
            { minQuantity: 10, maxQuantity: 49, price: 380.00 },
            { minQuantity: 50, maxQuantity: 99, price: 350.00 },
            { minQuantity: 100, price: 310.00 }
          ]
        }
      }
    ]
  },
  {
    id: 'p_w_002',
    merchantId: 'm_wholesale_002',
    title: 'Ceramic Mugs (Pallet)',
    description: 'Standard white ceramic mugs for cafes, sold by the pallet.',
    category: 'Equipment',
    variants: [
      {
        id: 'v_w_002_1',
        sku: 'MUG-WHT-PALLET',
        title: 'Pallet (500 units)',
        basePrice: 1200.00,
        currency: 'USD',
        eligibilityRules: {
          hideFromGuests: false,
          requireWholesale: true,
          requiredTier: 'reseller_plus'
        },
        bulkPricing: {
          available: true,
          moq: 2,
          quantityIncrement: 1,
          tiers: [
            { minQuantity: 2, maxQuantity: 4, price: 1100.00 },
            { minQuantity: 5, price: 950.00 }
          ]
        }
      }
    ]
  },
  {
    id: 'p_w_003',
    merchantId: 'm_wholesale_002',
    title: 'Commercial Espresso Machine',
    description: 'High-end commercial espresso machine requiring certified installation.',
    category: 'Equipment',
    variants: [
      {
        id: 'v_w_003_1',
        sku: 'ESPRESSO-COM-01',
        title: 'Standard Edition',
        basePrice: 8500.00,
        currency: 'USD',
        eligibilityRules: {
          hideFromGuests: true,
          requireWholesale: true,
          requireResaleCertificate: true
        },
        bulkPricing: {
          available: false
        }
      }
    ]
  },
  {
    id: 'p_g_001',
    merchantId: 'm_grocery_003',
    title: 'Honey Nut Cereal',
    description: 'Family size honey nut cereal.',
    category: 'Pantry',
    variants: [
      {
        id: 'v_g_001_1',
        sku: 'CEREAL-HONEY-FAM',
        title: 'Family Size',
        basePrice: 5.50,
        currency: 'USD',
        promoPricing: {
          available: true,
          salePrice: 4.00,
          description: 'Weekly Ad: Cereal Sale'
        }
      }
    ]
  },
  {
    id: 'p_g_002',
    merchantId: 'm_grocery_003',
    title: 'Sparkling Water 12-Pack',
    description: 'Refreshing lemon sparkling water.',
    category: 'Beverage',
    variants: [
      {
        id: 'v_g_002_1',
        sku: 'SPARKLING-LEMON-12',
        title: 'Lemon',
        basePrice: 6.99,
        currency: 'USD',
        promoPricing: {
          available: true,
          description: 'Mix & Match: Buy 3+ for $5 each',
          tiers: [
            { minQuantity: 3, promoPrice: 5.00, description: 'Buy 3+ for $5.00 each' }
          ]
        }
      }
    ]
  },
  {
    id: 'p_g_003',
    merchantId: 'm_grocery_003',
    title: 'Fresh Organic Bananas',
    description: 'Bunch of 5-6 organic bananas.',
    category: 'Produce',
    variants: [
      {
        id: 'v_g_003_1',
        sku: 'BANANA-ORG-BUNCH',
        title: 'Standard Bunch',
        basePrice: 2.50,
        currency: 'USD',
        fulfillmentConstraints: {
          availableModes: ['pickup', 'local_delivery'],
          restrictedRegions: ['HI', 'AK']
        }
      }
    ]
  }
];
