import { describe, expect, it } from 'vitest';
import { formatCartLineDisplay } from './cartLineDisplay';

describe('formatCartLineDisplay', () => {
  it('shows only the unit price for a quantity-1 line (no redundant line total)', () => {
    const display = formatCartLineDisplay({ quantity: 1, price: 8.5 });
    expect(display).toEqual({ unitPriceLabel: '$8.50', totalLabel: '$8.50', showLineTotal: false });
  });

  it('shows unit price and a computed line total once quantity > 1', () => {
    const display = formatCartLineDisplay({ quantity: 2, unitPrice: 8.5 });
    expect(display).toEqual({ unitPriceLabel: '$8.50', totalLabel: '$17.00', showLineTotal: true });
  });

  it('prefers an already-computed lineTotal from the gateway over recomputing it', () => {
    const display = formatCartLineDisplay({ quantity: 2, unitPrice: 8.5, lineTotal: 16.98 });
    expect(display.totalLabel).toBe('$16.98');
    expect(display.showLineTotal).toBe(true);
  });

  it('falls back to price when unitPrice is absent', () => {
    const display = formatCartLineDisplay({ quantity: 3, price: 6.99 });
    expect(display).toEqual({ unitPriceLabel: '$6.99', totalLabel: '$20.97', showLineTotal: true });
  });
});
