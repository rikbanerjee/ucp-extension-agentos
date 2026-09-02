// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ShowcaseHero } from './ShowcaseHero';

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe('ShowcaseHero — optional demo video action', () => {
  it('renders no Watch video action, placeholder, or dead link when nothing is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_WEBMCP_VIDEO_URL', '');
    render(<ShowcaseHero />);

    expect(screen.queryByRole('link', { name: /Watch video/ })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\[VIDEO LINK\]|coming soon/i);
    for (const link of screen.getAllByRole('link')) expect(link.getAttribute('href')).not.toBe('#');
  });

  it('renders no Watch video action for a placeholder or non-https value', () => {
    for (const value of ['[VIDEO LINK]', '#', 'http://example.com/demo']) {
      vi.stubEnv('NEXT_PUBLIC_WEBMCP_VIDEO_URL', value);
      render(<ShowcaseHero />);
      expect(screen.queryByRole('link', { name: /Watch video/ })).not.toBeInTheDocument();
      cleanup();
    }
  });

  it('renders the Watch video action, opening safely, once a real public URL is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_WEBMCP_VIDEO_URL', 'https://youtu.be/retailagentos-webmcp');
    render(<ShowcaseHero />);

    const video = screen.getByRole('link', { name: /Watch video/ });
    expect(video).toHaveAttribute('href', 'https://youtu.be/retailagentos-webmcp');
    expect(video).toHaveAttribute('target', '_blank');
    expect(video).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
