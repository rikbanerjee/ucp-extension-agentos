/**
 * RAOS-0000 §8 — Unified Reason Envelope
 *
 * One `ReasonEntry` shape across every pipeline stage. Evaluators emit these;
 * the pipeline collects them. The old `EligibilityReason.blocking` boolean is
 * deprecated in favor of `severity` per §8.1.
 *
 * STATUS DERIVATION (§8.1):
 *   BLOCK  + no resolvable requirements[] → BLOCKED
 *   BLOCK/CONDITION + resolvable requirements[] → CONDITIONAL
 *   INFO only → ELIGIBLE (advisory, never gates)
 */

import type { Requirement } from './extensions';

/** Severity of a reason entry (RAOS-0000 §8). */
export type ReasonSeverity = 'BLOCK' | 'CONDITION' | 'INFO';

/**
 * The unified reason entry shape (RAOS-0000 §8).
 * All pipeline stages emit this; agents parse one vocabulary.
 */
export interface ReasonEntry {
  /** Stable, namespaced reason code. Additive-only (§7.4). */
  code: string;

  /** Human-readable prose. Localizable; never the contract surface. */
  message: string;

  /**
   * Severity (RAOS-0000 §8.1).
   * - BLOCK:     gates the transaction; requires resolution or most-restrictive default.
   * - CONDITION: resolvable path exists; surface the path, don't dead-end.
   * - INFO:      advisory only; never blocks a transaction.
   */
  severity: ReasonSeverity;

  /**
   * Resolution path. Present when there is a way for the buyer to satisfy the
   * requirement (e.g. upgrade tier, provide resale cert). A BLOCK with
   * requirements[] is still BLOCK severity but derives to CONDITIONAL status.
   */
  requirements?: Requirement[];

  /** Owning namespace — trace attribution (RAOS-0000 §8.2). */
  source: string;

  // ---------------------------------------------------------------------------
  // Deprecated field — kept for ≥1 major per RAOS-0000 §7.4
  // ---------------------------------------------------------------------------

  /**
   * @deprecated Use `severity !== 'INFO'` instead.
   *
   * Derived boolean preserved for backward compatibility: `true` when
   * `severity !== 'INFO'`. Agents reading the new `severity` field should
   * ignore this field.
   *
   * @supersededBy severity
   */
  blocking: boolean;
}

// ---------------------------------------------------------------------------
// Status derivation
// ---------------------------------------------------------------------------

/**
 * Derive the ComputedEligibility `status` from a list of reason entries
 * per RAOS-0000 §8.1:
 *
 *   Any BLOCK with no resolvable requirements[] → BLOCKED
 *   Any BLOCK|CONDITION with a resolvable requirements[] → CONDITIONAL
 *   No blocking reasons (or INFO-only) → ELIGIBLE
 */
export function deriveEligibilityStatus(
  reasons: ReadonlyArray<Pick<ReasonEntry, 'severity' | 'requirements'>>,
): 'ELIGIBLE' | 'CONDITIONAL' | 'BLOCKED' {
  let hasBlockWithNoPath = false;
  let hasConditionalPath = false;

  for (const reason of reasons) {
    if (reason.severity === 'INFO') continue;

    const hasResolution =
      Array.isArray(reason.requirements) && reason.requirements.length > 0;

    if (reason.severity === 'BLOCK' && !hasResolution) {
      hasBlockWithNoPath = true;
    } else if (reason.severity === 'BLOCK' || reason.severity === 'CONDITION') {
      // BLOCK with a resolution path OR CONDITION → CONDITIONAL
      hasConditionalPath = true;
    }
  }

  // BLOCKED takes precedence over CONDITIONAL
  if (hasBlockWithNoPath) return 'BLOCKED';
  if (hasConditionalPath) return 'CONDITIONAL';
  return 'ELIGIBLE';
}

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

/**
 * Build a ReasonEntry from its constituent parts, deriving the deprecated
 * `blocking` field automatically.
 */
export function makeReasonEntry(
  fields: Omit<ReasonEntry, 'blocking'>,
): ReasonEntry {
  return {
    ...fields,
    blocking: fields.severity !== 'INFO',
  };
}

/**
 * Map an old-style EligibilityReason (with only `blocking`) to a ReasonEntry,
 * inferring severity:
 *   blocking: true  → BLOCK
 *   blocking: false → INFO
 *
 * This is a migration bridge; evaluators should emit ReasonEntry directly.
 */
export function legacyReasonToEntry(
  legacyReason: {
    code: string;
    message: string;
    blocking: boolean;
    requirements?: Requirement[];
  },
  source: string,
): ReasonEntry {
  const severity: ReasonSeverity = legacyReason.blocking ? 'BLOCK' : 'INFO';
  return makeReasonEntry({
    code: legacyReason.code,
    message: legacyReason.message,
    severity,
    requirements: legacyReason.requirements,
    source,
  });
}
