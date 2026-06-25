/**
 * Recipe 0005 — Inventory & Availability
 *
 * Demonstrates RAOS-0005 inventory evaluation: stock state variants and
 * staleness detection. Shows reason codes: OUT_OF_STOCK, LOW_STOCK,
 * BACKORDER_AVAILABLE, STOCK_STALE.
 *
 * `now` control (offset from REFERENCE_NOW) triggers staleness when the
 * dataFetchedAt + dataTtlSeconds window is exceeded.
 *
 * Real lib call: evaluateOffer (inventory evaluator in ELIGIBILITY stage at priority 20)
 */

import { evaluateOffer } from '@retailagentos/engine';
import type { PartialBuyerContext } from '@retailagentos/engine';
import type { Recipe, RecipeResult } from './index';
import {
  MERCHANT_A,
  VARIANT_OPEN,
  VARIANT_OUT_OF_STOCK,
  VARIANT_LOW_STOCK,
  VARIANT_BACKORDER,
  VARIANT_STALE,
  REFERENCE_NOW,
} from '../fixtures';
import type { ComputedAvailability } from '@/lib/types/inventory';

const shownSource = `// RAOS-0005: Inventory & Availability
import '@/lib/extensions';
import { evaluateOffer } from '@/lib/extensions';

// Variant declares its inventory config:
const variant: Variant = {
  id: 'v_oos_001',
  basePrice: 34.99,
  inventory: {
    state: 'out_of_stock',    // 'in_stock' | 'low_stock' | 'out_of_stock'
                              // | 'backorder' | 'preorder'
    reservationPolicy: 'none',
    dataFetchedAt: Date.now() - 30_000, // age of data (30s ago)
    dataTtlSeconds: 60,                 // stale after 60s
  },
};

// The inventory evaluator runs in the ELIGIBILITY stage (priority 20),
// after the RAOS-0001 eligibility evaluator (priority 10).
const record = evaluateOffer({
  merchant, // must declare 'com.os.retailagent.shopping.inventory' in manifest
  variant,
  quantity: 1,
  context,
  now, // inject — evaluator computes (now - dataFetchedAt) for staleness
});

// Inventory output is on the ELIGIBILITY stage:
const invResult = record.stages['ELIGIBILITY']?.[
  'com.os.retailagent.shopping.inventory'
];
const availability = invResult?.output as ComputedAvailability;
// availability.state → 'out_of_stock', 'low_stock', 'backorder', etc.
// availability.onlyXLeft → integer when quantity is limited
// availability.freshness → { computedAt, ttlSeconds }

// Inventory reason codes emitted:
// OUT_OF_STOCK (BLOCK), LOW_STOCK (INFO), BACKORDER_AVAILABLE (CONDITION),
// STOCK_STALE (CONDITION), RESERVATION_EXPIRED (BLOCK)
`;

export const recipe: Recipe = {
  id: '0005-inventory',
  specRef: 'RAOS-0005',
  title: 'Inventory & Availability',
  specPageHref: '/specs/0005-inventory',
  whatThisProves:
    'The inventory evaluator maps stock state to reason codes with appropriate severities: OUT_OF_STOCK blocks the transaction, LOW_STOCK is advisory, BACKORDER_AVAILABLE has a resolution path, and STOCK_STALE triggers when data age exceeds dataTtlSeconds. The `now` offset control demonstrates time-based staleness detection.',
  shownSource,

  controls: [
    {
      id: 'inventoryState',
      label: 'Inventory scenario',
      type: 'select',
      options: [
        { value: 'in_stock', label: 'in_stock — no reasons' },
        { value: 'low_stock', label: 'low_stock — LOW_STOCK (INFO)' },
        { value: 'out_of_stock', label: 'out_of_stock — OUT_OF_STOCK (BLOCK)' },
        { value: 'backorder', label: 'backorder — BACKORDER_AVAILABLE (CONDITION)' },
        { value: 'stale', label: 'stale data — STOCK_STALE (CONDITION)' },
      ],
      defaultValue: 'in_stock',
    },
    {
      id: 'nowOffsetSeconds',
      label: 'Time offset from reference (seconds)',
      type: 'number',
      min: 0,
      max: 300,
      step: 10,
      defaultValue: 0,
    },
  ],

  run(controlValues): RecipeResult {
    const inventoryState = controlValues['inventoryState'] as string;
    const nowOffset = Number(controlValues['nowOffsetSeconds'] ?? 0) * 1000;
    const now = REFERENCE_NOW + nowOffset;

    const variantMap: Record<string, typeof VARIANT_OPEN> = {
      in_stock: VARIANT_OPEN,
      low_stock: VARIANT_LOW_STOCK,
      out_of_stock: VARIANT_OUT_OF_STOCK,
      backorder: VARIANT_BACKORDER,
      stale: VARIANT_STALE,
    };
    const variant = variantMap[inventoryState] ?? VARIANT_OPEN;

    const context: PartialBuyerContext = {
      customerType: 'member',
      membershipTier: 'none',
      marketRegion: 'US',
      fulfillmentMode: 'shipping',
      accountLinked: true,
      taxExempt: false,
      resaleCertificateOnFile: false,
      trust: { mode: 'asserted' },
    };

    const record = evaluateOffer({
      merchant: MERCHANT_A,
      variant,
      quantity: 1,
      context,
      now,
      trustEnforcement: 'enforce',
    });

    const invStage = record.stages['ELIGIBILITY'];
    const invResult = invStage?.['com.os.retailagent.shopping.inventory'];
    const availability = invResult?.output as ComputedAvailability | null;

    const invReasons = record.reasons
      .filter(r => r.source === 'com.os.retailagent.shopping.inventory')
      .map(r => `${r.code}(${r.severity})`);

    const ageSeconds = availability?.freshness
      ? Math.floor((now - availability.freshness.computedAt) / 1000)
      : null;

    return {
      decisionRecord: record,
      summary:
        `Availability state: ${availability?.state ?? 'N/A'}. ` +
        (availability?.onlyXLeft != null ? `Only ${availability.onlyXLeft} left. ` : '') +
        `Inventory reasons: [${invReasons.join(', ') || 'none'}]. ` +
        (ageSeconds != null ? `Data age: ${ageSeconds}s (TTL: ${variant.inventory?.dataTtlSeconds ?? 60}s).` : ''),
    };
  },
};
