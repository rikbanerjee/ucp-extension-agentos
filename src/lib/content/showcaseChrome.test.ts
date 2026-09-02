import { describe, expect, it } from 'vitest';
import {
  SHOWCASE_CANONICAL_PATH,
  SHOWCASE_CANONICAL_URL,
  SHOWCASE_DESCRIPTION,
  SHOWCASE_DOCUMENT_TITLE,
  SHOWCASE_NAV_LABEL,
  SHOWCASE_PAGE_LABEL,
  SHOWCASE_ROUTES,
  SHOWCASE_SOURCE_URL,
  getShowcaseVideoUrl,
  isShowcaseRoute,
} from './showcaseChrome';
import { showcaseMetadata } from './showcaseMetadata';
import { DEVELOPER_LINKS } from './developerLinks';

describe('showcase route identity', () => {
  it('treats both the canonical and compatibility routes as showcase routes', () => {
    expect(SHOWCASE_ROUTES).toEqual(['/webmcp-showcase', '/agent-ready-storefront']);
    for (const route of SHOWCASE_ROUTES) expect(isShowcaseRoute(route)).toBe(true);
    for (const route of ['/', '/developers', '/evidence', '/demo', null, undefined]) {
      expect(isShowcaseRoute(route)).toBe(false);
    }
  });

  it('uses the agreed naming, one word and normally capitalised', () => {
    expect(SHOWCASE_NAV_LABEL).toBe('WebMCP Live Demo');
    expect(SHOWCASE_PAGE_LABEL).toBe('RetailAgentOS WebMCP Agent Storefront');
    expect(SHOWCASE_DOCUMENT_TITLE).toBe('RetailAgentOS WebMCP Agent Storefront | OpenAI WebMCP Challenge');
    for (const value of [SHOWCASE_NAV_LABEL, SHOWCASE_PAGE_LABEL, SHOWCASE_DOCUMENT_TITLE]) {
      expect(value).not.toMatch(/StoreFront/);
    }
  });

  it('renames the developer navigation item to WebMCP Live Demo on the canonical route', () => {
    const link = DEVELOPER_LINKS.find(({ href }) => href === SHOWCASE_CANONICAL_PATH);
    expect(link?.label).toBe(SHOWCASE_NAV_LABEL);
    expect(DEVELOPER_LINKS.map(({ label }) => label)).not.toContain('WebMCP implementation');
  });

  it('points at the real public source repository', () => {
    expect(SHOWCASE_SOURCE_URL).toBe('https://github.com/rikbanerjee/ucp-extension-agentos');
  });
});

describe('canonical metadata', () => {
  it('carries the canonical title, description, and URL, with no invented image', () => {
    expect(showcaseMetadata.title).toEqual({ absolute: SHOWCASE_DOCUMENT_TITLE });
    expect(showcaseMetadata.description).toBe(SHOWCASE_DESCRIPTION);
    expect(showcaseMetadata.alternates?.canonical).toBe(SHOWCASE_CANONICAL_URL);
    expect(SHOWCASE_CANONICAL_URL).toBe('https://www.retailagentos.com/webmcp-showcase');
    // Only the repository's existing, verified social image is referenced.
    expect(showcaseMetadata.twitter && 'images' in showcaseMetadata.twitter ? showcaseMetadata.twitter.images : null)
      .toEqual(['/og-image.png']);
  });
});

describe('optional demo-video URL', () => {
  it('is absent until a real public https URL is configured', () => {
    for (const raw of [undefined, '', '   ', '#', '[VIDEO LINK]', 'coming soon', 'http://example.com/v', 'javascript:alert(1)']) {
      expect(getShowcaseVideoUrl(raw)).toBeNull();
    }
  });

  it('is returned once a real public https URL is configured', () => {
    expect(getShowcaseVideoUrl('https://youtu.be/abc123')).toBe('https://youtu.be/abc123');
    expect(getShowcaseVideoUrl('  https://www.youtube.com/watch?v=abc123  ')).toBe('https://www.youtube.com/watch?v=abc123');
  });
});
