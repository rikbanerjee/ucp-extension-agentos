/**
 * Pure display formatting for a single cart line — never a pricing/eligibility decision. The unit
 * price always comes straight from the RetailAgentOS-authoritative response (`price`/`unitPrice`);
 * the only arithmetic performed here is `unit price × quantity`, purely for rendering a line total
 * the shopper can visually verify — it is never used to decide eligibility, inventory, or checkout,
 * and it prefers an already-computed `lineTotal` (e.g. from `revise_validated_cart`) whenever the
 * gateway response already carries one.
 */
export interface CartLineForDisplay { quantity: number; price?: number; unitPrice?: number; lineTotal?: number; }
export interface CartLineDisplay { unitPriceLabel: string; totalLabel: string; /** True once quantity > 1 — the unit price alone would otherwise read as ambiguous. */ showLineTotal: boolean; }

export function formatCartLineDisplay(line: CartLineForDisplay): CartLineDisplay {
  const unitPrice = line.unitPrice ?? line.price ?? 0;
  const lineTotal = line.lineTotal ?? Number((unitPrice * line.quantity).toFixed(2));
  return { unitPriceLabel: `$${unitPrice.toFixed(2)}`, totalLabel: `$${lineTotal.toFixed(2)}`, showLineTotal: line.quantity > 1 };
}
