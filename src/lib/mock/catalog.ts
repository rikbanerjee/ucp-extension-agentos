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
        },
        // RAOS-0007: Wholesale strict policy — requote on expiry, reject on stock loss.
        quoteConfig: {
          ttlSeconds: 600,
          honorPolicy: {
            onExpiry: 'requote',
            onStockLoss: 'reject',
            onContextChange: 'requote',
          },
        },
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
  },

  // -------------------------------------------------------------------------
  // WP-05 / RAOS-0005 additions — inventory variants covering every reason code
  // -------------------------------------------------------------------------

  // --- Sara's Boutique: Preorder (PREORDER_NOT_YET_BUYABLE) ---
  {
    // Upcoming collection drop — visible, preorder, not yet buyable.
    // Sara's Boutique archetype: preorder (next collection) — §5 scenario matrix.
    id: 'p_b_inv_001',
    merchantId: 'm_boutique_001',
    title: 'Spring 2027 Collection Tee (Preorder)',
    description: 'Limited release from our upcoming Spring 2027 collection. Pre-order now — ships on release date.',
    category: 'Apparel',
    variants: [
      {
        id: 'v_b_inv_001_1',
        sku: 'TEE-SPR27-PREORDER',
        title: 'Natural / Small',
        basePrice: 55.00,
        currency: 'USD',
        inventory: {
          state: 'preorder',
          preorderReleaseDate: '2027-03-01',
          reservationPolicy: 'soft_hold',
          reservationTtlSeconds: 900,
          dataTtlSeconds: 3600,
        },
      },
    ],
  },
  {
    // Low-stock urgency on a one-off item — Sara's Boutique archetype.
    // LOW_STOCK: only 3 units left.
    id: 'p_b_inv_002',
    merchantId: 'm_boutique_001',
    title: 'Hand-Stitched Leather Wallet (Last 3)',
    description: 'Artisan wallet — only 3 remaining. Replenishment unlikely.',
    category: 'Accessories',
    variants: [
      {
        id: 'v_b_inv_002_1',
        sku: 'WALLET-LTHR-LAST3',
        title: 'Tan / Standard',
        basePrice: 85.00,
        currency: 'USD',
        inventory: {
          state: 'low_stock',
          quantityAvailable: 3,
          lowStockThreshold: 5,
          reservationPolicy: 'soft_hold',
          reservationTtlSeconds: 900,
          dataTtlSeconds: 60,
        },
      },
    ],
  },

  // --- Atlas Wholesale: Backorder with ETA (BACKORDER_AVAILABLE) ---
  {
    // Wholesale backorder scenario — Atlas Wholesale archetype (§5 matrix).
    // Reservation expiry on a large order: soft_hold with 900s TTL.
    id: 'p_w_inv_001',
    merchantId: 'm_wholesale_002',
    title: 'Industrial Paper Napkins (Bulk — Backorder)',
    description: 'High-volume napkins currently on backorder due to supplier delay. Order now, ships on ETA.',
    category: 'Equipment',
    variants: [
      {
        id: 'v_w_inv_001_1',
        sku: 'NAPKIN-BULK-BACKORDER',
        title: 'Case of 2000',
        basePrice: 65.00,
        currency: 'USD',
        eligibilityRules: {
          hideFromGuests: true,
          requireWholesale: true,
        },
        inventory: {
          state: 'backorder',
          backorderEta: '2026-08-15',
          reservationPolicy: 'soft_hold',
          reservationTtlSeconds: 1800,
          dataTtlSeconds: 120,
        },
      },
    ],
  },
  {
    // Hard OOS wholesale item — OUT_OF_STOCK, no ETA, notify-me resolution.
    id: 'p_w_inv_002',
    merchantId: 'm_wholesale_002',
    title: 'Commercial Blender (Out of Stock)',
    description: 'Heavy-duty commercial blender — currently sold out with no estimated restock.',
    category: 'Equipment',
    variants: [
      {
        id: 'v_w_inv_002_1',
        sku: 'BLENDER-COM-OOS',
        title: 'Standard 2L',
        basePrice: 450.00,
        currency: 'USD',
        eligibilityRules: {
          hideFromGuests: true,
          requireWholesale: true,
        },
        inventory: {
          state: 'out_of_stock',
          reservationPolicy: 'none',
          dataTtlSeconds: 300,
        },
      },
    ],
  },

  // --- Fresh Corner Market: per-location BOPIS + race scenario ---
  {
    // Per-location stock split: store A has it, store B doesn't.
    // LOCATION_OUT_OF_STOCK (CONDITION) when buyer selects pickup.
    // Two-agents-one-unit race scenario: reservationPolicy='soft_hold', TTL=900s.
    // Fresh Corner Market — §5 matrix: per-store stock (BOPIS).
    id: 'p_g_inv_001',
    merchantId: 'm_grocery_003',
    title: 'Artisan Sourdough Bread',
    description: 'Freshly baked sourdough — available at select store locations only.',
    category: 'Bakery',
    variants: [
      {
        id: 'v_g_inv_001_1',
        sku: 'BREAD-SOURDOUGH-LOCAL',
        title: '900g Loaf',
        basePrice: 8.50,
        currency: 'USD',
        inventory: {
          state: 'in_stock',
          quantityAvailable: 4,
          lowStockThreshold: 3,
          perLocation: [
            { locationId: 'store_A', quantity: 4 },
            { locationId: 'store_B', quantity: 0 },
          ],
          reservationPolicy: 'soft_hold',
          reservationTtlSeconds: 900,
          dataTtlSeconds: 60,
        },
      },
    ],
  },
  {
    // Stale freshness test: dataFetchedAt is set to a past timestamp in tests,
    // but in the mock catalog we set it to a relative offset via dataTtlSeconds=1
    // so a reasonable now (> 1s after page load) will trigger STOCK_STALE.
    // Used in golden fixtures and the "stale data" playground scenario.
    // Setting dataFetchedAt=1000 (Unix ms=1s after epoch) forces staleness for
    // any now > 61000 (which is always true in real use). This is intentional.
    id: 'p_g_inv_002',
    merchantId: 'm_grocery_003',
    title: 'Farm Eggs (Stale Data Demo)',
    description: 'Free-range eggs — inventory data intentionally stale for demo purposes.',
    category: 'Dairy',
    variants: [
      {
        id: 'v_g_inv_002_1',
        sku: 'EGGS-FREERANGE-STALE',
        title: 'Dozen',
        basePrice: 6.99,
        currency: 'USD',
        inventory: {
          state: 'in_stock',
          quantityAvailable: 20,
          reservationPolicy: 'none',
          // dataFetchedAt=1000 ms (1s past epoch) → always stale for any realistic now
          dataFetchedAt: 1000,
          dataTtlSeconds: 60,
        },
      },
    ],
  },
  {
    // In-stock grocery item at both locations — control variant for BOPIS test.
    // Demonstrates that per-location data with ALL locations stocked
    // does NOT emit LOCATION_OUT_OF_STOCK.
    id: 'p_g_inv_003',
    merchantId: 'm_grocery_003',
    title: 'Whole Milk (Both Locations)',
    description: 'Organic whole milk — available at all store locations.',
    category: 'Dairy',
    variants: [
      {
        id: 'v_g_inv_003_1',
        sku: 'MILK-ORG-BOTH-LOC',
        title: 'Half Gallon',
        basePrice: 4.99,
        currency: 'USD',
        inventory: {
          state: 'in_stock',
          quantityAvailable: 12,
          perLocation: [
            { locationId: 'store_A', quantity: 8 },
            { locationId: 'store_B', quantity: 4 },
          ],
          reservationPolicy: 'soft_hold',
          reservationTtlSeconds: 900,
          dataTtlSeconds: 60,
        },
      },
    ],
  },

  // -------------------------------------------------------------------------
  // WP-04 / RAOS-0002 additions — cover every new reason code across archetypes
  // -------------------------------------------------------------------------

  // --- Sara's Boutique additions ---

  {
    // TEASER_LOCKED: guest sees a member price teaser but cannot add.
    // Members with 'gold' tier unlock the $28 price.
    id: 'p_b_005',
    merchantId: 'm_boutique_001',
    title: 'Exclusive Member Tote',
    description: 'Limited edition canvas tote — member price locked for gold members.',
    category: 'Accessories',
    variants: [
      {
        id: 'v_b_005_1',
        sku: 'TOTE-EXCL-NATURAL',
        title: 'Natural Canvas',
        basePrice: 42.00,
        currency: 'USD',
        memberPricing: {
          available: true,
          memberPrice: 28.00,
          teaserPrice: 28.00,
          requiredTier: 'gold',
        },
      }
    ]
  },
  {
    // PURCHASE_LIMIT_EXCEEDED: member pricing with purchaseLimit: 2 ("limit 2 drop item").
    id: 'p_b_006',
    merchantId: 'm_boutique_001',
    title: 'Limited Drop Sneakers',
    description: 'Limited release — each member may purchase at most 2 pairs.',
    category: 'Apparel',
    variants: [
      {
        id: 'v_b_006_1',
        sku: 'SNKR-DROP-LTD-WHT',
        title: 'White / Size 10',
        basePrice: 180.00,
        currency: 'USD',
        memberPricing: {
          available: true,
          memberPrice: 150.00,
          requiredTier: 'gold',
          purchaseLimit: 2,
        },
      }
    ]
  },
  {
    // basePrice: 0 — free sample (valid zero price, NOT callForPrice)
    id: 'p_b_007',
    merchantId: 'm_boutique_001',
    title: 'Welcome Sample Card',
    description: 'Free postcard-size sample print included with orders. Add for $0.',
    category: 'Accessories',
    variants: [
      {
        id: 'v_b_007_1',
        sku: 'SAMPLE-CARD-FREE',
        title: 'Standard',
        basePrice: 0,
        currency: 'USD',
      }
    ]
  },
  {
    // CALL_FOR_PRICE: bespoke commissioned piece — price must be requested.
    id: 'p_b_008',
    merchantId: 'm_boutique_001',
    title: 'Bespoke Commission Print',
    description: 'Custom-sized limited art print — price determined per commission. Submit a quote request.',
    category: 'Art',
    variants: [
      {
        id: 'v_b_008_1',
        sku: 'PRINT-BESPOKE-CFP',
        title: 'Custom Size',
        basePrice: 0,
        currency: 'USD',
        callForPrice: true,
      }
    ]
  },

  // --- Atlas Wholesale additions ---

  {
    // BELOW_MOQ + QUANTITY_INCREMENT_MISMATCH: tea sachet boxes with strict MOQ.
    // Also exercises PURCHASE_LIMIT_EXCEEDED on bulk.
    id: 'p_w_004',
    merchantId: 'm_wholesale_002',
    title: 'Premium Tea Sachets (Bulk)',
    description: 'Individually sealed premium tea sachets. MOQ 20, increments of 10.',
    category: 'Beverage',
    variants: [
      {
        id: 'v_w_004_1',
        sku: 'TEA-SACHETS-BULK',
        title: '100-count Case',
        basePrice: 120.00,
        currency: 'USD',
        eligibilityRules: {
          hideFromGuests: true,
          requireWholesale: true,
        },
        bulkPricing: {
          available: true,
          moq: 20,
          quantityIncrement: 10,
          purchaseLimit: 500,
          tiers: [
            // tier boundary exactly at MOQ
            { minQuantity: 20, maxQuantity: 49, price: 110.00 },
            { minQuantity: 50, maxQuantity: 199, price: 95.00 },
            { minQuantity: 200, price: 80.00 },
          ],
        },
      }
    ]
  },
  {
    // Member price HIGHER than bulk tier — exercises the conflict / last-wins behavior.
    // At qty >= 30, bulk wins ($4.80) even though member price is $5.50 > base $6.00
    // but < bulk of $4.80. Wait — this should set up a case where member price ($5.50)
    // is HIGHER than bulk tier ($4.80), demonstrating bulk wins via last-wins.
    id: 'p_w_005',
    merchantId: 'm_wholesale_002',
    title: 'Wholesale Paper Cups (Case)',
    description: 'Standard 8oz paper cups in wholesale cases. Illustrates member-vs-bulk precedence.',
    category: 'Equipment',
    variants: [
      {
        id: 'v_w_005_1',
        sku: 'CUP-PAPER-8OZ-CASE',
        title: 'Case of 500',
        basePrice: 65.00,
        currency: 'USD',
        eligibilityRules: {
          hideFromGuests: true,
          requireWholesale: true,
        },
        // Member price $58 — lower than base but higher than bulk tier at 30+
        memberPricing: {
          available: true,
          memberPrice: 58.00,
          requiredTier: 'gold',
        },
        bulkPricing: {
          available: true,
          moq: 10,
          quantityIncrement: 5,
          tiers: [
            { minQuantity: 10, maxQuantity: 29, price: 60.00 }, // bulk is $60 > member $58, member wins via last-wins? NO: bulk runs after member so bulk ($60) would suppress member ($58), leaving $60. This documents today's last-wins bug: bulk tier at 10-29 ($60) > member ($58) but bulk still wins because it runs second.
            { minQuantity: 30, price: 48.00 }, // bulk $48 < member $58, correct outcome
          ],
        },
      }
    ]
  },

  // --- Fresh Corner Grocery additions ---

  {
    // Grocery member price: member-discount on organic milk for loyalty members.
    // Also exercises rounding: member price $3.995 → rounds to $4.00 (half-up).
    id: 'p_g_004',
    merchantId: 'm_grocery_003',
    title: 'Organic Whole Milk (Half Gallon)',
    description: 'Fresh organic whole milk. Member save price applies to loyalty members.',
    category: 'Dairy',
    variants: [
      {
        id: 'v_g_004_1',
        sku: 'MILK-ORG-HG',
        title: 'Half Gallon',
        basePrice: 4.99,
        currency: 'USD',
        memberPricing: {
          available: true,
          // Intentionally set to a half-cent rounding boundary: $3.995 → $4.00
          memberPrice: 3.995,
          teaserPrice: 3.99,
          requiredTier: 'gold',
        },
        // RAOS-0007: Grocery consumer-friendly policy — grace window + partial honor.
        quoteConfig: {
          ttlSeconds: 300,
          honorPolicy: {
            onExpiry: 'honor_grace',
            graceSeconds: 120,
            onStockLoss: 'partial',
            onContextChange: 'requote',
          },
        },
        inventory: {
          state: 'in_stock',
          quantityAvailable: 24,
          reservationPolicy: 'soft_hold',
          reservationTtlSeconds: 900,
        },
      }
    ]
  },
  {
    // Weekly ad + member price: cereal with both promo sale AND member pricing.
    // Demonstrates promo wins over member (last-wins), producing suppressed offer.
    id: 'p_g_005',
    merchantId: 'm_grocery_003',
    title: 'Granola (Member + Weekly Ad)',
    description: 'Premium granola — member price $4.49, but weekly ad is $3.99 (promo wins).',
    category: 'Pantry',
    variants: [
      {
        id: 'v_g_005_1',
        sku: 'GRANOLA-PREM-16OZ',
        title: '16oz Bag',
        basePrice: 5.49,
        currency: 'USD',
        memberPricing: {
          available: true,
          memberPrice: 4.49,
          teaserPrice: 4.49,
          requiredTier: 'gold',
        },
        promoPricing: {
          available: true,
          salePrice: 3.99,
          description: 'Weekly Ad: Granola Sale',
        },
      }
    ]
  },
];
