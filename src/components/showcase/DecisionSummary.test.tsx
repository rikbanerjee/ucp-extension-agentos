// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DecisionSummary } from './DecisionSummary';
import type { PlanDecision } from '../../../packages/webmcp/src';
import type { DisplayCart } from './CartRevisionPanel';

const baseDecision: PlanDecision = {
  status: 'ELIGIBLE',
  code: 'ELIGIBLE',
  decisionId: 'decision-1',
  lines: [{ productId: 'v_fresh_cagefree_001', quantity: 1 }],
  reasons: [],
  allowedNextActions: ['prepare_validated_cart'],
  nextAction: 'Prepare a visible cart for shopper review.',
  provenance: { storefrontId: 'fresh-corner', storefrontSessionId: 'session-1', catalogVersion: 'v1', policyVersion: 'v1', inventoryAsOf: '2026-01-01T00:00:00.000Z', evaluatedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2026-01-01T00:01:00.000Z' },
  alternatives: [],
};

const cart: DisplayCart = { reference: 'demo-cart-1', revision: 1, lines: [{ productId: 'v_fresh_cagefree_001', quantity: 1, title: 'Cage-Free Eggs, 12-pack', price: 7.49 }], total: 7.49, currency: 'USD' };

describe('DecisionSummary', () => {
  afterEach(cleanup);

  it('shows the plan decision code/nextAction before any cart exists', () => {
    render(<DecisionSummary decision={baseDecision} quote={null} cart={null} />);
    expect(screen.getByText('ELIGIBLE')).toBeInTheDocument();
    expect(screen.getByText('Prepare a visible cart for shopper review.')).toBeInTheDocument();
  });

  it('shows CART_PREPARED copy instead of stale ELIGIBLE "ready to prepare" copy once a cart exists', () => {
    render(
      <DecisionSummary
        decision={baseDecision}
        quote={null}
        cart={cart}
        cartOutcome={{ code: 'CART_PREPARED', nextAction: 'Cart prepared for visible shopper review. Checkout is intentionally unavailable.' }}
      />,
    );
    expect(screen.getByText('CART_PREPARED')).toBeInTheDocument();
    expect(screen.getByText('Cart prepared for visible shopper review. Checkout is intentionally unavailable.')).toBeInTheDocument();
    expect(screen.queryByText('Prepare a visible cart for shopper review.')).not.toBeInTheDocument();
  });

  it('shows CART_REVISED copy once the cart has been revised', () => {
    render(
      <DecisionSummary
        decision={baseDecision}
        quote={null}
        cart={{ ...cart, revision: 2 }}
        cartOutcome={{ code: 'CART_REVISED', nextAction: 'Review the revised cart. Checkout remains unavailable.' }}
      />,
    );
    expect(screen.getByText('CART_REVISED')).toBeInTheDocument();
    expect(screen.getByText('Review the revised cart. Checkout remains unavailable.')).toBeInTheDocument();
  });

  it('falls back to the plan decision copy when a cart exists but no cartOutcome was supplied yet', () => {
    render(<DecisionSummary decision={baseDecision} quote={null} cart={cart} />);
    expect(screen.getByText('ELIGIBLE')).toBeInTheDocument();
  });
});
