/**
 * Deterministic ID generation for rows whose source lacked a required
 * identifier. Same input (row number + title/sku) always produces the same
 * generated ID within one import — no randomness, no Date.now().
 */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'item';
}

/** Deterministic generated product ID: `gen-<slug>-<rowNumber>`. */
export function generateProductId(seed: string, rowNumber: number): string {
  return `gen-${slugify(seed)}-${rowNumber}`;
}

/** Deterministic generated variant ID: `gen-<slug>-<rowNumber>-v`. */
export function generateVariantId(seed: string, rowNumber: number): string {
  return `gen-${slugify(seed)}-${rowNumber}-v`;
}

/** Deterministic generated SKU when the source has none. */
export function generateSku(seed: string, rowNumber: number): string {
  return `GEN-${slugify(seed).toUpperCase().replace(/-/g, '')}-${rowNumber}`;
}
