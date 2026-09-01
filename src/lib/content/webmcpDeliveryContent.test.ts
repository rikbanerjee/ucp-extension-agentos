import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GET } from '@/app/agents.md/route';
import { SCORECARD_SECTIONS } from '@/app/evidence/scorecard-data';
import { buildLog } from './buildlog';
import { VERIFICATION_SNAPSHOT } from './verificationSnapshot';

describe('WebMCP delivery documentation', () => {
  it('makes the shipped browser surface and unshipped remote transport explicit to agents', async () => {
    const agentsMd = await GET().text();
    const retiredTransportPhrase = ['no', 'live', 'MCP', 'transport'].join(' ');

    expect(agentsMd).toContain('document.modelContext');
    expect(agentsMd).toContain('/webmcp-showcase');
    expect(agentsMd).toMatch(/native browser WebMCP/i);
    expect(agentsMd).toContain('remote MCP server');
    expect(agentsMd).toContain('Aug 30–31 2026');
    expect(agentsMd).toContain('92753e5');
    expect(agentsMd).toContain('d094e12');
    expect(agentsMd).toContain('e464bb8');
    expect(agentsMd).not.toContain(retiredTransportPhrase);
  });

  it('puts the latest (submission-hardening) entry first and exposes each evidence link', () => {
    const latest = buildLog[0];

    expect(latest).toMatchObject({
      id: 'webmcp-submission-hardening-2026',
      current: true,
      date: 'Sep 1, 2026',
    });
    expect(latest.evidence?.map(({ label }) => label)).toEqual(['92753e5', 'd094e12', 'e464bb8', 'd9a5eb5', '0228160']);
    expect(buildLog.find((entry) => entry.id === 'week-7')?.current).toBe(false);
    // The original challenge-window entry stays in the log, just no longer marked current.
    expect(buildLog.find((entry) => entry.id === 'webmcp-challenge-2026')).toMatchObject({ current: false, date: 'Aug 30–31, 2026' });
  });

  it('keeps browser WebMCP and a generalized remote MCP server as separate evidence rows', () => {
    const transport = SCORECARD_SECTIONS.find((section) => section.id === 'trust');
    const browserLayer = transport?.rows.find((row) => row.id === 'g1');
    const remoteServer = transport?.rows.find((row) => row.id === 'g2');

    expect(browserLayer).toMatchObject({ status: 'built', requirement: 'Native WebMCP browser delivery layer' });
    expect(remoteServer).toMatchObject({ status: 'designed', requirement: 'Generalized remote MCP server' });
    expect(remoteServer?.note).toContain('no hosted remote server');
  });

  it('does not reintroduce ambiguous public transport copy', () => {
    const retiredTransportPhrase = ['no', 'live', 'MCP', 'transport'].join(' ');
    const retiredServerClaim = ['"Live', 'MCP', 'server"'].join(' ');
    const publicFiles = [
      'src/app/agents.md/route.ts',
      'src/app/developers/page.tsx',
      'src/app/evidence/scorecard-data.ts',
      'src/lib/content/verificationSnapshot.ts',
      'src/app/buildlog/page.tsx',
    ];
    const publicCopy = publicFiles
      .map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'))
      .join('\n');

    expect(publicCopy).not.toMatch(new RegExp(retiredTransportPhrase, 'i'));
    expect(publicCopy).not.toContain(retiredServerClaim);
    expect(VERIFICATION_SNAPSHOT.knownLimitations[0]).toContain('generalized remote MCP server');
  });
});
