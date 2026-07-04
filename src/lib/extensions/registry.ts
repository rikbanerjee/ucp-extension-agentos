/**
 * WP-01: Extension Registry
 *
 * A single, module-scoped registry mapping namespace → UcpExtension.
 * Extensions self-register at boot. The pipeline derives its ordered stages
 * from byStage() — never from hand-written call lists.
 *
 * Ordering guarantee: within a stage, evaluators are sorted ascending by
 * `priority` number. Ties are broken by namespace (lexicographic ascending)
 * so the order is always deterministic regardless of registration order.
 */

import type { UcpExtension, PipelineStage } from './contract';
import type { UcpManifest } from '@/lib/types/core';

// ---------------------------------------------------------------------------
// Registry state (module-scoped, intentionally mutable only via register())
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _registry = new Map<string, UcpExtension<any, any>>();

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register an extension evaluator.
 *
 * Registering the same namespace twice replaces the prior entry (last-write
 * wins) — this allows test code to inject fakes without needing a teardown
 * mechanism. Production code registers each namespace exactly once at module
 * load time.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function register(ext: UcpExtension<any, any>): void {
  _registry.set(ext.namespace, ext);
}

/**
 * Return all registered evaluators for every stage, ordered for pipeline
 * execution.
 *
 * Within each stage: sorted ascending by `priority`; ties broken by namespace
 * (lexicographic ascending) for determinism.
 *
 * Returns a Map keyed by PipelineStage so the pipeline can iterate stages in
 * the fixed STAGE_ORDER and fetch the evaluator list for each.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function byStage(): Map<PipelineStage, UcpExtension<any, any>[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageMap = new Map<PipelineStage, UcpExtension<any, any>[]>();

  for (const ext of _registry.values()) {
    const list = stageMap.get(ext.stage) ?? [];
    list.push(ext);
    stageMap.set(ext.stage, list);
  }

  // Sort each stage's list by priority ASC, then namespace ASC for tie-breaking.
  for (const [stage, list] of stageMap) {
    stageMap.set(
      stage,
      list.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.namespace < b.namespace ? -1 : a.namespace > b.namespace ? 1 : 0;
      }),
    );
  }

  return stageMap;
}

/**
 * Return the subset of registered evaluators whose namespaces are listed in
 * the merchant's `manifest.capabilities[]`.
 *
 * This is the negotiation enforcement mechanism: a capability must appear in
 * the merchant's authoritative capabilities list to be evaluated. Evaluators
 * not present in the manifest are silently excluded — the pipeline treats them
 * as if they were never registered.
 *
 * Matching is on the `namespace` field of each capability entry (not the `id`).
 */
export function manifestSubset(
  manifest: UcpManifest,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): UcpExtension<any, any>[] {
  const allowedNamespaces = new Set(manifest.capabilities.map(c => c.namespace));
  const result: UcpExtension<unknown, unknown>[] = [];

  for (const ext of _registry.values()) {
    if (allowedNamespaces.has(ext.namespace)) {
      result.push(ext);
    }
  }

  return result;
}

/**
 * Clear all registered extensions. Provided for test isolation — do not call
 * in production paths.
 *
 * @internal
 */
export function _clearRegistry(): void {
  _registry.clear();
}

/**
 * Return a snapshot of all registered namespaces. Useful for test assertions.
 *
 * @internal
 */
export function _registeredNamespaces(): string[] {
  return Array.from(_registry.keys());
}
