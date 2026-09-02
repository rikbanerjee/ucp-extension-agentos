// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from './AppShell';
import {
  SHOWCASE_CANONICAL_PATH,
  SHOWCASE_NAV_LABEL,
  SHOWCASE_ROUTES,
  SHOWCASE_SOURCE_URL,
} from '@/lib/content/showcaseChrome';

/**
 * AppShell is the single place that decides which chrome a route gets, so these tests drive it
 * directly with a controlled pathname rather than re-implementing the decision.
 */
let pathname = '/';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

function renderShell(at: string) {
  pathname = at;
  return render(
    <AppShell>
      <p>page body</p>
    </AppShell>,
  );
}

/** The company navigation is identified by its dropdown triggers, which the focused header lacks. */
const COMPANY_NAV_TRIGGERS = ['Product', 'Solutions', 'Developers', 'Evidence', 'About'];

afterEach(() => {
  cleanup();
  pathname = '/';
});

describe('route-specific chrome', () => {
  it.each(SHOWCASE_ROUTES)('%s renders the focused challenge header and compact footer', (route) => {
    renderShell(route);

    expect(screen.getByRole('navigation', { name: 'WebMCP demo' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'WebMCP demo footer' })).toBeInTheDocument();
    expect(
      screen.getByText('RetailAgentOS is the merchant reasoning layer. WebMCP is the browser action surface.', { exact: false }),
    ).toBeInTheDocument();
  });

  it.each(SHOWCASE_ROUTES)('%s renders no Product/Solutions/About dropdown navigation', (route) => {
    renderShell(route);

    for (const label of COMPANY_NAV_TRIGGERS) {
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
    }
  });

  it.each(SHOWCASE_ROUTES)('%s renders no large multi-column company footer', (route) => {
    renderShell(route);

    // The company footer's column headings and its UCP-dominant strapline are absent.
    expect(screen.queryByRole('heading', { name: 'Company' })).not.toBeInTheDocument();
    expect(screen.queryByText(/UCP is the commerce rail/)).not.toBeInTheDocument();
    expect(screen.queryByText('/.well-known/ucp')).not.toBeInTheDocument();
  });

  it.each(['/', '/developers', '/evidence'])('normal route %s keeps the platform navigation and full footer', (route) => {
    renderShell(route);

    for (const label of COMPANY_NAV_TRIGGERS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('heading', { name: 'Company' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'WebMCP demo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'WebMCP demo footer' })).not.toBeInTheDocument();
  });

  it('never renders both navigation systems, or both footers, on the same route', () => {
    for (const route of [...SHOWCASE_ROUTES, '/', '/developers']) {
      cleanup();
      renderShell(route);
      expect(screen.getAllByRole('banner')).toHaveLength(1);
      expect(screen.getAllByRole('contentinfo')).toHaveLength(1);

      const focusedNav = screen.queryByRole('navigation', { name: 'WebMCP demo' });
      const companyNav = screen.queryByRole('button', { name: 'Product' });
      expect(Boolean(focusedNav)).not.toBe(Boolean(companyNav));
    }
  });
});

describe('focused challenge header — naming and links', () => {
  beforeEach(() => renderShell(SHOWCASE_CANONICAL_PATH));

  it('leads with RetailAgentOS identity and a truthful, non-endorsement challenge badge', () => {
    expect(screen.getByText('OpenAI WebMCP Challenge')).toBeInTheDocument();
    // No claim of endorsement, certification, partnership, or selection.
    expect(screen.queryByText(/endorsed|certified|official partner|selected by OpenAI/i)).not.toBeInTheDocument();
  });

  it('points each focused link at its documented destination', () => {
    const nav = screen.getByRole('navigation', { name: 'WebMCP demo' });
    expect(within(nav).getByRole('link', { name: 'Run Demo' })).toHaveAttribute('href', '#webmcp-mission');
    expect(within(nav).getByRole('link', { name: 'How It Works' })).toHaveAttribute('href', '#why-webmcp');
    expect(within(nav).getByRole('link', { name: 'Developer Evidence' })).toHaveAttribute('href', '#developer-evidence');
    expect(within(nav).getByRole('link', { name: /^Back to RetailAgentOS$/ })).toHaveAttribute('href', '/');
  });

  it('opens the GitHub source link safely in a new tab', () => {
    const nav = screen.getByRole('navigation', { name: 'WebMCP demo' });
    const github = within(nav).getByRole('link', { name: /GitHub/ });
    expect(github).toHaveAttribute('href', SHOWCASE_SOURCE_URL);
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('never writes the product name as "WebMCP StoreFront"', () => {
    expect(document.body.textContent).not.toMatch(/StoreFront/);
  });
});

describe('focused mobile menu accessibility', () => {
  it('has an accessible name, toggles aria-expanded, and closes on Escape and on link selection', async () => {
    const user = userEvent.setup();
    renderShell(SHOWCASE_CANONICAL_PATH);

    const toggle = screen.getByRole('button', { name: 'Open demo menu' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Close demo menu' })).toHaveAttribute('aria-expanded', 'true');
    const menu = screen.getByRole('navigation', { name: 'WebMCP demo (menu)' });
    expect(within(menu).getByRole('link', { name: 'Run Demo' })).toHaveAttribute('href', '#webmcp-mission');
    expect(within(menu).getByRole('link', { name: /^Back to RetailAgentOS$/ })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Open demo menu' })).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: 'Open demo menu' }));
    await user.click(within(screen.getByRole('navigation', { name: 'WebMCP demo (menu)' })).getByRole('link', { name: 'How It Works' }));
    expect(screen.getByRole('button', { name: 'Open demo menu' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('is keyboard operable and gives the two navigation landmarks distinguishable names', async () => {
    const user = userEvent.setup();
    renderShell(SHOWCASE_CANONICAL_PATH);

    // jsdom applies no Tailwind CSS, so both navigation systems are in the DOM here and a raw
    // tab count would be meaningless; what matters is that the control itself is keyboard-driven.
    screen.getByRole('button', { name: 'Open demo menu' }).focus();
    expect(screen.getByRole('button', { name: 'Open demo menu' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Close demo menu' })).toHaveAttribute('aria-expanded', 'true');

    const names = screen.getAllByRole('navigation').map((nav) => nav.getAttribute('aria-label'));
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('global discoverability on normal website routes', () => {
  it('exposes "WebMCP Live Demo" in the global navigation, pointing at the canonical route', async () => {
    const user = userEvent.setup();
    renderShell('/');

    const header = screen.getByRole('banner');
    for (const pill of within(header).getAllByRole('link', { name: SHOWCASE_NAV_LABEL })) {
      expect(pill).toHaveAttribute('href', SHOWCASE_CANONICAL_PATH);
    }

    // …and inside the Developers menu, where "WebMCP implementation" used to live.
    await user.click(screen.getByRole('button', { name: 'Developers' }));
    const menu = screen.getByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: SHOWCASE_NAV_LABEL })).toHaveAttribute('href', SHOWCASE_CANONICAL_PATH);
    expect(screen.queryByText('WebMCP implementation')).not.toBeInTheDocument();
  });

  it('keeps the broader product CTA alongside the challenge link', () => {
    renderShell('/');
    expect(screen.getAllByRole('link', { name: 'See it work' }).length).toBeGreaterThan(0);
  });
});
