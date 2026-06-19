/**
 * WP-01: Registry tests
 *
 * 1. Ordering determinism: byStage() produces a stable order by priority ASC,
 *    namespace ASC for ties — regardless of registration order.
 * 2. manifestSubset() correctly filters evaluators by manifest capabilities.
 * 3. An evaluator excluded from the manifest is absent from the subset.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  register,
  byStage,
  manifestSubset,
  _clearRegistry,
  _registeredNamespaces,
} from '../registry';
import type { UcpExtension, ExtensionResult } from '../contract';
import type { UcpManifest } from '@/lib/types/core';
import type { Variant } from '@/lib/types/core';
import type { PricingContext } from '@/lib/types/extensions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal fake evaluator for testing. */
function fakeEvaluator(
  namespace: string,
  stage: 'VISIBILITY' | 'ELIGIBILITY' | 'PRICE' | 'FULFILLMENT' | 'QUOTE',
  priority: number,
): UcpExtension<Record<string, never>, null> {
  return {
    namespace,
    version: '1.0.0',
    stage,
    priority,
    reasonCodes: [],
    readConfig(_variant: Variant) {
      return {};
    },
    evaluate(): ExtensionResult<null> {
      return { namespace, reasons: [], output: null };
    },
  };
}

/** A minimal manifest that allows specific namespaces. */
function fakeManifest(namespaces: string[]): UcpManifest {
  return {
    protocol: '1.0',
    tier: 1,
    capabilities: namespaces.map((ns, i) => ({
      id: `ext.${i}`,
      name: `Ext ${i}`,
      namespace: ns,
      version: '1.0.0',
      description: '',
      required: false,
      tier: 1,
    })),
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown: isolate registry state between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  _clearRegistry();
});

afterEach(() => {
  _clearRegistry();
});

// ---------------------------------------------------------------------------
// 1. Ordering determinism
// ---------------------------------------------------------------------------

describe('registry.byStage() — ordering determinism', () => {
  it('evaluators within a stage are sorted by priority ASC', () => {
    register(fakeEvaluator('com.ns.c', 'ELIGIBILITY', 30));
    register(fakeEvaluator('com.ns.a', 'ELIGIBILITY', 10));
    register(fakeEvaluator('com.ns.b', 'ELIGIBILITY', 20));

    const stageMap = byStage();
    const evaluators = stageMap.get('ELIGIBILITY') ?? [];

    expect(evaluators.map(e => e.priority)).toEqual([10, 20, 30]);
  });

  it('ties in priority are broken by namespace ASC (lexicographic)', () => {
    // All have priority=10 — namespace determines order
    register(fakeEvaluator('com.ns.z', 'PRICE', 10));
    register(fakeEvaluator('com.ns.a', 'PRICE', 10));
    register(fakeEvaluator('com.ns.m', 'PRICE', 10));

    const stageMap = byStage();
    const evaluators = stageMap.get('PRICE') ?? [];

    expect(evaluators.map(e => e.namespace)).toEqual(['com.ns.a', 'com.ns.m', 'com.ns.z']);
  });

  it('registration order does not affect evaluation order (different registrations, same result)', () => {
    // Register in reverse priority order
    register(fakeEvaluator('com.ns.promo', 'PRICE', 30));
    register(fakeEvaluator('com.ns.bulk', 'PRICE', 20));
    register(fakeEvaluator('com.ns.member', 'PRICE', 10));

    const first = byStage().get('PRICE')?.map(e => e.namespace) ?? [];

    _clearRegistry();

    // Register in forward priority order
    register(fakeEvaluator('com.ns.member', 'PRICE', 10));
    register(fakeEvaluator('com.ns.bulk', 'PRICE', 20));
    register(fakeEvaluator('com.ns.promo', 'PRICE', 30));

    const second = byStage().get('PRICE')?.map(e => e.namespace) ?? [];

    expect(first).toEqual(second);
  });

  it('evaluators are correctly grouped by stage', () => {
    register(fakeEvaluator('com.ns.visibility', 'VISIBILITY', 10));
    register(fakeEvaluator('com.ns.eligibility', 'ELIGIBILITY', 10));
    register(fakeEvaluator('com.ns.pricing', 'PRICE', 10));

    const stageMap = byStage();

    expect(stageMap.get('VISIBILITY')).toHaveLength(1);
    expect(stageMap.get('ELIGIBILITY')).toHaveLength(1);
    expect(stageMap.get('PRICE')).toHaveLength(1);
    expect(stageMap.get('FULFILLMENT')).toBeUndefined();
    expect(stageMap.get('QUOTE')).toBeUndefined();

    expect(stageMap.get('VISIBILITY')![0].namespace).toBe('com.ns.visibility');
  });

  it('registering the same namespace twice replaces the prior entry', () => {
    register(fakeEvaluator('com.ns.dup', 'ELIGIBILITY', 10));
    register(fakeEvaluator('com.ns.dup', 'ELIGIBILITY', 99)); // same namespace, different priority

    const namespaces = _registeredNamespaces();
    expect(namespaces.filter(n => n === 'com.ns.dup')).toHaveLength(1);

    const evaluators = byStage().get('ELIGIBILITY') ?? [];
    expect(evaluators.find(e => e.namespace === 'com.ns.dup')!.priority).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// 2. manifestSubset() — negotiation enforcement
// ---------------------------------------------------------------------------

describe('registry.manifestSubset() — manifest-capability filtering', () => {
  it('returns only evaluators whose namespace is in the manifest capabilities', () => {
    register(fakeEvaluator('com.ns.a', 'ELIGIBILITY', 10));
    register(fakeEvaluator('com.ns.b', 'ELIGIBILITY', 20));
    register(fakeEvaluator('com.ns.c', 'PRICE', 10));

    const manifest = fakeManifest(['com.ns.a', 'com.ns.c']); // b is excluded

    const subset = manifestSubset(manifest);
    const subsetNamespaces = subset.map(e => e.namespace).sort();

    expect(subsetNamespaces).toEqual(['com.ns.a', 'com.ns.c']);
    expect(subsetNamespaces).not.toContain('com.ns.b');
  });

  it('returns an empty array when no registered evaluators match the manifest', () => {
    register(fakeEvaluator('com.ns.a', 'ELIGIBILITY', 10));

    const manifest = fakeManifest(['com.ns.not_registered']);
    const subset = manifestSubset(manifest);

    expect(subset).toHaveLength(0);
  });

  it('returns all registered evaluators when all namespaces are in the manifest', () => {
    register(fakeEvaluator('com.ns.x', 'VISIBILITY', 10));
    register(fakeEvaluator('com.ns.y', 'ELIGIBILITY', 10));
    register(fakeEvaluator('com.ns.z', 'PRICE', 10));

    const manifest = fakeManifest(['com.ns.x', 'com.ns.y', 'com.ns.z']);
    const subset = manifestSubset(manifest);

    expect(subset).toHaveLength(3);
  });

  it('a capability excluded from the manifest means that evaluator is skipped', () => {
    /**
     * This is the negotiation enforcement mechanism. If a merchant does not
     * list a capability in its manifest, the pipeline will not run that
     * evaluator — even if it is registered globally.
     */
    const EXCLUDED_NS = 'com.ns.excluded';
    register(fakeEvaluator(EXCLUDED_NS, 'PRICE', 10));
    register(fakeEvaluator('com.ns.included', 'PRICE', 20));

    const manifest = fakeManifest(['com.ns.included']); // excluded is not listed
    const subset = manifestSubset(manifest);

    const namespaces = subset.map(e => e.namespace);
    expect(namespaces).toContain('com.ns.included');
    expect(namespaces).not.toContain(EXCLUDED_NS);
  });
});
