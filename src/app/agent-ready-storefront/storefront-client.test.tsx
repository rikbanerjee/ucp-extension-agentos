// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentReadyStorefront from './storefront-client';
import type { WebMcpToolDescriptor, WebMcpToolName } from '../../../packages/webmcp/src';
import { POST as capabilitiesRoute } from '../api/showcase/capabilities/route';
import { POST as searchRoute } from '../api/showcase/products/search/route';
import { POST as evaluateRoute } from '../api/showcase/plans/evaluate/route';
import { POST as alternativesRoute } from '../api/showcase/plans/alternatives/route';
import { POST as repairsRoute } from '../api/showcase/plans/repairs/route';
import { POST as cartsRoute } from '../api/showcase/carts/prepare/route';
import { POST as reviseRoute } from '../api/showcase/carts/revise/route';
import { POST as quotesRoute } from '../api/showcase/quotes/request/route';

/**
 * The browser gateway calls the real same-origin `/api/showcase/*` route handlers over `fetch`.
 * There is no running Next.js server in this test process, so `fetch` is routed directly to the
 * exact same route-handler functions Next.js would invoke — the true request/response contract,
 * not a re-implementation of the commerce logic under test.
 */
const routes: Record<string, (request: Request) => Promise<Response>> = {
  '/api/showcase/capabilities': capabilitiesRoute,
  '/api/showcase/products/search': searchRoute,
  '/api/showcase/plans/evaluate': evaluateRoute,
  '/api/showcase/plans/alternatives': alternativesRoute,
  '/api/showcase/plans/repairs': repairsRoute,
  '/api/showcase/carts/prepare': cartsRoute,
  '/api/showcase/carts/revise': reviseRoute,
  '/api/showcase/quotes/request': quotesRoute,
};

beforeAll(() => {
  vi.stubGlobal('fetch', async (input: string | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const handler = routes[url];
    if (!handler) throw new Error(`No fake route registered for ${url}`);
    return handler(new Request(`http://localhost${url}`, init));
  });
});

/**
 * A fake `document.modelContext` — the same shape a real WebMCP-capable browser exposes. Attaching
 * it before render is what makes the page's registration lifecycle behave as "native": genuine
 * `registerTool` calls happen, and this harness can invoke the registered descriptors directly to
 * simulate a real browser agent, distinct from clicking the page's own guided-mission button.
 */
function installFakeModelContext() {
  const registered = new Map<WebMcpToolName, WebMcpToolDescriptor>();
  const registerTool = vi.fn((tool: WebMcpToolDescriptor, options?: { signal?: AbortSignal }) => {
    registered.set(tool.name, tool);
    options?.signal?.addEventListener('abort', () => registered.delete(tool.name), { once: true });
  });
  const modelContext = { registerTool, getTools: () => [...registered.keys()] };
  (document as Document & { modelContext?: unknown }).modelContext = modelContext;
  return { modelContext, registered, registerTool };
}

function removeFakeModelContext() {
  delete (document as Document & { modelContext?: unknown }).modelContext;
}

async function waitForRegistration() {
  await waitFor(() => expect(screen.getByRole('status').textContent).not.toMatch(/Checking for native WebMCP/));
}

describe('AgentReadyStorefront — fake modelContext integration harness', () => {
  afterEach(() => { cleanup(); removeFakeModelContext(); vi.restoreAllMocks(); });

  it('registers the three base tools natively on mount', async () => {
    const { registered, registerTool } = installFakeModelContext();
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    expect(screen.getByRole('status').textContent).toMatch(/Native WebMCP detected/);
    expect([...registered.keys()]).toEqual(['get_storefront_capabilities', 'search_catalog', 'evaluate_shopping_plan']);
    expect(registerTool).toHaveBeenCalledTimes(3);
  });

  it('a genuine native tool call updates the visible Mission Control timeline and is labeled native, not guided', async () => {
    const { registered } = installFakeModelContext();
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    await act(async () => { await registered.get('get_storefront_capabilities')!.execute({}, { signal: new AbortController().signal }); });
    expect(screen.getAllByText(/Native WebMCP/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Agent read storefront capabilities/)).toBeInTheDocument();
  });

  it('dynamic phase registrations (repair tools) appear in the UI after a stale-inventory evaluation', async () => {
    const { registered } = installFakeModelContext();
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    await act(async () => {
      await registered.get('evaluate_shopping_plan')!.execute(
        { lines: [{ productId: 'v_g_inv_002_1', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 1 }], budget: { amount: 25, currency: 'USD' }, substitutionsAllowed: true },
        { signal: new AbortController().signal },
      );
    });
    await waitFor(() => expect(registered.has('apply_plan_repair')).toBe(true));
    // The 2 raw per-tool registration events for the repair-tool pair are grouped into one
    // business-readable Mission Control row rather than showing two identical lines.
    expect(screen.getAllByText(/WebMCP exposed 2 repair capabilities/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/WebMCP exposed 2 repair capabilities/).length).toBe(1);
  });

  it('groups the 3 base-tool registration events into a single Mission Control row on mount', async () => {
    installFakeModelContext();
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    // 3 raw `registered` events fire for get_storefront_capabilities/search_catalog/evaluate_shopping_plan
    // on mount; Mission Control must show exactly one grouped "WebMCP exposed 3 planning capabilities"
    // row, not three duplicate rows.
    expect(screen.getAllByText(/WebMCP exposed 3 planning capabilities/).length).toBe(1);
  });

  it('shows a completed "Approved by shopper" state, a real WebMCP-unlock step, and CART_PREPARED decision copy after approval', async () => {
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Watch guided WebMCP mission/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Approve$/ })).toBeInTheDocument(), { timeout: 5000 });
    await user.click(screen.getByRole('button', { name: /^Approve$/ }));
    // The approval card must show a completed state, not just vanish.
    await waitFor(() => expect(screen.getAllByText(/Approved by shopper/i).length).toBeGreaterThan(0), { timeout: 5000 });
    // A real telemetry-driven transition — not the click itself — unlocks cart preparation.
    await waitFor(() => expect(screen.getByText(/Cart preparation registered/i)).toBeInTheDocument(), { timeout: 5000 });
    await waitFor(() => expect(screen.getAllByText(/Validated cart prepared/i).length).toBeGreaterThan(0), { timeout: 5000 });
    // The correct actor is attributed for the invocation that produced the cart — the guided replay,
    // never labeled as a native browser-agent call.
    expect(screen.getByText(/Invoked by guided replay/i)).toBeInTheDocument();
    // Decision Summary must show CART_PREPARED copy, not the stale "ready to prepare" ELIGIBLE text.
    expect(screen.getByText('CART_PREPARED')).toBeInTheDocument();
    expect(screen.queryByText(/Prepare a visible cart for shopper review\./i)).not.toBeInTheDocument();
  });

  it('guided mission works with no document.modelContext present', async () => {
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    expect(screen.getByRole('status').textContent).toMatch(/Native WebMCP not detected/);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Watch guided WebMCP mission/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Approve$/ })).toBeInTheDocument(), { timeout: 5000 });
    await user.click(screen.getByRole('button', { name: /^Approve$/ }));
    await waitFor(() => expect(screen.getAllByText(/Validated cart prepared/i).length).toBeGreaterThan(0), { timeout: 5000 });
    expect(screen.getByText(/Checkout is unavailable\./i)).toBeInTheDocument();
  });

  it('guided mission is labeled guided even when document.modelContext is present', async () => {
    installFakeModelContext();
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Watch guided WebMCP mission/i }));
    await waitFor(() => expect(screen.getByText(/Guided replay · Same RetailAgentOS handlers · No external agent/)).toBeInTheDocument());
  });

  it('shopper decline stays safe: no cart is created and the mission returns to a repairable state', async () => {
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Watch guided WebMCP mission/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Decline$/ })).toBeInTheDocument(), { timeout: 5000 });
    await user.click(screen.getByRole('button', { name: /^Decline$/ }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Decline$/ })).not.toBeInTheDocument());
    expect(screen.queryByText(/Validated cart prepared/i)).not.toBeInTheDocument();
  });

  it('checkout is never shown as an available action', async () => {
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    expect(screen.queryByRole('button', { name: /^checkout$/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Checkout/i).length).toBeGreaterThan(0);
  });

  it('the TheCustomHub quote flow is visible and exposes request_quote after evaluation', async () => {
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /TheCustomHub/i }));
    await waitForRegistration();
    await user.click(screen.getByRole('button', { name: /Watch guided WebMCP mission/i }));
    await waitFor(() => expect(screen.getByText(/Quote request prepared for merchant review/i)).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByText(/fixedPrice: null/i)).toBeInTheDocument();
  });

  it('scenario switch aborts the prior registrations and starts a fresh registry', async () => {
    const { registered, registerTool } = installFakeModelContext();
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    expect(registered.has('get_storefront_capabilities')).toBe(true);
    expect(registerTool).toHaveBeenCalledTimes(3);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /TheCustomHub/i }));
    await waitForRegistration();
    // Switching scenarios disposes the Fresh Corner registration (aborting its signal) and mounts a
    // fresh TheCustomHub one; the base tool names are shared, so the abort-then-reregister cycle is
    // observed as a second full registration pass, not a mismatched or duplicated in-between state.
    await waitFor(() => expect(registerTool).toHaveBeenCalledTimes(6));
    expect([...registered.keys()]).toEqual(['get_storefront_capabilities', 'search_catalog', 'evaluate_shopping_plan']);
    expect(screen.getByText(/Custom Robotics Team Shirt/i)).toBeInTheDocument();
  });

  it('unmount aborts every registration', async () => {
    const { registered } = installFakeModelContext();
    const { unmount } = render(<AgentReadyStorefront />);
    await waitForRegistration();
    expect(registered.size).toBeGreaterThan(0);
    unmount();
    expect(registered.size).toBe(0);
  });

  it('the optional cart-revision extension registers only after a Fresh Corner cart exists, a native call revises it to $24.49, and reset tears it down', async () => {
    const { registered } = installFakeModelContext();
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    expect(registered.has('revise_validated_cart')).toBe(false);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Watch guided WebMCP mission/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Approve$/ })).toBeInTheDocument(), { timeout: 5000 });
    // Approval is still pending — the extension must not be registered yet.
    expect(registered.has('revise_validated_cart')).toBe(false);
    await user.click(screen.getByRole('button', { name: /^Approve$/ }));
    await waitFor(() => expect(screen.getAllByText(/Validated cart prepared/i).length).toBeGreaterThan(0), { timeout: 5000 });
    expect(registered.has('prepare_validated_cart')).toBe(false);
    await waitFor(() => expect(registered.has('revise_validated_cart')).toBe(true));
    expect(registered.has('request_quote')).toBe(false);

    const cartBox = document.querySelector('[data-cart-reference]')!;
    const cartReference = cartBox.getAttribute('data-cart-reference')!;
    const cartRevision = Number(cartBox.getAttribute('data-cart-revision'));
    expect(cartRevision).toBe(1);

    await act(async () => {
      await registered.get('revise_validated_cart')!.execute(
        { cartReference, expectedRevision: cartRevision, lines: [{ productId: 'v_fresh_cagefree_001', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 2 }], idempotencyKey: 'native-revision-test-key' },
        { signal: new AbortController().signal },
      );
    });

    await waitFor(() => expect(screen.getByText(/RetailAgentOS approved this revision/i)).toBeInTheDocument());
    expect(screen.getAllByText(/\$24\.49/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Invocation source: native/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^checkout$/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Reset/i }));
    await waitForRegistration();
    expect(registered.has('revise_validated_cart')).toBe(false);
  });

  it('the optional cart-revision extension is never registered for TheCustomHub', async () => {
    const { registered } = installFakeModelContext();
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /TheCustomHub/i }));
    await waitForRegistration();
    await user.click(screen.getByRole('button', { name: /Watch guided WebMCP mission/i }));
    await waitFor(() => expect(screen.getByText(/Quote request prepared for merchant review/i)).toBeInTheDocument(), { timeout: 5000 });
    expect(registered.has('revise_validated_cart')).toBe(false);
    expect(screen.queryByText(/Optional: See RetailAgentOS govern a cart revision/i)).not.toBeInTheDocument();
  });

  it('guided cart revision is reachable by keyboard-accessible controls, labeled guided, and never shows a checkout action', async () => {
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Watch guided WebMCP mission/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Approve$/ })).toBeInTheDocument(), { timeout: 5000 });
    await user.click(screen.getByRole('button', { name: /^Approve$/ }));
    await waitFor(() => expect(screen.getAllByText(/Validated cart prepared/i).length).toBeGreaterThan(0), { timeout: 5000 });
    await waitFor(() => expect(screen.getByRole('button', { name: /Watch guided cart revision/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /Watch guided cart revision/i }));
    await waitFor(() => expect(screen.getAllByText(/Guided replay · Same RetailAgentOS handlers · No external agent/).length).toBeGreaterThan(0), { timeout: 5000 });
    // The default guided-revision request (two loaves, keep the eggs) stays under budget and succeeds;
    // this asserts the withheld path never corrupts the already-visible valid cart on any outcome.
    expect(screen.getAllByText(/Validated cart prepared/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /^checkout$/i })).not.toBeInTheDocument();
  });

  it('repeat reset/run cycles do not duplicate registrations', async () => {
    const { registered, registerTool } = installFakeModelContext();
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Reset/i }));
    await waitForRegistration();
    await user.click(screen.getByRole('button', { name: /Reset/i }));
    await waitForRegistration();
    // Each reset disposes the prior registration (removing it from the fake registry) before
    // registering fresh — so the final registered set is exactly the three base tools, never
    // duplicated, even though the mock has now observed three registration cycles.
    expect([...registered.keys()]).toEqual(['get_storefront_capabilities', 'search_catalog', 'evaluate_shopping_plan']);
    expect(registerTool).toHaveBeenCalledTimes(9);
  });

  it('a failed guided-fallback cart preparation releases the single-flight lock, shows a truthful error, and permits an explicit retry that then succeeds — never automatically', async () => {
    // The first /api/showcase/carts/prepare call simulates a transient failure (e.g. a network
    // error); every subsequent call goes through the real route handler.
    let prepareAttempts = 0;
    vi.stubGlobal('fetch', async (input: string | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/showcase/carts/prepare') {
        prepareAttempts += 1;
        if (prepareAttempts === 1) throw new Error('Simulated transient network failure');
        return cartsRoute(new Request(`http://localhost${url}`, init));
      }
      const handler = routes[url];
      if (!handler) throw new Error(`No fake route registered for ${url}`);
      return handler(new Request(`http://localhost${url}`, init));
    });

    const { registered } = installFakeModelContext();
    render(<AgentReadyStorefront />);
    await waitForRegistration();
    const user = userEvent.setup();

    // Drive REPAIRABLE -> approved apply_plan_repair through real native tool calls (not the
    // "Watch guided WebMCP mission" button, whose own script would invoke prepare_validated_cart
    // itself) — simulating a native browser agent that paused right after approval and never
    // invoked prepare_validated_cart, which is exactly what the recovery banner exists for.
    const freshLinesForTest = [{ productId: 'v_g_inv_002_1', quantity: 1 }, { productId: 'v_g_inv_001_1', quantity: 1 }];
    const evaluated = await act(async () => registered.get('evaluate_shopping_plan')!.execute(
      { lines: freshLinesForTest, budget: { amount: 25, currency: 'USD' }, substitutionsAllowed: true },
      { signal: new AbortController().signal },
    )) as { decisionId: string; alternatives: Array<{ repairId: string }> };
    await waitFor(() => expect(registered.has('apply_plan_repair')).toBe(true));

    let repairPromise!: Promise<unknown>;
    act(() => {
      repairPromise = registered.get('apply_plan_repair')!.execute(
        { decisionId: evaluated.decisionId, repairId: evaluated.alternatives[0].repairId, lines: freshLinesForTest, idempotencyKey: 'native-recovery-test-key' },
        { signal: new AbortController().signal },
      );
    });
    await waitFor(() => expect(screen.getByRole('button', { name: /^Approve$/ })).toBeInTheDocument(), { timeout: 5000 });
    await user.click(screen.getByRole('button', { name: /^Approve$/ }));
    await act(async () => { await repairPromise; });

    // prepare_validated_cart is now registered natively, but nothing has invoked it — the
    // "waiting" then "timeout" recovery banner appears once the ~5s grace window elapses (real
    // time — the component's recovery timer is a plain setTimeout(5000), not mocked here).
    await waitFor(() => expect(screen.getByText(/Cart preparation registered/i)).toBeInTheDocument());
    const fallbackButton = await screen.findByRole('button', { name: /Guided fallback/i }, { timeout: 7000 });
    expect(fallbackButton).toBeEnabled();

    // First explicit click: the stubbed network failure surfaces a truthful error, the button is
    // never auto-retried, and it becomes clickable again (not permanently disabled).
    await user.click(fallbackButton);
    await waitFor(() => expect(screen.getByText(/Cart preparation failed/i)).toBeInTheDocument());
    expect(screen.queryByText(/Validated cart prepared/i)).not.toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: /Retry guided cart preparation/i });
    await waitFor(() => expect(retryButton).toBeEnabled());
    expect(prepareAttempts).toBe(1); // nothing retried on its own

    // Second explicit click: the same canonical descriptor/gateway handler now succeeds.
    await user.click(retryButton);
    await waitFor(() => expect(screen.getAllByText(/Validated cart prepared/i).length).toBeGreaterThan(0));
    expect(prepareAttempts).toBe(2);
    expect(screen.queryByText(/Cart preparation failed/i)).not.toBeInTheDocument();
  }, 15000);
});
